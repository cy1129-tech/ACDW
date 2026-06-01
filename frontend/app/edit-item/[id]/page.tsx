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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { token, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    loadItem();
  }, [token, id, router]);

  const loadItem = async () => {
    try {
      setLoading(true); setError('');
      const result = await getClothingItems(token!);
      const foundItem = result.items.find((i: any) => i.cloth_id === parseInt(id));
      if (!foundItem) { setError('Item not found'); return; }
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
    setError(''); setSuccess('');
    if (!itemName || !clothingType) { setError('Item name and clothing type are required'); return; }
    setSaving(true);
    try {
      await updateClothingItem(token!, parseInt(id), { item_name: itemName, description, gender, age_group: ageGroup, clothing_type: clothingType, sub_type: subType || undefined });
      setSuccess('Item updated successfully! Redirecting...');
      setTimeout(() => router.push('/items'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@700;800;900&display=swap');
        .dash-root {
          font-family: 'Nunito', sans-serif; min-height: 100vh; width: 100%;
          display: flex; flex-direction: row; overflow-x: hidden;
          background: #f0f4ff; position: relative;
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
          display: flex; flex-direction: column; align-items: center;
          position: relative; z-index: 1;
        }
        .page-header {
          width: 100%; max-width: 680px;
          background: white; border: 1.5px solid rgba(139,92,246,0.12);
          border-radius: 24px; padding: 22px 28px; margin-bottom: 24px;
          box-shadow: 0 4px 24px rgba(139,92,246,0.07);
          position: relative; overflow: hidden;
        }
        .page-header::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #7c3aed, #ec4899, #f97316, #10b981);
          border-radius: 24px 24px 0 0;
        }
        .page-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 900; color: #1e1b4b; }
        .page-sub { font-size: 12px; color: #9ca3af; font-weight: 600; margin-top: 3px; }
        .form-card {
          width: 100%; max-width: 680px;
          background: white; border: 1.5px solid rgba(139,92,246,0.12);
          border-radius: 24px; padding: 32px;
          box-shadow: 0 4px 24px rgba(139,92,246,0.07);
        }
        .field-label {
          display: block; font-size: 11px; font-weight: 800; color: #9ca3af;
          letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;
        }
        .field-input {
          width: 100%; padding: 11px 16px;
          border: 1.5px solid rgba(139,92,246,0.15); border-radius: 14px;
          font-size: 13.5px; color: #1e1b4b;
          font-family: 'Nunito', sans-serif; font-weight: 700;
          background: #f9f8ff; outline: none; transition: all 0.2s;
          box-sizing: border-box;
        }
        .field-input:focus { border-color: #7c3aed; background: #faf5ff; box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
        .section-label {
          font-size: 11px; font-weight: 800; color: #a78bfa;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px;
        }
        .divider { border: none; border-top: 2px dashed rgba(139,92,246,0.1); margin: 24px 0; }
        .alert-error {
          background: #fff1f2; border: 1.5px solid rgba(244,63,94,0.25);
          color: #be123c; border-radius: 14px; padding: 12px 16px;
          font-size: 13px; font-weight: 700; margin-bottom: 20px;
        }
        .alert-success {
          background: #f0fdf4; border: 1.5px solid rgba(16,185,129,0.25);
          color: #065f46; border-radius: 14px; padding: 12px 16px;
          font-size: 13px; font-weight: 700; margin-bottom: 20px;
        }
        .btn-save {
          flex: 1; background: linear-gradient(135deg, #7c3aed, #a855f7);
          border: none; border-radius: 14px; color: white;
          font-size: 14px; font-weight: 800; padding: 13px;
          cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
        }
        .btn-save:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
        .btn-save:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-cancel {
          flex: 1; background: #f5f3ff; border: 1.5px solid rgba(139,92,246,0.2);
          border-radius: 14px; color: #7c3aed;
          font-size: 14px; font-weight: 800; padding: 13px;
          text-decoration: none; text-align: center; transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
        }
        .btn-cancel:hover { background: #ede9fe; }
        .loading-screen {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          font-family: 'Nunito', sans-serif; background: #f0f4ff;
          font-size: 16px; font-weight: 700; color: #7c3aed;
        }
      `}</style>

      {loading ? (
        <div className="loading-screen">Loading item data...</div>
      ) : (
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
            <div className="page-header">
              <div className="page-title">Edit Item</div>
              <div className="page-sub">Update clothing item classification and details.</div>
            </div>

            <div className="form-card">
              {error && <div className="alert-error">{error}</div>}
              {success && <div className="alert-success">{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className="section-label">Item Details</div>
                <div style={{ marginBottom: 16 }}>
                  <label className="field-label">Item Name *</label>
                  <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Blue Cotton T-shirt" className="field-input" />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label className="field-label">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide additional details about the item" rows={3} className="field-input" style={{ resize: 'vertical' }} />
                </div>

                <hr className="divider" />
                <div className="section-label">Classification</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="field-label">Clothing Type *</label>
                    <select value={clothingType} onChange={(e) => setClothingType(e.target.value)} className="field-input">
                      <option value="Clothes">Clothes</option>
                      <option value="Pants">Pants</option>
                      <option value="Skirt">Skirt</option>
                      <option value="Dress">Dress</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Sub Type</label>
                    <select value={subType} onChange={(e) => setSubType(e.target.value)} className="field-input">
                      <option value="">Select sub type</option>
                      <option value="Long pants">Long pants</option>
                      <option value="Short pants">Short pants</option>
                      <option value="Long sleeve">Long sleeve</option>
                      <option value="Short sleeve">Short sleeve</option>
                      <option value="Long skirt">Long skirt</option>
                      <option value="Short skirt">Short skirt</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="field-input">
                      <option value="Unisex">Unisex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Age Group</label>
                    <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="field-input">
                      <option value="Adult">Adult</option>
                      <option value="Girl">Girl</option>
                      <option value="Elderly">Elderly</option>
                    </select>
                  </div>
                </div>

                <hr className="divider" />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" disabled={saving} className="btn-save">
                    {saving ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <Link href="/items" className="btn-cancel">Cancel</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}