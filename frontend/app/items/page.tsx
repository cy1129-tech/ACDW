'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { getClothingItems, deleteClothingItem, API_URL, getSharedImageUrl } from '@/lib/api';

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

const SIDEBAR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@700;800;900&display=swap');
  .dash-root {
    font-family: 'Nunito', sans-serif;
    min-height: 100vh; width: 100%;
    display: flex; flex-direction: row;
    overflow-x: hidden; background: #f0f4ff; position: relative;
  }
  .dash-root::before {
    content: ''; position: fixed; inset: 0;
    background:
      radial-gradient(ellipse 70% 50% at 5% 10%, rgba(167,139,250,0.2) 0%, transparent 55%),
      radial-gradient(ellipse 55% 45% at 95% 85%, rgba(251,146,60,0.15) 0%, transparent 55%),
      radial-gradient(ellipse 60% 40% at 60% 0%, rgba(56,189,248,0.15) 0%, transparent 55%),
      linear-gradient(145deg, #eef2ff 0%, #fdf4ff 40%, #f0fdf4 100%);
    pointer-events: none; z-index: 0;
  }
  .sidebar {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 24px 16px; background: white;
    border-right: 1px solid rgba(139,92,246,0.1);
    box-shadow: 4px 0 24px rgba(139,92,246,0.06);
    transition: width 0.3s cubic-bezier(.4,0,.2,1); flex-shrink: 0;
  }
  .sidebar.open { width: 240px; } .sidebar.closed { width: 72px; }
  .sidebar-logo {
    font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 16px;
    background: linear-gradient(135deg, #7c3aed, #ec4899, #f97316);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; white-space: nowrap;
  }
  .sidebar-logo-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 32px; padding-bottom: 20px;
    border-bottom: 2px dashed rgba(139,92,246,0.12);
  }
  .hamburger-btn {
    background: #f5f3ff; border: 1px solid rgba(139,92,246,0.15);
    border-radius: 10px; padding: 7px; color: #7c3aed;
    cursor: pointer; transition: all 0.2s; flex-shrink: 0;
  }
  .hamburger-btn:hover { background: #ede9fe; }
  .nav-link {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 13px; border-radius: 14px;
    font-size: 13.5px; font-weight: 700; color: #6b7280;
    text-decoration: none; transition: all 0.2s;
    white-space: nowrap; overflow: hidden; margin-bottom: 4px;
    border: 1.5px solid transparent;
  }
  .nav-link:hover { background: #f5f3ff; color: #7c3aed; border-color: rgba(139,92,246,0.12); }
  .nav-link.active { background: linear-gradient(135deg, #ede9fe, #fce7f3); color: #7c3aed; border-color: rgba(167,139,250,0.3); }
  .nav-icon { font-size: 18px; flex-shrink: 0; }
  .logout-btn {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 13px; border-radius: 14px;
    font-size: 13.5px; font-weight: 700; color: #f43f5e;
    cursor: pointer; transition: all 0.2s; white-space: nowrap;
    background: none; border: 1.5px solid transparent;
  }
  .logout-btn:hover { background: #fff1f2; border-color: rgba(244,63,94,0.2); }
  .main-area {
    flex: 1; padding: 32px; min-width: 0;
    position: relative; z-index: 1; overflow-y: auto;
  }
  .page-header-row {
    display: flex; justify-content: space-between; align-items: center;
    background: white; border: 1.5px solid rgba(139,92,246,0.12);
    border-radius: 24px; padding: 22px 28px;
    margin-bottom: 24px; box-shadow: 0 4px 24px rgba(139,92,246,0.07);
    position: relative; overflow: hidden;
  }
  .page-header-row::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #7c3aed, #ec4899, #f97316, #10b981);
    border-radius: 24px 24px 0 0;
  }
  .page-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 900; color: #1e1b4b; }
  .page-sub { font-size: 12px; color: #9ca3af; font-weight: 600; margin-top: 3px; }
  .action-btn-primary {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    border: none; border-radius: 12px; color: white;
    font-size: 13px; font-weight: 800; padding: 10px 20px;
    cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
  }
  .action-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(124,58,237,0.3); }
  .action-btn-danger {
    background: linear-gradient(135deg, #ea580c, #f97316);
    border: none; border-radius: 12px; color: white;
    font-size: 13px; font-weight: 800; padding: 10px 20px;
    cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
  }
  .action-btn-danger:hover { opacity: 0.9; transform: translateY(-1px); }
  .action-btn-outline {
    background: white; border: 1.5px solid rgba(139,92,246,0.25);
    border-radius: 12px; color: #7c3aed;
    font-size: 13px; font-weight: 800; padding: 10px 20px;
    cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
  }
  .action-btn-outline:hover { background: #f5f3ff; }
  .summary-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 14px; margin-bottom: 24px;
  }
  .summary-card {
    background: white; border: 1.5px solid rgba(139,92,246,0.1);
    border-radius: 16px; padding: 16px 18px;
    box-shadow: 0 2px 12px rgba(139,92,246,0.06); transition: all 0.2s;
  }
  .summary-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139,92,246,0.12); }
  .summary-card-total {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    border: none; color: white;
  }
  .filter-card {
    background: white; border: 1.5px solid rgba(139,92,246,0.1);
    border-radius: 20px; padding: 24px 28px; margin-bottom: 24px;
    box-shadow: 0 2px 12px rgba(139,92,246,0.05);
  }
  .filter-label {
    font-size: 11px; font-weight: 800; color: #a78bfa;
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 14px;
  }
  .filter-input {
    padding: 10px 14px;
    border: 1.5px solid rgba(139,92,246,0.15); border-radius: 12px;
    font-size: 13px; color: #1e1b4b;
    font-family: 'Nunito', sans-serif; font-weight: 700;
    background: #f9f8ff; outline: none; transition: all 0.2s;
  }
  .filter-input:focus { border-color: #7c3aed; background: #faf5ff; }
  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }
  .item-card {
    background: white; border: 2px solid transparent;
    border-radius: 20px; overflow: hidden;
    box-shadow: 0 2px 12px rgba(139,92,246,0.06);
    transition: all 0.2s; position: relative;
    display: flex; flex-direction: column;
  }
  .item-card:hover { transform: translateY(-4px); box-shadow: 0 10px 32px rgba(139,92,246,0.14); }
  .item-card.selected { border-color: #7c3aed; background: #faf5ff; }
  .item-card-img {
    width: 100%; height: 220px; background: #f5f3ff;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; border-bottom: 1.5px solid rgba(139,92,246,0.08);
  }
  .item-card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; }
  .item-name { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 900; color: #1e1b4b; margin-bottom: 12px; }
  .item-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1.5px dashed rgba(139,92,246,0.1); }
  .item-meta-item { font-size: 12px; color: #6b7280; font-weight: 600; }
  .item-meta-item strong { color: #4c1d95; }
  .item-actions { display: flex; gap: 10px; margin-top: auto; }
  .btn-edit {
    flex: 1; background: linear-gradient(135deg, #2563eb, #3b82f6);
    border: none; border-radius: 10px; color: white;
    font-size: 12.5px; font-weight: 800; padding: 9px;
    text-decoration: none; text-align: center; cursor: pointer;
    font-family: 'Nunito', sans-serif; transition: all 0.2s;
  }
  .btn-edit:hover { opacity: 0.9; }
  .btn-delete {
    flex: 1; background: linear-gradient(135deg, #dc2626, #ef4444);
    border: none; border-radius: 10px; color: white;
    font-size: 12.5px; font-weight: 800; padding: 9px;
    cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s;
  }
  .btn-delete:hover { opacity: 0.9; }
  .checkbox-wrap {
    position: absolute; top: 12px; right: 12px; z-index: 10;
    background: white; border: 1.5px solid rgba(139,92,246,0.15);
    border-radius: 10px; padding: 8px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .pagination-row { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 32px; padding-bottom: 32px; }
  .page-btn {
    padding: 8px 16px; border-radius: 10px; border: 1.5px solid rgba(139,92,246,0.15);
    background: white; font-size: 13px; font-weight: 700; color: #7c3aed;
    cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
  }
  .page-btn:hover { background: #f5f3ff; }
  .page-btn.active { background: linear-gradient(135deg, #7c3aed, #a855f7); border-color: transparent; color: white; }
  .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(30,27,75,0.45);
    backdrop-filter: blur(4px); z-index: 50;
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal-card {
    background: white; border-radius: 24px;
    box-shadow: 0 24px 64px rgba(124,58,237,0.2);
    width: 100%; max-width: 480px; padding: 32px;
  }
  .modal-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 900; color: #1e1b4b; margin-bottom: 6px; }
  .modal-sub { font-size: 12px; color: #7c3aed; font-weight: 700; margin-bottom: 24px; }
  .modal-field { margin-bottom: 16px; }
  .modal-label { display: block; font-size: 11px; font-weight: 800; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
  .modal-input {
    width: 100%; padding: 10px 14px;
    border: 1.5px solid rgba(139,92,246,0.15); border-radius: 12px;
    font-size: 13px; color: #1e1b4b; font-family: 'Nunito', sans-serif; font-weight: 700;
    background: #f9f8ff; outline: none; transition: all 0.2s; box-sizing: border-box;
  }
  .modal-input:focus { border-color: #7c3aed; background: #faf5ff; }
  .modal-footer { display: flex; gap: 12px; padding-top: 20px; border-top: 1.5px dashed rgba(139,92,246,0.12); margin-top: 4px; }
  .modal-cancel {
    flex: 1; background: #f5f3ff; border: 1.5px solid rgba(139,92,246,0.15);
    border-radius: 12px; color: #7c3aed; font-size: 13.5px; font-weight: 800;
    padding: 11px; cursor: pointer; font-family: 'Nunito', sans-serif;
  }
  .modal-confirm {
    flex: 1; background: linear-gradient(135deg, #7c3aed, #a855f7);
    border: none; border-radius: 12px; color: white;
    font-size: 13.5px; font-weight: 800; padding: 11px;
    cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s;
  }
  .modal-confirm:hover { opacity: 0.9; transform: translateY(-1px); }
`;

export default function ItemsPage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);
  const [distForm, setDistForm] = useState({ recipient_name: '', pic_name: '', contact: '', email: '', note: '' });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { token, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    loadItems();
  }, [token, router]);

  const loadItems = async () => {
    try {
      setLoading(true); setError('');
      const result = await getClothingItems(token!, {
        type: typeFilter || undefined,
        gender: genderFilter || undefined,
        age_group: ageGroupFilter || undefined,
        search: search || undefined,
      });
      setItems(result.items);
      setCurrentPage(1);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadItems(), 500);
    return () => clearTimeout(timer);
  }, [search, typeFilter, genderFilter, ageGroupFilter]);

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === items.length ? [] : items.map(item => item.cloth_id));
  };

  const handleDistributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distForm.recipient_name.trim()) return;
    try {
      setLoading(true);
      await axios.post(`${API_URL}/clothing/distribute`, { ...distForm, item_ids: selectedIds }, { headers: { Authorization: `Bearer ${token}` } });
      alert('🚚 Material distribution recorded successfully!');
      setIsDistModalOpen(false);
      setSelectedIds([]);
      setDistForm({ recipient_name: '', pic_name: '', contact: '', email: '', note: '' });
      router.push('/distribution-records');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to record distribution');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteClothingItem(token!, id);
      setItems(items.filter((item) => item.cloth_id !== id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } catch (err: any) { setError(err.message || 'Failed to delete item'); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`⚠️ WARNING: Are you sure you want to permanently delete these ${selectedIds.length} selected items?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteClothingItem(token!, id)));
      setItems(items.filter((item) => !selectedIds.includes(item.cloth_id)));
      setSelectedIds([]);
      alert('✅ Selected items deleted successfully!');
    } catch (err: any) { setError(err.message || 'Failed to delete some selected items'); }
    finally { setLoading(false); }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(sid => sid !== id) : [...selectedIds, id]);
  };

  // ✅ 完美的线上/本地多环境自适应图片解析防线之一键调用核心
  const getImageUrl = (path: string) => getSharedImageUrl(path);

  const getDynamicInventorySummary = () => {
    const map: { [key: string]: { gender: string; age_group: string; clothing_type: string; count: number } } = {};
    items.forEach(item => {
      const key = `${item.age_group}-${item.gender}-${item.clothing_type}`;
      if (!map[key]) map[key] = { gender: item.gender, age_group: item.age_group, clothing_type: item.clothing_type, count: 0 };
      map[key].count++;
    });
    return Object.values(map);
  };

  const dynamicSummaries = getDynamicInventorySummary();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const genderBadgeStyle = (gender: string) => {
    if (gender === 'Male') return { color: '#1e40af', background: '#dbeafe' };
    if (gender === 'Female') return { color: '#9d174d', background: '#fce7f3' };
    return { color: '#5b21b6', background: '#ede9fe' };
  };

  return (
    <>
      <style>{SIDEBAR_STYLES}</style>
      <div className="dash-root">
        {/* Sidebar */}
        <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div style={{ width: '100%' }}>
            <div className="sidebar-logo-row">
              {isSidebarOpen && <span className="sidebar-logo">SnapDonate System</span>}
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hamburger-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            </div>
            <nav>
              <Link href="/dashboard" className="nav-link"><span className="nav-icon">🏠</span>{isSidebarOpen && <span>Dashboard</span>}</Link>
              <Link href="/profile" className="nav-link"><span className="nav-icon">👤</span>{isSidebarOpen && <span>Account Profile</span>}</Link>
              <Link href="/upload" className="nav-link"><span className="nav-icon">📸</span>{isSidebarOpen && <span>Upload & AI Classify</span>}</Link>
              <Link href="/items" className="nav-link active"><span className="nav-icon">📦</span>{isSidebarOpen && <span>Browse Items</span>}</Link>
              <Link href="/distribution-records" className="nav-link"><span className="nav-icon">🚚</span>{isSidebarOpen && <span>Distribution Records</span>}</Link>
            </nav>
          </div>
          <button onClick={() => { logout(); router.push('/login'); }} className="logout-btn">
            <span className="nav-icon">🚪</span>
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>

        {/* Main */}
        <div className="main-area">
          {/* Page Header */}
          <div className="page-header-row">
            <div>
              <div className="page-title">Browse Clothing Items</div>
              <div className="page-sub">View, search, filter, and manage all inventory items.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {selectedIds.length > 0 && (
                <button onClick={() => setIsDistModalOpen(true)} className="action-btn-primary">
                  🚚 Distribute ({selectedIds.length})
                </button>
              )}
              {selectedIds.length > 0 && (
                <button onClick={handleBulkDelete} className="action-btn-danger">
                  🗑️ Delete ({selectedIds.length})
                </button>
              )}
              <button onClick={handleSelectAll} className="action-btn-outline">
                {selectedIds.length === items.length ? '🛑 Deselect All' : '✅ Select All'} ({items.length})
              </button>
            </div>
          </div>

          {/* Inventory Summary */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Inventory Summary
            </p>
          </div>
          <div className="summary-grid">
            {dynamicSummaries.map((s, idx) => (
              <div key={idx} className="summary-card">
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, ...genderBadgeStyle(s.gender) }}>
                    {s.gender} {s.age_group}
                  </span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#1e1b4b', fontFamily: 'Outfit' }}>
                  {s.count} <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>{s.clothing_type}</span>
                </div>
              </div>
            ))}
            {dynamicSummaries.length === 0 && (
              <div style={{ background: 'white', borderRadius: 16, border: '2px dashed rgba(139,92,246,0.15)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>No categories active</span>
              </div>
            )}
            <div className="summary-card summary-card-total">
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>TOTAL POOL</div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Outfit' }}>
                {items.length} <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>Items</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filter-card">
            <div className="filter-label">Filter & Search</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-input" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-input">
                <option value="">All Types</option>
                <option value="Pants">Pants</option>
                <option value="Clothes">Clothes</option>
                <option value="Skirt">Skirt</option>
                <option value="Dress">Dress</option>
              </select>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="filter-input">
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unisex">Unisex</option>
              </select>
              <select value={ageGroupFilter} onChange={(e) => setAgeGroupFilter(e.target.value)} className="filter-input">
                <option value="">All Ages</option>
                <option value="Adult">Adult</option>
                <option value="Children">Children</option>
              </select>
              <button onClick={() => { setSearch(''); setTypeFilter(''); setGenderFilter(''); setAgeGroupFilter(''); }} className="action-btn-outline" style={{ fontSize: 12 }}>
                Reset Filters
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fff1f2', border: '1.5px solid rgba(244,63,94,0.25)', color: '#be123c', borderRadius: 14, padding: '12px 16px', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Items Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#7c3aed', fontSize: 16, fontWeight: 700 }}>
              Processing operations...
            </div>
          ) : items.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 20, padding: '48px', textAlign: 'center', border: '1.5px solid rgba(139,92,246,0.1)' }}>
              <p style={{ color: '#9ca3af', fontWeight: 600, marginBottom: 12 }}>No items found</p>
              <Link href="/upload" style={{ color: '#7c3aed', fontWeight: 800, textDecoration: 'none' }}>Upload a new item with AI →</Link>
            </div>
          ) : (
            <>
              <div className="items-grid">
                {currentItems.map((item) => {
                  const isSelected = selectedIds.includes(item.cloth_id);
                  return (
                    <div key={item.cloth_id} className={`item-card ${isSelected ? 'selected' : ''}`}>
                      <div className="checkbox-wrap">
                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(item.cloth_id)} style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }} />
                      </div>
                      <div className="item-card-img">
                        <img
                          src={getImageUrl(item.image_path)}
                          alt={item.item_name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px', transition: 'transform 0.3s' }}
                          onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                          onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/ede9fe/7c3aed?text=No+Image'; }}
                        />
                      </div>
                      <div className="item-card-body">
                        <div className="item-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.item_name}</div>
                        <div className="item-meta-grid">
                          <div className="item-meta-item"><strong>Type:</strong> {item.clothing_type}</div>
                          <div className="item-meta-item"><strong>Sub:</strong> {item.sub_type || 'None'}</div>
                          <div className="item-meta-item"><strong>Gender:</strong> {item.gender}</div>
                          <div className="item-meta-item"><strong>Age:</strong> {item.age_group}</div>
                        </div>
                        {item.description && (
                          <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, fontStyle: 'italic', background: '#f9f8ff', padding: '8px 10px', borderRadius: 10, marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{item.description}"
                          </p>
                        )}
                        <div className="item-actions">
                          <Link href={`/edit-item/${item.cloth_id}`} className="btn-edit">Edit</Link>
                          <button onClick={() => handleDelete(item.cloth_id)} className="btn-delete">Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination-row">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="page-btn">← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="page-btn">Next →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Distribution Modal */}
        {isDistModalOpen && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-title">Create Material Distribution</div>
              <div className="modal-sub">Routing <strong>{selectedIds.length}</strong> items into external charity nodes.</div>

              <form onSubmit={handleDistributeSubmit}>
                <div className="modal-field">
                  <label className="modal-label">Recipient Organisation Name *</label>
                  <input required type="text" value={distForm.recipient_name} onChange={e => setDistForm({ ...distForm, recipient_name: e.target.value })} placeholder="e.g., Rumah Anak Yatim Shifa" className="modal-input" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="modal-field">
                    <label className="modal-label">PIC / Person Name</label>
                    <input type="text" value={distForm.pic_name} onChange={e => setDistForm({ ...distForm, pic_name: e.target.value })} placeholder="e.g., Ahmad Ali" className="modal-input" />
                  </div>
                  <div className="modal-field">
                    <label className="modal-label">Contact No</label>
                    <input type="text" value={distForm.contact} onChange={e => setDistForm({ ...distForm, contact: e.target.value })} placeholder="e.g., 012-3456789" className="modal-input" />
                  </div>
                </div>
                <div className="modal-field">
                  <label className="modal-label">Email Address</label>
                  <input type="email" value={distForm.email} onChange={e => setDistForm({ ...distForm, email: e.target.value })} placeholder="e.g., contact@charity.org" className="modal-input" />
                </div>
                <div className="modal-field">
                  <label className="modal-label">Internal Log Notes</label>
                  <textarea rows={2} value={distForm.note} onChange={e => setDistForm({ ...distForm, note: e.target.value })} placeholder="Write down reasons or logistics dispatch conditions here..." className="modal-input" style={{ resize: 'vertical' }} />
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setIsDistModalOpen(false)} className="modal-cancel">Cancel</button>
                  <button type="submit" className="modal-confirm">Confirm Distribution</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}