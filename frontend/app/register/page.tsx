'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password || !organizationName) {
      setError('All fields including Organisation Name are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        username,
        email,
        password,
        organization_name: organizationName,
      });
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
          background: #f0f4ff; box-sizing: border-box;
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
          width: 100%; max-width: 460px;
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
        .section-label {
          font-size: 11px; font-weight: 800; color: #a78bfa;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 14px;
        }
        .divider { border: none; border-top: 2px dashed rgba(139,92,246,0.1); margin: 22px 0; }
        .field-spacer { margin-bottom: 16px; }
        .field-label {
          display: block; font-size: 11px; font-weight: 800; color: #9ca3af;
          letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;
        }
        .field-input {
          width: 100%; padding: 12px 16px;
          border: 1.5px solid rgba(139,92,246,0.18); border-radius: 14px;
          font-size: 13.5px; color: #1e1b4b;
          font-family: 'Nunito', sans-serif; font-weight: 700;
          background: #f9f8ff; outline: none; transition: all 0.2s;
          box-sizing: border-box;
        }
        .field-input:focus {
          border-color: #7c3aed; background: #faf5ff;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.09);
        }
        .field-input::placeholder { color: #c4b5fd; font-weight: 600; }
        .alert-error {
          background: #fff1f2; border: 1.5px solid rgba(244,63,94,0.25);
          color: #be123c; border-radius: 14px; padding: 12px 16px;
          font-size: 13px; font-weight: 700; margin-bottom: 20px;
        }
        .submit-btn {
          width: 100%; background: linear-gradient(135deg, #7c3aed, #a855f7);
          border: none; border-radius: 14px; color: white;
          font-size: 14px; font-weight: 800; padding: 14px;
          cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
          margin-top: 8px;
        }
        .submit-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(124,58,237,0.32); }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
        .login-link {
          text-align: center; font-size: 13px; color: #9ca3af;
          font-weight: 600; margin-top: 24px;
        }
        .login-link a { color: #7c3aed; font-weight: 800; text-decoration: none; }
        .login-link a:hover { text-decoration: underline; }
        .pw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      `}</style>

      <div className="auth-root">
        <div className="auth-card">
          <div className="auth-logo">SnapDonate System</div>
          <div className="auth-sub">Create your organisation account</div>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Organisation */}
            <div className="section-label">Organisation</div>
            <div className="field-spacer">
              <label className="field-label">Organisation Name(MUST be full name and in English) *</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g., Red Cross, UPM Solar Group"
                className="field-input"
              />
            </div>

            <hr className="divider" />

            {/* Account */}
            <div className="section-label">Account Details</div>
            <div className="field-spacer">
              <label className="field-label">Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="field-input"
              />
            </div>
            <div className="field-spacer">
              <label className="field-label">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="field-input"
              />
            </div>

            <hr className="divider" />

            {/* Password */}
            <div className="section-label">Security</div>
            <div className="pw-grid">
              <div className="field-spacer">
                <label className="field-label">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="field-input"
                />
              </div>
              <div className="field-spacer">
                <label className="field-label">Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="field-input"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <div className="login-link">
            Already have an account?{' '}
            <Link href="/login">Login here</Link>
          </div>
        </div>
      </div>
    </>
  );
}