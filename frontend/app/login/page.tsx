'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Username and password are required'); return; }
    setLoading(true);
    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(''); setModalMessage('');
    if (!forgotUsername || !forgotEmail) { setModalError('Please fill in all fields'); return; }
    setModalLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', { username: forgotUsername, email: forgotEmail });
      if (response.data.success) {
        setModalMessage('✅ Temporary password sent! Please check your Gmail box.');
        setForgotUsername(''); setForgotEmail('');
      }
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Verification failed. Check credentials.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@700;800;900&display=swap');
        .auth-root {
          font-family: 'Nunito', sans-serif;
          min-height: 100vh; width: 100%;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden; padding: 24px;
          background: #f0f4ff;
          box-sizing: border-box;
        }
        .auth-root::before {
          content: ''; position: fixed; inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 10% 10%, rgba(167,139,250,0.25) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 90% 90%, rgba(251,146,60,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 55% 45% at 70% 0%, rgba(56,189,248,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 20% 100%, rgba(52,211,153,0.14) 0%, transparent 55%),
            linear-gradient(145deg, #eef2ff 0%, #fdf4ff 45%, #f0fdf4 100%);
          pointer-events: none; z-index: 0;
        }
        .auth-card {
          position: relative; z-index: 1;
          background: white;
          border: 1.5px solid rgba(139,92,246,0.14);
          border-radius: 28px;
          padding: 44px 40px;
          width: 100%; max-width: 420px;
          box-shadow: 0 8px 48px rgba(124,58,237,0.12);
          overflow: hidden;
        }
        .auth-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #7c3aed, #ec4899, #f97316, #10b981);
        }
        .auth-logo {
          font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 26px;
          background: linear-gradient(135deg, #7c3aed, #ec4899, #f97316);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; text-align: center; margin-bottom: 6px;
        }
        .auth-sub {
          text-align: center; font-size: 13px; color: #9ca3af;
          font-weight: 600; margin-bottom: 32px;
        }
        .field-label {
          display: block; font-size: 11px; font-weight: 800; color: #9ca3af;
          letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;
        }
        .field-row {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
        }
        .field-input {
          width: 100%; padding: 12px 16px;
          border: 1.5px solid rgba(139,92,246,0.18); border-radius: 14px;
          font-size: 14px; color: #1e1b4b;
          font-family: 'Nunito', sans-serif; font-weight: 700;
          background: #f9f8ff; outline: none; transition: all 0.2s;
          box-sizing: border-box;
        }
        .field-input:focus { border-color: #7c3aed; background: #faf5ff; box-shadow: 0 0 0 3px rgba(124,58,237,0.09); }
        .field-input::placeholder { color: #c4b5fd; font-weight: 600; }
        .forgot-btn {
          background: none; border: none; color: #7c3aed;
          font-size: 11.5px; font-weight: 800; cursor: pointer;
          font-family: 'Nunito', sans-serif; padding: 0;
          transition: color 0.2s;
        }
        .forgot-btn:hover { color: #6d28d9; text-decoration: underline; }
        .submit-btn {
          width: 100%; background: linear-gradient(135deg, #7c3aed, #a855f7);
          border: none; border-radius: 14px; color: white;
          font-size: 14px; font-weight: 800; padding: 14px;
          cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
          margin-top: 8px;
        }
        .submit-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(124,58,237,0.32); }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
        .alert-error {
          background: #fff1f2; border: 1.5px solid rgba(244,63,94,0.25);
          color: #be123c; border-radius: 14px; padding: 12px 16px;
          font-size: 13px; font-weight: 700; margin-bottom: 20px;
        }
        .register-link {
          text-align: center; font-size: 13px; color: #9ca3af;
          font-weight: 600; margin-top: 24px;
        }
        .register-link a { color: #7c3aed; font-weight: 800; text-decoration: none; }
        .register-link a:hover { text-decoration: underline; }
        .field-spacer { margin-bottom: 18px; }
        .divider { border: none; border-top: 2px dashed rgba(139,92,246,0.1); margin: 24px 0; }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(30,27,75,0.45);
          backdrop-filter: blur(5px);
          z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .modal-card {
          background: white; border-radius: 24px;
          box-shadow: 0 24px 64px rgba(124,58,237,0.2);
          width: 100%; max-width: 400px; padding: 32px;
          position: relative; overflow: hidden;
        }
        .modal-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #7c3aed, #ec4899, #f97316);
        }
        .modal-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 900; color: #1e1b4b; margin-bottom: 5px; }
        .modal-sub { font-size: 12px; color: #9ca3af; font-weight: 600; margin-bottom: 24px; }
        .modal-alert-error {
          background: #fff1f2; border: 1.5px solid rgba(244,63,94,0.2);
          color: #be123c; border-radius: 12px; padding: 10px 14px;
          font-size: 12.5px; font-weight: 700; margin-bottom: 16px;
        }
        .modal-alert-success {
          background: #f0fdf4; border: 1.5px solid rgba(16,185,129,0.2);
          color: #065f46; border-radius: 12px; padding: 10px 14px;
          font-size: 12.5px; font-weight: 700; margin-bottom: 16px;
        }
        .modal-field { margin-bottom: 16px; }
        .modal-label { display: block; font-size: 11px; font-weight: 800; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
        .modal-input {
          width: 100%; padding: 10px 14px;
          border: 1.5px solid rgba(139,92,246,0.15); border-radius: 12px;
          font-size: 13px; color: #1e1b4b; font-family: 'Nunito', sans-serif; font-weight: 700;
          background: #f9f8ff; outline: none; transition: all 0.2s; box-sizing: border-box;
        }
        .modal-input:focus { border-color: #7c3aed; background: #faf5ff; }
        .modal-footer { display: flex; gap: 10px; padding-top: 20px; border-top: 1.5px dashed rgba(139,92,246,0.1); margin-top: 8px; }
        .modal-cancel {
          flex: 1; background: #f5f3ff; border: 1.5px solid rgba(139,92,246,0.15);
          border-radius: 12px; color: #7c3aed; font-size: 13px; font-weight: 800;
          padding: 11px; cursor: pointer; font-family: 'Nunito', sans-serif;
        }
        .modal-confirm {
          flex: 1; background: linear-gradient(135deg, #7c3aed, #a855f7);
          border: none; border-radius: 12px; color: white;
          font-size: 13px; font-weight: 800; padding: 11px;
          cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s;
        }
        .modal-confirm:hover { opacity: 0.9; }
        .modal-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div className="auth-root">
        <div className="auth-card">
          <div className="auth-logo">SnapDonate System</div>
          <div className="auth-sub">Sign in to your account</div>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-spacer">
              <label className="field-label">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" className="field-input" />
            </div>

            <div className="field-spacer">
              <div className="field-row">
                <label className="field-label" style={{ margin: 0 }}>Password</label>
                <button type="button" className="forgot-btn" onClick={() => { setIsModalOpen(true); setModalError(''); setModalMessage(''); }}>
                  Forgot password?
                </button>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="field-input" style={{ marginTop: 8 }} />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Logging in...' : 'Login →'}
            </button>
          </form>

          <div className="register-link">
            Don't have an account?{' '}
            <Link href="/register">Register here</Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-title">Reset Password</div>
            <div className="modal-sub">Enter your credentials to receive a temporary pass key.</div>

            {modalError && <div className="modal-alert-error">{modalError}</div>}
            {modalMessage && <div className="modal-alert-success">{modalMessage}</div>}

            <form onSubmit={handleForgotPasswordSubmit}>
              <div className="modal-field">
                <label className="modal-label">Username</label>
                <input type="text" required value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} placeholder="Your username" className="modal-input" />
              </div>
              <div className="modal-field">
                <label className="modal-label">Registered Gmail</label>
                <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="example@gmail.com" className="modal-input" />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="modal-cancel">Close</button>
                <button type="submit" disabled={modalLoading} className="modal-confirm">
                  {modalLoading ? 'Processing...' : 'Send Key Mail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}