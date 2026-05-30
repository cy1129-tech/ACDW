'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addClothingItem } from '@/lib/api';

export default function AddItemPage() {
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState('Unisex');
  const [ageGroup, setAgeGroup] = useState('Adult');
  const [clothingType, setClothingType] = useState('Clothes');
  const [subType, setSubType] = useState('Short sleeve'); // 🟢 默认短袖
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { token } = useAuth();
  const router = useRouter();

  // 🟢 智能联动：当用户切换大类时，子类下拉框的值自动重置为符合规范的默认值
  useEffect(() => {
    if (clothingType === 'Clothes') setSubType('Short sleeve');
    else if (clothingType === 'Pants') setSubType('Long pants');
    else if (clothingType === 'Skirt') setSubType('Short skirt');
    else if (clothingType === 'Dress') setSubType('Dress');
  }, [clothingType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!itemName || !clothingType) {
      setError('Item name and clothing type are required');
      return;
    }

    if (!token) {
      setError('You must be logged in');
      return;
    }

    setLoading(true);

    try {
      await addClothingItem(token, {
        item_name: itemName,
        description,
        gender,
        age_group: ageGroup,
        clothing_type: clothingType,
        sub_type: subType || undefined,
      });

      setSuccess('Item added successfully! Redirecting...');

      // Reset form
      setItemName('');
      setDescription('');
      setGender('Unisex');
      setAgeGroup('Adult');
      setClothingType('Clothes');
      setSubType('Short sleeve');

      setTimeout(() => {
        router.push('/items');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <Link href="/dashboard" className="text-indigo-600 hover:underline mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Add New Item</h1>
        <p className="text-gray-600">Manually add a clothing item without AI analysis</p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Item Name *</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Blue Cotton T-shirt"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details about the item"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>

          {/* Clothing Type */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Clothing Type *</label>
            <select
              value={clothingType}
              onChange={(e) => setClothingType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="Clothes">Clothes</option>
              <option value="Pants">Pants</option>
              <option value="Skirt">Skirt</option>
              <option value="Dress">Dress</option>
            </select>
          </div>

          {/* Sub Type - 🟢 完美的联动选项过滤器 */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Sub Type</label>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              {clothingType === 'Clothes' && (
                <>
                  <option value="Short sleeve">Short sleeve</option>
                  <option value="Long sleeve">Long sleeve</option>
                </>
              )}
              {clothingType === 'Pants' && (
                <>
                  <option value="Long pants">Long pants</option>
                  <option value="Short pants">Short pants</option>
                </>
              )}
              {clothingType === 'Skirt' && (
                <>
                  <option value="Short skirt">Short skirt</option>
                  <option value="Long skirt">Long skirt</option>
                </>
              )}
              {clothingType === 'Dress' && (
                <option value="Dress">Dress</option>
              )}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="Unisex">Unisex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Age Group - 🟢 完美精简版 Age Groups */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Age Group</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="Adult">Adult</option>
              <option value="Children">Children</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Adding Item...' : 'Add Item'}
            </button>
            <Link
              href="/items"
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg text-center transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}