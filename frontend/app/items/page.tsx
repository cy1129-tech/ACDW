'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClothingItems, deleteClothingItem } from '@/lib/api';

interface ClothingItem {
  cloth_id: number;
  item_name: string;
  description: string;
  gender: string;
  age_group: string;
  clothing_type: string;
  sub_type: string;
  combined_label: string;
  image_path: string;
  created_at: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // 多选选中的 ID 数组集合
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadItems();
  }, [token, router]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await getClothingItems(token!, {
        type: typeFilter || undefined,
        gender: genderFilter || undefined,
        age_group: ageGroupFilter || undefined,
        search: search || undefined,
      });

      setItems(result.items);
      setCurrentPage(1);
      setSelectedIds([]); // 每次重载或切换过滤器时，清空选择状态
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems();
    }, 500);

    return () => clearTimeout(timer);
  }, [search, typeFilter, genderFilter, ageGroupFilter]);

  // 单个删除
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteClothingItem(token!, id);
      setItems(items.filter((item) => item.cloth_id !== id));
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
    }
  };

  // 一键批量删除选中的项目
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const isConfirmed = confirm(
      `⚠️ WARNING: Are you sure you want to permanently delete these ${selectedIds.length} selected items?`
    );

    if (!isConfirmed) return;

    setLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => deleteClothingItem(token!, id))
      );

      setItems(items.filter((item) => !selectedIds.includes(item.cloth_id)));
      setSelectedIds([]);
      alert('✅ Selected items deleted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to delete some selected items');
    } finally {
      setLoading(false);
    }
  };

  // 跑 🏃‍♂️ 🟢 核心新功能：一键全库清空（Delete All）并触发高级双重确认拦截器
  const handleDeleteAll = async () => {
    if (items.length === 0) return;

    // 第一重警告确认
    const confirm1 = confirm(
      `🚨 CRITICAL WARNING!!!\n\nAre you sure you want to delete ALL ${items.length} items from the system?\nThis action CANNOT be undone!`
    );
    if (!confirm1) return;

    // 第二重终极防错确认
    const confirm2 = confirm(
      `⚠️ FINAL CHECK:\n\nDo you REALLY want to clear the entire database? Click "OK" to wipe all items.`
    );
    if (!confirm2) return;

    setLoading(true);
    try {
      // 并行循环调用删除 API，一口气把数据库里的所有衣服条目清空
      await Promise.all(
        items.map((item) => deleteClothingItem(token!, item.cloth_id))
      );

      setItems([]);
      setSelectedIds([]);
      setCurrentPage(1);
      alert('💥 System Reset: All clothing items have been deleted!');
    } catch (err: any) {
      setError(err.message || 'Failed to delete all items. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 处理单张卡片勾选框的状态切换
  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '/placeholder-cloth.png';
    const cleanPath = path.replace(/\\/g, '/');
    return `http://localhost:5000/${cleanPath}`;
  };

  // Pagination bounds calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Link href="/dashboard" className="text-indigo-600 hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Browse Clothing Items</h1>
          <p className="text-gray-600">View, search, filter, and manage all items</p>
        </div>

        {/* 🟢 右侧顶层动作按钮群组 */}
        <div className="flex gap-3 w-full md:w-auto justify-end">
          {/* 一键批量删除（仅在有勾选时显示） */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-5 rounded-lg transition shadow-md"
            >
              🗑️ Delete Selected ({selectedIds.length})
            </button>
          )}

          {/* 🔴 一键全库清空按钮（列表不为空时一直存在，方便用户随时洗牌） */}
          {items.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-lg transition shadow-md border border-red-700 hover:scale-102"
            >
              💥 Delete All ({items.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Filters & Search</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
          >
            <option value="">All Types</option>
            <option value="Pants">Pants</option>
            <option value="Clothes">Clothes</option>
            <option value="Skirt">Skirt</option>
            <option value="Dress">Dress</option>
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Unisex">Unisex</option>
          </select>

          <select
            value={ageGroupFilter}
            onChange={(e) => setAgeGroupFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
          >
            <option value="">All Ages</option>
            <option value="Adult">Adult</option>
            <option value="Children">Children</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setTypeFilter('');
              setGenderFilter('');
              setAgeGroupFilter('');
            }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600">
            <p className="text-xl">Processing operations...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No items found</p>
            <Link href="/upload" className="text-indigo-600 hover:underline">
              Upload a new item with AI
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentItems.map((item) => {
                const isSelected = selectedIds.includes(item.cloth_id);
                return (
                  <div 
                    key={item.cloth_id} 
                    className={`bg-white rounded-lg shadow-lg overflow-hidden flex flex-col justify-between border-2 transition-all duration-200 relative ${
                      isSelected ? 'border-indigo-600 bg-indigo-50/10 shadow-indigo-100' : 'border-transparent'
                    }`}
                  >
                    
                    {/* 卡片右上角悬浮的多选选择框 */}
                    <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur p-2 rounded-lg shadow border border-gray-100 flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.cloth_id)}
                        className="w-5 h-5 accent-indigo-600 cursor-pointer rounded"
                      />
                    </div>

                    <div className="w-full h-64 bg-gray-100 relative overflow-hidden border-b border-gray-100">
                      <img 
                        src={getImageUrl(item.image_path)} 
                        alt={item.item_name}
                        className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/600x400/e2e8f0/475569?text=No+Image+Available";
                        }}
                      />
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-1">{item.item_name}</h3>

                        <div className="mb-4 grid grid-cols-2 gap-y-2 text-sm text-gray-600 border-b border-gray-100 pb-3">
                          <p><strong>Type:</strong> {item.clothing_type}</p>
                          <p><strong>Sub Type:</strong> {item.sub_type || 'None'}</p>
                          <p><strong>Gender:</strong> {item.gender}</p>
                          <p><strong>Age:</strong> {item.age_group}</p>
                        </div>

                        {item.description && (
                          <p className="text-sm text-gray-500 mb-4 italic line-clamp-2 bg-gray-50 p-2 rounded">
                            "{item.description}"
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 mt-2">
                        <Link
                          href={`/edit-item/${item.cloth_id}`}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-center transition shadow-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(item.cloth_id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="max-w-6xl mx-auto flex justify-center items-center gap-2 mt-12 pb-8">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border bg-white font-semibold text-gray-700 hover:bg-indigo-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`w-10 h-10 rounded-lg border font-bold transition ${
                        currentPage === pageNumber
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-indigo-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border bg-white font-semibold text-gray-700 hover:bg-indigo-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}