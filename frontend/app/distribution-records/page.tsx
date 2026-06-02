'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { API_URL, getSharedImageUrl } from '@/lib/api';

interface DistRecord {
  id: number;
  recipient_name: string;
  pic_name: string;
  contact: string;
  email: string;
  note: string;
  items_count: number;
  status: string;
  created_at: string;
}

export default function DistributionRecordsPage() {
  const [records, setRecords] = useState<DistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeRecord, setActiveRecord] = useState<DistRecord | null>(null);
  const [activeItems, setActiveItems] = useState<any[]>([]);

  // 🟢 控制编辑模式状态
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ recipient_name: '', pic_name: '', contact: '', email: '', note: '' });

  const { token, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetchRecords();
  }, [token]);

  const fetchRecords = async (preserveActiveId?: number) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/clothing/distributions`, { headers: { Authorization: `Bearer ${token}` } });
      setRecords(res.data);
     
      if (res.data.length > 0) {
        const nextActive = preserveActiveId ? res.data.find((r: any) => r.id === preserveActiveId) : res.data[0];
        if (nextActive) handleOpenDetails(nextActive);
      } else {
        setActiveRecord(null);
      }
    } catch (e) {
      console.error('Failed to load records database');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (record: DistRecord) => {
    setActiveRecord(record);
    setIsEditing(false); // 切换记录时重置编辑模式
    setEditForm({
      recipient_name: record.recipient_name,
      pic_name: record.pic_name || '',
      contact: record.contact || '',
      email: record.email || '',
      note: record.note || ''
    });
    try {
      const res = await axios.get(`${API_URL}/clothing/distributions/${record.id}/items`, { headers: { Authorization: `Bearer ${token}` } });
      setActiveItems(res.data);
    } catch (e) {
      alert('Error parsing details stream');
    }
  };

  // 🟢 触发编辑保存
  const handleSaveEdit = async () => {
    if (!activeRecord) return;
    try {
      await axios.put(`${API_URL}/clothing/distributions/${activeRecord.id}`, editForm, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ Distribution recipient metrics updated successfully!');
      setIsEditing(false);
      fetchRecords(activeRecord.id);
    } catch (e) {
      alert('Failed to save update details');
    }
  };

  // 🟢 触发撤销/退仓处理（响应式异步静默更新，彻底干掉强制刷新闪退）
  const handleCancelDistribution = async () => {
    if (!activeRecord) return;
    if (!confirm('⚠️ UNDO ACTION: Are you sure you want to cancel this distribution? All garments will instantly return to inventory catalog pool.')) return;
    try {
      await axios.post(`${API_URL}/clothing/distributions/${activeRecord.id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('↩️ Distribution cancelled and inventory successfully rolled back!');
      fetchRecords(activeRecord.id); // 👈 完美留在这里静默回刷
    } catch (e) {
      alert('Failed to cancel distribution log');
    }
  };

  // ✅ 完美的线上/本地多环境自适应图片解析防线之一键调用核心
  const getImageUrl = (path: string) => getSharedImageUrl(path);

  const filteredRecords = records.filter(rec => {
    const matchesSearch = rec.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.pic_name && rec.pic_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rec.contact && rec.contact.includes(searchQuery));
    const matchesRecipient = recipientFilter === '' || rec.recipient_name === recipientFilter;
    const matchesStatus = statusFilter === '' || rec.status === statusFilter;
    return matchesSearch && matchesRecipient && matchesStatus;
  });

  const uniqueRecipients = [...new Set(records.map(rec => rec.recipient_name))];

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
        .main-area { flex: 1; padding: 32px; min-width: 0; position: relative; z-index: 1; overflow-y: auto; }
        .page-header-row {
          display: flex; justify-content: space-between; align-items: center;
          background: white; border: 1.5px solid rgba(139,92,246,0.12);
          border-radius: 24px; padding: 22px 28px; margin-bottom: 24px;
          box-shadow: 0 4px 24px rgba(139,92,246,0.07);
          position: relative; overflow: hidden;
        }
        .page-header-row::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #7c3aed, #ec4899, #f97316, #10b981);
          border-radius: 24px 24px 0 0;
        }
        .page-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 900; color: #1e1b4b; }
        .page-sub { font-size: 12px; color: #9ca3af; font-weight: 600; margin-top: 3px; }
        .new-dist-btn {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          border: none; border-radius: 12px; color: white;
          font-size: 13px; font-weight: 800; padding: 10px 20px;
          text-decoration: none; transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
        }
        .new-dist-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(124,58,237,0.3); }
        .filter-panel {
          background: white; border: 1.5px solid rgba(139,92,246,0.1);
          border-radius: 20px; padding: 24px 28px; margin-bottom: 24px;
          box-shadow: 0 2px 12px rgba(139,92,246,0.05);
        }
        .filter-label-sm {
          font-size: 11px; font-weight: 800; color: #a78bfa;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 14px;
        }
        .filter-input {
          padding: 10px 14px; border: 1.5px solid rgba(139,92,246,0.15);
          border-radius: 12px; font-size: 13px; color: #1e1b4b;
          font-family: 'Nunito', sans-serif; font-weight: 700;
          background: #f9f8ff; outline: none; transition: all 0.2s; width: 100%; box-sizing: border-box;
        }
        .filter-input:focus { border-color: #7c3aed; background: #faf5ff; }
        .workspace {
          display: flex; flex-direction: row; gap: 24px; align-items: flex-start;
        }
        .table-card {
          flex: 1; min-width: 0; background: white;
          border: 1.5px solid rgba(139,92,246,0.1);
          border-radius: 20px; padding: 24px; box-shadow: 0 2px 12px rgba(139,92,246,0.05);
        }
        .table-title {
          font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 900;
          color: #1e1b4b; margin-bottom: 18px;
        }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th {
          padding: 10px 12px; text-align: left;
          font-size: 10.5px; font-weight: 800; color: #a78bfa;
          letter-spacing: 0.08em; text-transform: uppercase;
          border-bottom: 2px solid rgba(139,92,246,0.1);
          background: #faf5ff; white-space: nowrap;
        }
        .data-table td { padding: 12px; font-size: 12.5px; font-weight: 600; border-bottom: 1px solid rgba(139,92,246,0.06); }
        .data-table tr:hover td { background: #faf5ff; }
        .data-table tr.row-active td { background: #f5f3ff; }
        .record-id { font-family: monospace; color: #7c3aed; font-weight: 900; font-size: 13px; }
        .recipient-name { font-weight: 800; color: #1e1b4b; }
        .status-badge {
          font-weight: 800; padding: 3px 10px; border-radius: 8px; font-size: 10.5px;
        }
        .status-badge.completed { background: #f0fdf4; color: #065f46; border: 1px solid rgba(16,185,129,0.2); }
        .status-badge.cancelled { background: #fff1f2; color: #9f1239; border: 1px solid rgba(244,63,94,0.2); }
        .view-btn {
          font-size: 11.5px; font-weight: 800; padding: 6px 14px;
          border-radius: 10px; cursor: pointer; transition: all 0.2s;
          border: 1.5px solid rgba(139,92,246,0.2);
          font-family: 'Nunito', sans-serif;
        }
        .view-btn.inactive { background: white; color: #1e1b4b; }
        .view-btn.inactive:hover { background: #f5f3ff; color: #7c3aed; }
        .view-btn.active-btn {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          border-color: transparent; color: white;
          box-shadow: 0 3px 12px rgba(124,58,237,0.3);
        }
        .detail-panel {
          width: 360px; flex-shrink: 0; background: white;
          border: 1.5px solid rgba(139,92,246,0.1); border-radius: 20px;
          padding: 22px; box-shadow: 0 2px 12px rgba(139,92,246,0.05);
          position: sticky; top: 32px;
        }
        .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px dashed rgba(139,92,246,0.1); }
        .detail-title { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 900; color: #1e1b4b; }
        .close-btn { background: #f5f3ff; border: 1.5px solid rgba(139,92,246,0.15); border-radius: 8px; color: #7c3aed; font-size: 14px; cursor: pointer; padding: 4px 10px; font-weight: 800; transition: all 0.2s; }
        .close-btn:hover { background: #ede9fe; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f9f8ff; border: 1.5px solid rgba(139,92,246,0.1); border-radius: 14px; padding: 14px; margin-bottom: 18px; }
        .meta-item-label { font-size: 10px; font-weight: 800; color: #a78bfa; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
        .meta-item-value { font-size: 13px; font-weight: 900; }
        .section-label { font-size: 10.5px; font-weight: 800; color: #a78bfa; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
        .recipient-info { margin-bottom: 18px; padding-bottom: 16px; border-bottom: 2px dashed rgba(139,92,246,0.1); }
        .items-list { max-height: 240px; overflow-y: auto; border: 1.5px solid rgba(139,92,246,0.1); border-radius: 14px; background: white; margin-bottom: 12px; }
        .items-list::-webkit-scrollbar { width: 4px; }
        .items-list::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.3); border-radius: 4px; }
        .dist-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid rgba(139,92,246,0.06); }
        .dist-item:last-child { border-bottom: none; }
        .dist-item-img { width: 44px; height: 44px; min-width: 44px; border-radius: 10px; overflow: hidden; background: #f5f3ff; border: 1.5px solid rgba(139,92,246,0.1); display: flex; align-items: center; justify-content: center; }
        .dist-item-img img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
        .dist-item-name { font-size: 13px; font-weight: 800; color: #1e1b4b; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dist-item-meta { font-size: 10.5px; color: #9ca3af; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
       
        .inline-edit-input {
          width: 100%; padding: 6px 10px; border: 1.5px solid #a78bfa; border-radius: 8px;
          font-size: 12px; color: #1e1b4b; font-family: 'Nunito', sans-serif; font-weight: 700;
          background: #fff; outline: none; margin-bottom: 4px; box-sizing: border-box;
        }
        .drawer-action-btn-row { display: flex; gap: 8px; margin-top: 10px; }
        .btn-drawer-save { flex: 1; background: #10b981; border: none; border-radius: 8px; color: white; font-weight: 800; font-size: 12px; padding: 8px; cursor: pointer; font-family: 'Nunito', sans-serif; }
        .btn-drawer-cancel { background: #ef4444; border: none; border-radius: 8px; color: white; font-weight: 800; font-size: 12px; padding: 8px 14px; cursor: pointer; font-family: 'Nunito', sans-serif; }
        .btn-drawer-edit-trigger { width: 100%; background: white; border: 1.5px solid rgba(139,92,246,0.3); border-radius: 10px; color: #7c3aed; font-weight: 800; font-size: 12px; padding: 8px; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s; }
        .btn-drawer-edit-trigger:hover { background: #f5f3ff; }
        .btn-drawer-undo { width: 100%; margin-top: 6px; background: #fff1f2; border: 1.5px solid rgba(244,63,94,0.25); border-radius: 10px; color: #f43f5e; font-weight: 800; font-size: 12px; padding: 8px; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s; }
        .btn-drawer-undo:hover { background: #ffe4e6; }
       
        .close-panel-btn {
          width: 100%; margin-top: 10px; background: #f5f3ff;
          border: 1.5px solid rgba(139,92,246,0.15); border-radius: 12px;
          color: #7c3aed; font-size: 12.5px; font-weight: 800;
          padding: 10px; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s;
        }
        .close-panel-btn:hover { background: #ede9fe; }
      `}</style>

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
              <Link href="/items" className="nav-link"><span className="nav-icon">📦</span>{isSidebarOpen && <span>Browse Items</span>}</Link>
              <Link href="/distribution-records" className="nav-link active"><span className="nav-icon">🚚</span>{isSidebarOpen && <span>Distribution Records</span>}</Link>
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
              <div className="page-title">Distribution Records</div>
              <div className="page-sub">View and trace historical distribution records.</div>
            </div>
            <Link href="/items" className="new-dist-btn">+ New Distribution</Link>
          </div>

          {/* Filters */}
          <div className="filter-panel">
            <div className="filter-label-sm">Filter Matrix Pipeline</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              <input type="text" placeholder="Search records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="filter-input" />
              <input type="text" placeholder="Date From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} onFocus={(e) => (e.target.type = 'date')} onBlur={(e) => (e.target.type = 'text')} className="filter-input" />
              <input type="text" placeholder="Date To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} onFocus={(e) => (e.target.type = 'date')} onBlur={(e) => (e.target.type = 'text')} className="filter-input" />
              <select value={recipientFilter} onChange={(e) => setRecipientFilter(e.target.value)} className="filter-input">
                <option value="">All Recipients</option>
                {uniqueRecipients.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-input">
                <option value="">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Dual Pane */}
          <div className="workspace">
            {/* Table */}
            <div className="table-card">
              <div className="table-title">Historical Outbound Ledger ({filteredRecords.length})</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>Recipient Name</th>
                      <th>Contact</th>
                      <th>Items</th>
                      <th>Date & Time</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((rec) => (
                      <tr key={rec.id} className={activeRecord?.id === rec.id ? 'row-active' : ''}>
                        <td className="record-id">DR-00{rec.id}</td>
                        <td className="recipient-name">{rec.recipient_name}</td>
                        <td style={{ color: '#6b7280' }}>{rec.contact || 'N/A'}</td>
                        <td style={{ color: '#6b7280' }}>{rec.items_count} items</td>
                        <td style={{ color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(rec.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                        <td>
                          <span className={`status-badge ${rec.status === 'Cancelled' ? 'cancelled' : 'completed'}`}>
                            {rec.status || 'Completed'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleOpenDetails(rec)}
                            className={`view-btn ${activeRecord?.id === rec.id ? 'active-btn' : 'inactive'}`}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontWeight: 600 }}>
                          No records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail Panel */}
            {activeRecord && (
              <div className="detail-panel">
                <div className="detail-header">
                  <div className="detail-title">Distribution Details</div>
                  <button onClick={() => setActiveRecord(null)} className="close-btn">✕</button>
                </div>

                <div className="meta-grid">
                  <div>
                    <div className="meta-item-label">Record ID</div>
                    <div className="meta-item-value" style={{ color: '#7c3aed', fontFamily: 'monospace' }}>DR-00{activeRecord.id}</div>
                  </div>
                  <div>
                    <div className="meta-item-label">Date</div>
                    <div className="meta-item-value" style={{ color: '#1e1b4b' }}>
                      {new Date(activeRecord.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>

                <div className="recipient-info">
                  <div className="section-label" style={{ marginBottom: 12 }}>Recipient Information</div>
                 
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>Org Name</label>
                        <input type="text" value={editForm.recipient_name} onChange={e => setEditForm({ ...editForm, recipient_name: e.target.value })} className="inline-edit-input" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>PIC Name</label>
                          <input type="text" value={editForm.pic_name} onChange={e => setEditForm({ ...editForm, pic_name: e.target.value })} className="inline-edit-input" />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>Contact</label>
                          <input type="text" value={editForm.contact} onChange={e => setEditForm({ ...editForm, contact: e.target.value })} className="inline-edit-input" />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>Email</label>
                        <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="inline-edit-input" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>Internal Notes</label>
                        <textarea rows={2} value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} className="inline-edit-input" style={{ resize: 'vertical' }} />
                      </div>
                      <div className="drawer-action-btn-row">
                        <button onClick={handleSaveEdit} className="btn-drawer-save">Save changes</button>
                        <button onClick={() => setIsEditing(false)} className="btn-drawer-cancel">✕</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                      <div>
                        <div style={{ color: '#9ca3af', marginBottom: 3 }}>Name</div>
                        <div style={{ fontWeight: 800, color: '#1e1b4b' }}>{activeRecord.recipient_name}</div>
                        {activeRecord.pic_name && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>(PIC: {activeRecord.pic_name})</div>}
                      </div>
                      <div>
                        <div style={{ color: '#9ca3af', marginBottom: 3 }}>Contact</div>
                        <div style={{ fontWeight: 800, color: '#1e1b4b' }}>{activeRecord.contact || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeRecord.email}</div>
                      </div>
                     
                      {activeRecord.note && (
                        <div style={{ gridColumn: '1 / span 2', background: '#f9f8ff', padding: 8, borderRadius: 8, fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginTop: 4 }}>
                          Note: "{activeRecord.note}"
                        </div>
                      )}

                      {activeRecord.status !== 'Cancelled' && (
                        <div style={{ gridColumn: '1 / span 2', marginTop: 4 }}>
                          <button onClick={() => setIsEditing(true)} className="btn-drawer-edit-trigger">✏️ Edit Recipient Info</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="section-label">Items Distributed ({activeItems.length})</div>
                <div className="items-list">
                  {activeItems.map((item, idx) => (
                    <div key={idx} className="dist-item">
                      <div className="dist-item-img">
                        <img src={getImageUrl(item.image_path)} alt={item.item_name} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100?text=?'; }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="dist-item-name">{item.item_name}</div>
                        <div className="dist-item-meta">{item.clothing_type} · {item.gender} · {item.age_group}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {activeRecord.status !== 'Cancelled' && (
                  <button onClick={handleCancelDistribution} className="btn-drawer-undo">↩️ Cancel & Undo Distribution</button>
                )}

                <button onClick={() => setActiveRecord(null)} className="close-panel-btn">Close Panel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}