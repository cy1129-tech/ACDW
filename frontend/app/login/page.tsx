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

  // 🟢 Forgot Password Modal 状态控制池
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

    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

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

  // 🟢 触发忘记密码提交逻辑
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalMessage('');

    if (!forgotUsername || !forgotEmail) {
      setModalError('Please fill in all fields');
      return;
    }

    setModalLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        username: forgotUsername,
        email: forgotEmail
      });

      if (response.data.success) {
        setModalMessage('✅ Temporary password sent! Please check your Gmail box.');
        setForgotUsername('');
        setForgotEmail('');
      }
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Verification failed. Check credentials.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 relative">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md z-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          ACDW System
        </h1>
        <p className="text-center text-gray-600 mb-8">Sign in to your account</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-700 font-semibold text-sm">Password</label>
              {/* 🟢 华丽加装：精致对齐的 Forgot Password 触发超链接 */}
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(true);
                  setModalError('');
                  setModalMessage('');
                }}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition text-sm disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Register Link */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{' '}
          <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>

      {/* ================================================================= */}
      {/* 🟢 终极高光：华丽的悬浮忘记密码重置控制暗箱 (Modal Overlay) */}
      {/* ================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Reset Password</h3>
            <p className="text-xs text-gray-500 mb-4">Enter credentials to receive a temporary pass key.</p>

            {modalError && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg mb-3 text-xs">{modalError}</div>}
            {modalMessage && <div className="bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded-lg mb-3 text-xs font-semibold">{modalMessage}</div>}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium text-xs mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  placeholder="Your username"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium text-xs mb-1">Registered Gmail</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {modalLoading ? 'Processing...' : 'Send Key Mail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}