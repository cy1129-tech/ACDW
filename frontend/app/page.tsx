'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (token) {
        // If logged in, go to dashboard
        router.push('/dashboard');
      } else {
        // If not logged in, go to login
        router.push('/login');
      }
    }
  }, [token, isLoading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">ACDW System</h1>
        <p className="text-xl text-gray-600">Redirecting...</p>
      </div>
    </main>
  );
}