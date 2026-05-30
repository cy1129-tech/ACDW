// app/dashboard/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [token, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">ACDW System</h1>
            <p className="text-gray-600">Welcome, {user?.username}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          
          {/* Card 1: Upload & AI Classify */}
          <Link href="/upload">
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📷</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Upload & Classify</h2>
              <p className="text-gray-600">
                Upload an image of a clothing item and let AI analyze and categorize it.
              </p>
            </div>
          </Link>

          {/* Card 2: Browse Items */}
          <Link href="/items">
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">👕</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Browse Items</h2>
              <p className="text-gray-600">
                View all clothing items in inventory. Filter, search, edit and delete as needed.
              </p>
            </div>
          </Link>

        </div>
      </main>
    </div>
  );
}
