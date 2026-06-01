'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { uploadAndClassifyImage } from '@/lib/api';
import axios from 'axios'; // 🟢 引入 axios 用来发编辑更新请求

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);

  // 🟢 核心：新增 5 个允许用户手动订正的状态
  const [itemId, setItemId] = useState<number | null>(null); // 记录刚刚插入数据库的 ID
  const [clothingType, setClothingType] = useState('Clothes');
  const [subType, setSubType] = useState('Short sleeve');
  const [gender, setGender] = useState('Unisex');
  const [ageGroup, setAgeGroup] = useState('Adult');
  const [isSaved, setIsSaved] = useState(false);

  const { token } = useAuth();
  const router = useRouter();

  // 🟢 智能大小类联动：当用户在下拉框手动切换大类时，子类自动切换为安全的默认值
  useEffect(() => {
    if (clothingType === 'Clothes') setSubType('Short sleeve');
    else if (clothingType === 'Pants') setSubType('Long pants');
    else if (clothingType === 'Skirt') setSubType('Short skirt');
    else if (clothingType === 'Dress') setSubType('Dress');
  }, [clothingType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAiResult(null);
    setItemId(null);
    setIsSaved(false);

    if (!file) {
      setError('Please select an image file');
      return;
    }

    if (!token) {
      setError('You must be logged in');
      return;
    }

    setLoading(true);

    try {
      const result = await uploadAndClassifyImage(
        token,
        file,
        itemName || 'Clothing Item',
        description
      );

      setSuccess('✅ AI Analysis Complete! Review the categories below.');
      setAiResult(result.ai_result);
      setItemId(result.item_id); // 🟢 拿到刚刚存进数据库的主键 ID

      // 🟢 把 AI 算出来的初始值，同步塞进我们的可编辑下拉框状态里
      setClothingType(result.ai_result.clothing_type || 'Clothes');
      setSubType(result.ai_result.sub_type || 'Short sleeve');
      setGender(result.ai_result.gender || 'Unisex');
      setAgeGroup(result.ai_result.age_group || 'Adult');

      // 重置上传框
      setFile(null);
      setItemName('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // 🟢 核心功能：当用户修改了下拉框，点击“确认保存更新”时触发
  const handleConfirmSave = async () => {
    if (!itemId || !token) return;
    setLoading(true);
    setError('');
    
    try {
      // 呼叫你们后端的 Function 7 (PUT /api/clothing/:id) 
      // 把用户挑好的最新值，强行覆盖写入 MySQL
      await axios.put(
        `http://localhost:5000/api/clothing/${itemId}`,
        {
          item_name: aiResult.item_name || 'Clothing Item',
          description: description,
          gender: gender,
          age_group: ageGroup,
          clothing_type: clothingType,
          sub_type: subType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('🎉 Inventory successfully updated with your corrections!');
      setIsSaved(true);
      
      // 2秒后自动跳转回列表页
      setTimeout(() => {
        router.push('/items');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update changes');
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
        <h1 className="text-3xl font-bold text-gray-800">Upload & AI Classify</h1>
        <p className="text-gray-600">Upload a clothing image and AI will automatically analyze and categorize it</p>
      </div>

      {/* Main Form */}
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
          {/* File Upload */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">📸 Image File *</label>
            <div className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center">
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full" />
            </div>
            {file && <p className="text-green-600 mt-2 font-semibold">✓ {file.name} selected</p>}
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Item Name (Optional)</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Give it a name or leave blank"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional notes"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '🔄 Analyzing with AI...' : '🚀 Upload & Classify'}
          </button>
        </form>

        {/* AI Results Section — 🟢 华丽华丽变身为人工修正 Dropdown 阵地 */}
        {aiResult && (
          <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
            <h3 className="text-2xl font-bold text-green-800 mb-2">🤖 AI Analysis Results</h3>
            <p className="text-sm text-gray-600 mb-4">💡 Feel free to adjust the choices if the AI prediction is incorrect.</p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Clothing Type Dropdown */}
              <div className="bg-white p-4 rounded-lg shadow">
                <label className="text-gray-500 text-sm block mb-1">Clothing Type</label>
                <select
                  value={clothingType}
                  onChange={(e) => setClothingType(e.target.value)}
                  className="w-full border-b-2 border-gray-200 font-bold text-green-700 focus:outline-none focus:border-green-500 bg-white"
                >
                  <option value="Clothes">Clothes</option>
                  <option value="Pants">Pants</option>
                  <option value="Skirt">Skirt</option>
                  <option value="Dress">Dress</option>
                </select>
              </div>
              
              {/* Gender Dropdown */}
              <div className="bg-white p-4 rounded-lg shadow">
                <label className="text-gray-500 text-sm block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full border-b-2 border-gray-200 font-bold text-green-700 focus:outline-none focus:border-green-500 bg-white"
                >
                  <option value="Unisex">Unisex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              
              {/* Age Group Dropdown */}
              <div className="bg-white p-4 rounded-lg shadow">
                <label className="text-gray-500 text-sm block mb-1">Age Group</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full border-b-2 border-gray-200 font-bold text-green-700 focus:outline-none focus:border-green-500 bg-white"
                >
                  <option value="Adult">Adult</option>
                  <option value="Children">Children</option>
                </select>
              </div>
              
              {/* Sub Type Dropdown — 带条件大小类完美过滤 */}
              <div className="bg-white p-4 rounded-lg shadow">
                <label className="text-gray-500 text-sm block mb-1">Sub Type</label>
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className="w-full border-b-2 border-gray-200 font-bold text-green-700 focus:outline-none focus:border-green-500 bg-white"
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
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4 items-center">
              <button
                onClick={handleConfirmSave}
                disabled={loading || isSaved}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50"
              >
                {isSaved ? '✓ Changes Saved' : '💾 Confirm & Save Changes'}
              </button>
              
              <Link
                href="/items"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-6 rounded-lg transition"
              >
                Skip & View Inventory →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}