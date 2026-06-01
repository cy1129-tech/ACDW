// app/edit-item/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getClothingItems, updateClothingItem } from '@/lib/api';

interface ClothingItem {
  cloth_id: number;
  item_name: string;
  description: string;
  gender: string;
  age_group: string;
  clothing_type: string;
  sub_type: string;
}

export default function EditItemPage() {
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState('Unisex');
  const [ageGroup, setAgeGroup] = useState('Adult');
  const [clothingType, setClothingType] = useState('Clothes');
  const [subType, setSubType] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Load item data
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadItem();
  }, [token, id, router]);

  const loadItem = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await getClothingItems(token!);
      const foundItem = result.items.find((i: any) => i.cloth_id === parseInt(id));

      if (!foundItem) {
        setError('Item not found');
        return;
      }

      setItem(foundItem);
      setItemName(foundItem.item_name);
      setDescription(foundItem.description || '');
      setGender(foundItem.gender);
      setAgeGroup(foundItem.age_group);
      setClothingType(foundItem.clothing_type);
      setSubType(foundItem.sub_type || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!itemName || !clothingType) {
      setError('Item name and clothing type are required');
      return;
    }

    setSaving(true);

    try {
      await updateClothingItem(token!, parseInt(id), {
        item_name: itemName,
        description,
        gender,
        age_group: ageGroup,
        clothing_type: clothingType,
        sub_type: subType || undefined,
      });

      setSuccess('Item updated successfully! Redirecting...');

      setTimeout(() => {
        router.push('/items');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <Link href="/items" className="text-indigo-600 hover:underline mb-4 inline-block">
          ← Back to Items
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Edit Item</h1>
        <p className="text-gray-600">Update clothing item information</p>
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
            <label className="block text-gray-700 font-semibold mb-2">
              Item Name *
            </label>
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
            <label className="block text-gray-700 font-semibold mb-2">
              Description
            </label>
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
            <label className="block text-gray-700 font-semibold mb-2">
              Clothing Type *
            </label>
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

          {/* Gender */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Gender
            </label>
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

          {/* Age Group */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Age Group
            </label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="Adult">Adult</option>
              <option value="Girl">Girl</option>
              <option value="Elderly">Elderly</option>
            </select>
          </div>

          {/* Sub Type */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Sub Type (Optional)
            </label>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="">Select sub type</option>
              <option value="Long pants">Long pants</option>
              <option value="Short pants">Short pants</option>
              <option value="Long sleeve">Long sleeve</option>
              <option value="Short sleeve">Short sleeve</option>
              <option value="Long skirt">Long skirt</option>
              <option value="Short skirt">Short skirt</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
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
