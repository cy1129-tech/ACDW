'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { API_URL } from '@/lib/api';

export default function ProfilePage() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsername(user.username || '');
      setEmail(user.email || '');
      setOrganizationName(user.organization_name || 'Shared Org');
    }
  }, [token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username || !email) {
      setError('Username and email cannot be left blank');
      return;
    }
    if (password && password.trim().length < 6) {
      setError('New Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/auth/profile`,
        { username, email, password: password || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setMessage('🎉 Profile updated successfully!');
        setPassword('');
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.username = username;
          user.email = email;
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@700;800;900&display=swap');

        .dash-root {
          font-family: 'Nunito', sans-serif;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: row;
          overflow-x: hidden;
          background: #f0f4ff;
          position: relative;
        }
        .dash-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 5% 10%, rgba(167,139,250,0.2) 0%, transparent 55%),
            radial-gradient(ellipse 55% 45% at 95% 85%, rgba(251,146,60,0.15) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 60% 0%, rgba(56,189,248,0.15) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 30% 100%, rgba(52,211,153,0.12) 0%, transparent 55%),
            linear-gradient(145deg, #eef2ff 0%, #fdf4ff 40%, #f0fdf4 100%);
          pointer-events: none;
          z-index: 0;
        }
        .sidebar {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 16px;
          background: white;
          border-right: 1px solid rgba(139,92,246,0.1);
          box-shadow: 4px 0 24px rgba(139,92,246,0.06);
          transition: width 0.3s cubic-bezier(.4,0,.2,1);
          flex-shrink: 0;
        }
        .sidebar.open { width: 240px; }
        .sidebar.closed { width: 72px; }
        .sidebar-logo {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 16px;
          letter-spacing: -0.01em;
          background: linear-gradient(135deg, #7c3aed, #ec4899, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          white-space: nowrap;
        }
        .sidebar-logo-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 2px dashed rgba(139,92,246,0.12);
        }
        .hamburger-btn {
          background: #f5f3ff;
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 10px;
          padding: 7px;
          color: #7c3aed;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .hamburger-btn:hover { background: #ede9fe; }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 13px;
          border-radius: 14px;
          font-size: 13.5px;
          font-weight: 700;
          color: #6b7280;
          text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
          overflow: hidden;
          margin-bottom: 4px;
          border: 1.5px solid transparent;
        }
        .nav-link:hover { background: #f5f3ff; color: #7c3aed; border-color: rgba(139,92,246,0.12); }
        .nav-link.active {
          background: linear-gradient(135deg, #ede9fe, #fce7f3);
          color: #7c3aed;
          border-color: rgba(167,139,250,0.3);
        }
        .nav-icon { font-size: 18px; flex-shrink: 0; }
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 13px;
          border-radius: 14px;
          font-size: 13.5px;
          font-weight: 700;
          color: #f43f5e;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          background: none;
          border: 1.5px solid transparent;
        }
        .logout-btn:hover { background: #fff1f2; border-color: rgba(244,63,94,0.2); }
        .main-area {
          flex: 1;
          padding: 32px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .page-header {
          width: 100%;
          max-width: 700px;
          background: white;
          border: 1.5px solid rgba(139,92,246,0.12);
          border-radius: 24px;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          box-shadow: 0 4px 24px rgba(139,92,246,0.07);
          position: relative;
          overflow: hidden;
        }
        .page-header::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #7c3aed, #ec4899, #f97316, #10b981);
          border-radius: 24px 24px 0 0;
        }
        .page-title {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 900;
          color: #1e1b4b;
          letter-spacing: -0.02em;
        }
        .page-sub { font-size: 12px; color: #9ca3af; font-weight: 600; margin-top: 4px; }
        .profile-card {
          width: 100%;
          max-width: 700px;
          background: white;
          border: 1.5px solid rgba(139,92,246,0.12);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 4px 24px rgba(139,92,246,0.07);
        }
        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          color: #9ca3af;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .field-input {
          width: 100%;
          padding: 11px 16px;
          border: 1.5px solid rgba(139,92,246,0.15);
          border-radius: 14px;
          font-size: 13.5px;
          color: #1e1b4b;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          background: #f9f8ff;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .field-input:focus { border-color: #7c3aed; background: #faf5ff; box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
        .field-input:disabled { background: #f3f4f6; color: #9ca3af; cursor: not-allowed; border-color: rgba(0,0,0,0.08); }
        .save-btn {
          width: 100%;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 14px;
          font-weight: 800;
          padding: 13px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
          margin-top: 8px;
        }
        .save-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
        .save-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
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
        .divider { border: none; border-top: 2px dashed rgba(139,92,246,0.1); margin: 24px 0; }
        .section-label {
          font-size: 11px; font-weight: 800; color: #a78bfa;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px;
        }
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
              <Link href="/profile" className="nav-link active"><span className="nav-icon">👤</span>{isSidebarOpen && <span>Account Profile</span>}</Link>
              <Link href="/upload" className="nav-link"><span className="nav-icon">📸</span>{isSidebarOpen && <span>Upload & AI Classify</span>}</Link>
              <Link href="/items" className="nav-link"><span className="nav-icon">📦</span>{isSidebarOpen && <span>Browse Items</span>}</Link>
              <Link href="/distribution-records" className="nav-link"><span className="nav-icon">🚚</span>{isSidebarOpen && <span>Distribution Records</span>}</Link>
            </nav>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>

        {/* Main */}
        <div className="main-area">
          <div className="page-header">
            <div>
              <div className="page-title">Account Profile</div>
              <div className="page-sub">Manage your identity, credentials and organisation info.</div>
            </div>
          </div>

          <div className="profile-card">
            {error && <div className="alert-error">{error}</div>}
            {message && <div className="alert-success">{message}</div>}

            <form onSubmit={handleUpdateProfile}>
              <div className="section-label">Organisation</div>
              <div style={{ marginBottom: 20 }}>
                <label className="field-label">Organisation Name (Locked)</label>
                <input type="text" disabled value={organizationName} className="field-input" />
              </div>

              <hr className="divider" />
              <div className="section-label">Account Details</div>

              <div style={{ marginBottom: 20 }}>
                <label className="field-label">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="field-input" />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="field-label">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
              </div>

              <hr className="divider" />
              <div className="section-label">Security</div>

              <div style={{ marginBottom: 24 }}>
                <label className="field-label">New Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="field-input"
                />
              </div>

              <button type="submit" disabled={loading} className="save-btn">
                {loading ? 'Saving updates...' : '💾 Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}