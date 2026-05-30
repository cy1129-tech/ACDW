'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function ProfilePage() {
  const { token, logout } = useAuth(); // 拿到登录凭证
  const router = useRouter();

  // 核心个人数据池
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState(''); // 修改密码输入框

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 1. 页面加载时，全自动从小车缓存（localStorage）或后端的解密数据里初始化用户档案
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    
    // 从 localStorage 恢复出登录时后端吐回来的初始化用户信息
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsername(user.username || '');
      setEmail(user.email || '');
      setOrganizationName(user.organization_name || 'Shared Org');
    }
  }, [token]);

  // 2. 处理点击“保存修改”的核心控制逻辑
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username || !email) {
      setError('Username and email cannot be left blank');
      return;
    }

    // 🟢 找到 frontend/app/profile/page.tsx 的 handleSubmit 内部，加上这段密码强度拦截：

    // 如果用户填了新密码，且长度小于 6 位，立刻弹窗警告并拦截提交！
    if (password && password.trim().length < 6) {
      setError('New Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(
        'http://localhost:5000/api/auth/profile',
        {
          username,
          email,
          password: password || undefined, // 如果密码为空就不传，后端会自动忽略更新密码
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setMessage('🎉 Profile updated successfully!');
        setPassword(''); // 成功后清空新密码框

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg">
        
        {/* Navigation Top */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm font-semibold">
            ← Back to Dashboard
          </Link>
          <button 
            onClick={() => { logout(); router.push('/login'); }} 
            className="text-xs bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg transition"
          >
            Log Out Account
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Account Profile</h1>
        <p className="text-sm text-gray-500 mb-6">View and adjust your personal account settings.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg mb-4 text-sm">{error}</div>}
        {message && <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2.5 rounded-lg mb-4 text-sm font-semibold">{message}</div>}

        <form onSubmit={handleUpdateProfile} className="space-y-5">
          
          {/* Organisation Name — 🔒 只读锁定防御圈 */}
          <div>
            <label className="block text-gray-500 font-semibold mb-1.5 text-xs uppercase tracking-wider">Organisation Name (Locked)</label>
            <input
              type="text"
              disabled
              value={organizationName}
              className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-400 font-bold text-sm cursor-not-allowed shadow-inner"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Password — 💡 提示词暗示：不填则保留原密码 */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">New Password (Optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition text-sm shadow-md disabled:opacity-50"
          >
            {loading ? 'Saving updates...' : '💾 Save Changes'}
          </button>

        </form>
      </div>
    </div>
  );
}