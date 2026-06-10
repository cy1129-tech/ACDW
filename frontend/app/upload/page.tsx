'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { uploadAndClassifyImage } from '@/lib/api';
import axios from 'axios';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [itemId, setItemId] = useState<number | null>(null);
  const [clothingType, setClothingType] = useState('Clothes');
  const [subType, setSubType] = useState('Short sleeve');
  const [gender, setGender] = useState('Unisex');
  const [ageGroup, setAgeGroup] = useState('Adult');
  const [isSaved, setIsSaved] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { token } = useAuth();
  const router = useRouter();
  const [isAiLoaded, setIsAiLoaded] = useState(false);

useEffect(() => {
    if (isAiLoaded) {
        setIsAiLoaded(false);
        return;  // AI 刚设置的，跳过覆盖
    }
    if (clothingType === 'Clothes') setSubType('Short sleeve');
    else if (clothingType === 'Pants') setSubType('Long pants');
    else if (clothingType === 'Skirt') setSubType('Short skirt');
    else if (clothingType === 'Dress') setSubType('Dress');
}, [clothingType]);

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files.length > 0) {
    const f = e.target.files[0] as File; // 🟢 显式断言它是 File 对象
    
    // 1. 格式校验
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(f.type)) {
      setError('❌ Invalid file format! Please upload a JPG or PNG image.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // 2. 大小校验 (2MB)
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (f.size > MAX_FILE_SIZE) {
      setError('❌ Image too large! Max 2MB.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // 3. 赋值
    setError('');
    setFile(f);
    
    // 🟢 绕过 instanceof 报错：使用 URL.createObjectURL 时，File 本身就是 Blob 的子类
    // 直接调用即可，不需要 instanceof 校验
    setPreviewUrl(URL.createObjectURL(f));
    
  } else {
    setFile(null);
    setPreviewUrl(null);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setAiResult(null); setItemId(null); setIsSaved(false);
    if (!file) { setError('Please select an image file'); return; }
    if (!token) { setError('You must be logged in'); return; }
    setLoading(true);
    try {
      const result = await uploadAndClassifyImage(token, file, itemName || 'Clothing Item', description);
      setSuccess('✅ AI Analysis Complete! Review the categories below.');
      setAiResult(result.ai_result);
      setItemId(result.item_id);
      setIsAiLoaded(true); 
      setClothingType(result.ai_result.clothing_type || 'Clothes');
      setSubType(result.ai_result.sub_type || 'Short sleeve');
      setGender(result.ai_result.gender || 'Unisex');
      setAgeGroup(result.ai_result.age_group || 'Adult');
      setFile(null); setItemName(''); setDescription('');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!itemId || !token) return;
    setLoading(true); setError('');
    try {
      await axios.put(`http://localhost:5000/api/clothing/${itemId}`, {
        item_name: aiResult.item_name || 'Clothing Item',
        description,
        gender, age_group: ageGroup, clothing_type: clothingType, sub_type: subType
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('🎉 Inventory successfully updated with your corrections!');
      setIsSaved(true);
      setTimeout(() => { router.push('/items'); }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update changes');
    } finally {
      setLoading(false);
    }
  };

  const sidebarStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@700;800;900&display=swap');
    .page-root { font-family: 'Nunito', sans-serif; min-height: 100vh; display: flex; flex-direction: row; overflow-x: hidden; background: #f0f4ff; position: relative; }
    .page-root::before { content: ''; position: fixed; inset: 0; background: radial-gradient(ellipse 70% 50% at 5% 10%, rgba(167,139,250,0.18) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 95% 85%, rgba(251,146,60,0.13) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 60% 0%, rgba(56,189,248,0.13) 0%, transparent 55%), linear-gradient(145deg, #eef2ff 0%, #fdf4ff 40%, #f0fdf4 100%); pointer-events: none; z-index: 0; }
    .sidebar { position: relative; z-index: 10; display: flex; flex-direction: column; justify-content: space-between; padding: 24px 16px; background: white; border-right: 1px solid rgba(139,92,246,0.1); box-shadow: 4px 0 24px rgba(139,92,246,0.06); transition: width 0.3s cubic-bezier(.4,0,.2,1); flex-shrink: 0; }
    .sidebar.open { width: 240px; } .sidebar.closed { width: 72px; }
    .sidebar-logo { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 16px; background: linear-gradient(135deg, #7c3aed, #ec4899, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; white-space: nowrap; }
    .sidebar-logo-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px dashed rgba(139,92,246,0.12); }
    .ham-btn { background: #f5f3ff; border: 1px solid rgba(139,92,246,0.15); border-radius: 10px; padding: 7px; color: #7c3aed; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
    .ham-btn:hover { background: #ede9fe; }
    .nav-link { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 14px; font-size: 13.5px; font-weight: 700; color: #6b7280; text-decoration: none; transition: all 0.2s; white-space: nowrap; overflow: hidden; margin-bottom: 4px; border: 1.5px solid transparent; }
    .nav-link:hover { background: #f5f3ff; color: #7c3aed; border-color: rgba(139,92,246,0.12); }
    .nav-link.active { background: linear-gradient(135deg, #ede9fe, #fce7f3); color: #7c3aed; border-color: rgba(167,139,250,0.3); }
    .nav-icon { font-size: 18px; flex-shrink: 0; }
    .logout-sb { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 14px; font-size: 13.5px; font-weight: 700; color: #f43f5e; cursor: pointer; transition: all 0.2s; white-space: nowrap; background: none; border: 1.5px solid transparent; }
    .logout-sb:hover { background: #fff1f2; border-color: rgba(244,63,94,0.2); }
    .main-area { flex: 1; padding: 32px; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; overflow-y: auto; }
    .page-header { width: 100%; max-width: 720px; background: white; border: 1.5px solid rgba(139,92,246,0.12); border-radius: 24px; padding: 24px 32px; margin-bottom: 24px; box-shadow: 0 4px 24px rgba(139,92,246,0.07); position: relative; overflow: hidden; }
    .page-header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #7c3aed, #ec4899, #f97316); border-radius: 24px 24px 0 0; }
    .page-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 900; color: #1e1b4b; letter-spacing: -0.02em; }
    .page-sub { font-size: 12.5px; color: #9ca3af; font-weight: 600; margin-top: 4px; }
    .form-card { width: 100%; max-width: 720px; background: white; border: 1.5px solid rgba(139,92,246,0.1); border-radius: 24px; padding: 32px; box-shadow: 0 4px 24px rgba(139,92,246,0.07); margin-bottom: 24px; }
    .field-label { display: block; font-size: 11px; font-weight: 800; color: #7c3aed; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
    .form-input { width: 100%; padding: 11px 16px; border: 1.5px solid rgba(139,92,246,0.15); border-radius: 14px; font-size: 13.5px; font-weight: 600; color: #1e1b4b; font-family: 'Nunito', sans-serif; background: #faf5ff; outline: none; transition: all 0.2s; box-sizing: border-box; }
    .form-input:focus { border-color: #7c3aed; background: white; box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
    .form-input::placeholder { color: #c4b5fd; }
    .upload-zone { border: 2px dashed rgba(124,58,237,0.3); border-radius: 18px; padding: 32px; text-align: center; background: #faf5ff; transition: all 0.2s; cursor: pointer; }
    .upload-zone:hover { border-color: #7c3aed; background: #f5f0ff; }
    .submit-btn { width: 100%; background: linear-gradient(135deg, #7c3aed, #a855f7); border: none; color: white; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; padding: 13px; border-radius: 14px; cursor: pointer; transition: all 0.2s; }
    .submit-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.35); }
    .submit-btn:disabled { opacity: 0.45; transform: none; cursor: not-allowed; }
    .alert { padding: 12px 16px; border-radius: 14px; font-size: 13px; font-weight: 700; margin-bottom: 20px; }
    .alert-error { background: #fff1f2; border: 1.5px solid rgba(244,63,94,0.2); color: #f43f5e; }
    .alert-success { background: #f0fdf4; border: 1.5px solid rgba(16,185,129,0.2); color: #059669; }
    .ai-card { width: 100%; max-width: 720px; background: linear-gradient(145deg, #f0fdf4, #dcfce7); border: 1.5px solid rgba(16,185,129,0.25); border-radius: 24px; padding: 32px; box-shadow: 0 4px 24px rgba(16,185,129,0.1); margin-bottom: 24px; }
    .ai-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 900; color: #064e3b; margin-bottom: 4px; }
    .ai-sub { font-size: 12.5px; color: #6b7280; font-weight: 600; margin-bottom: 20px; }
    .ai-select-box { background: white; border: 1.5px solid rgba(16,185,129,0.2); border-radius: 14px; padding: 16px; }
    .ai-select-label { font-size: 10.5px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; display: block; }
    .ai-select { width: 100%; border: none; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; color: #059669; background: transparent; outline: none; cursor: pointer; }
    .confirm-btn { background: linear-gradient(135deg, #10b981, #059669); border: none; color: white; font-family: 'Nunito', sans-serif; font-size: 13.5px; font-weight: 800; padding: 11px 24px; border-radius: 14px; cursor: pointer; transition: all 0.2s; }
    .confirm-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.3); }
    .confirm-btn:disabled { opacity: 0.45; transform: none; cursor: not-allowed; }
    .skip-btn { background: #f3f4f6; border: 1.5px solid rgba(0,0,0,0.07); color: #4b5563; font-family: 'Nunito', sans-serif; font-size: 13.5px; font-weight: 700; padding: 11px 24px; border-radius: 14px; text-decoration: none; transition: all 0.2s; display: inline-block; }
    .skip-btn:hover { background: #e5e7eb; }
  `;

  return (
    <>
      <style>{sidebarStyles}</style>
      <div className="page-root">
        {/* Sidebar */}
        <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div style={{ width: '100%' }}>
            <div className="sidebar-logo-row">
              {isSidebarOpen && <span className="sidebar-logo">ACDW System</span>}
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="ham-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              </button>
            </div>
            <nav>
              <Link href="/dashboard" className="nav-link"><span className="nav-icon">🏠</span>{isSidebarOpen && <span>Dashboard</span>}</Link>
              <Link href="/profile" className="nav-link"><span className="nav-icon">👤</span>{isSidebarOpen && <span>Account Profile</span>}</Link>
              <Link href="/upload" className="nav-link active"><span className="nav-icon">📸</span>{isSidebarOpen && <span>Upload & AI Classify</span>}</Link>
              <Link href="/items" className="nav-link"><span className="nav-icon">📦</span>{isSidebarOpen && <span>Browse Items</span>}</Link>
              <Link href="/distribution-records" className="nav-link"><span className="nav-icon">🚚</span>{isSidebarOpen && <span>Distribution Records</span>}</Link>
            </nav>
          </div>
          <button onClick={() => { router.push('/login'); }} className="logout-sb">
            <span className="nav-icon">🚪</span>{isSidebarOpen && <span>Logout</span>}
          </button>
        </div>

        {/* Main */}
        <div className="main-area">
          <div className="page-header">
            <div className="page-title">Upload & AI Classify</div>
            <div className="page-sub">Upload a clothing image and AI will automatically analyze and categorize it.</div>
          </div>

          <div className="form-card">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* File Upload */}
              <div>
                <label className="field-label">📸 Image File *</label>
                <div className="upload-zone">
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ width: '100%', fontFamily: 'Nunito', fontSize: 13, color: '#7c3aed' }} />
                  {previewUrl && !file && (
                    <img src={previewUrl} alt="preview" style={{ marginTop: 12, maxHeight: 120, borderRadius: 12, objectFit: 'contain' }} />
                  )}
                  {!file && !previewUrl && (
                    <p style={{ color: '#c4b5fd', fontSize: 13, fontWeight: 700, marginTop: 8 }}>Drop your image here</p>
                  )}
                </div>
                {file && <p style={{ color: '#059669', fontSize: 13, fontWeight: 700, marginTop: 8 }}>✓ {file.name} selected</p>}
              </div>

              <div>
                <label className="field-label">Item Name (Optional)</label>
                <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Give it a name or leave blank" className="form-input" />
              </div>

              <div>
                <label className="field-label">Description (Optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add any additional notes" rows={3} className="form-input" style={{ resize: 'vertical' }} />
              </div>

              <button type="submit" disabled={loading || !file} className="submit-btn">
                {loading ? '🔄 Analyzing with AI...' : '🚀 Upload & Classify'}
              </button>
            </form>
          </div>

          {/* AI Results */}
          {aiResult && (
            <div className="ai-card">
              <div className="ai-title">🤖 AI Analysis Results</div>
              <div className="ai-sub">💡 Feel free to adjust the choices if the AI prediction is incorrect.</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="ai-select-box">
                  <span className="ai-select-label">Clothing Type</span>
                  <select value={clothingType} onChange={(e) => setClothingType(e.target.value)} className="ai-select">
                    <option value="Clothes">Clothes</option>
                    <option value="Pants">Pants</option>
                    <option value="Skirt">Skirt</option>
                    <option value="Dress">Dress</option>
                  </select>
                </div>
                <div className="ai-select-box">
                  <span className="ai-select-label">Gender</span>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="ai-select">
                    <option value="Unisex">Unisex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="ai-select-box">
                  <span className="ai-select-label">Age Group</span>
                  <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="ai-select">
                    <option value="Adult">Adult</option>
                    <option value="Children">Children</option>
                  </select>
                </div>
                <div className="ai-select-box">
                  <span className="ai-select-label">Sub Type</span>
                  <select value={subType} onChange={(e) => setSubType(e.target.value)} className="ai-select">
                    {clothingType === 'Clothes' && (<><option value="Short sleeve">Short sleeve</option><option value="Long sleeve">Long sleeve</option></>)}
                    {clothingType === 'Pants' && (<><option value="Long pants">Long pants</option><option value="Short pants">Short pants</option></>)}
                    {clothingType === 'Skirt' && (<><option value="Short skirt">Short skirt</option><option value="Long skirt">Long skirt</option></>)}
                    {clothingType === 'Dress' && <option value="Dress">Dress</option>}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={handleConfirmSave} disabled={loading || isSaved} className="confirm-btn">
                  {isSaved ? '✓ Changes Saved' : '💾 Confirm & Save Changes'}
                </button>
                <Link href="/items" className="skip-btn">Skip & View Inventory →</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}