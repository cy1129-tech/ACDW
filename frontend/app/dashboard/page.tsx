'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isLarge, setIsLarge] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Hello! 🤖 I am your SnapDonate Charity Assistant. Ask me which real shelters or orphanages in Malaysia urgently need clothing donations right now!' }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/chatbot',
        { message: userText, history: messages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => [...prev, { sender: 'ai', text: response.data.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { sender: 'ai', text: '⚠️ Connection timeout. Please check your backend.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderLinksOnly = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s"|]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold hover:text-blue-800 break-all transition-colors mx-0.5">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const formatCellText = (cellText: string) => {
    const parts = cellText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-gray-900">{renderLinksOnly(part.slice(2, -2))}</strong>;
      }
      return <span key={i}>{renderLinksOnly(part)}</span>;
    });
  };

  const renderTableHelper = (rows: string[][], keyPrefix: any) => {
    if (rows.length === 0) return null;
    const headers = rows[0];
    const bodyRows = rows.slice(1);
    return (
      <div key={`table-${keyPrefix}`} className="my-3 w-full overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-[11px] text-left text-gray-700">
          <thead className="bg-gray-50 text-gray-900">
            <tr>
              {headers.map((h, i) => <th key={i} className="px-3 py-2 font-black border-b border-gray-200 bg-gray-100 tracking-wide">{formatCellText(h)}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                {row.map((cell, cIdx) => <td key={cIdx} className="px-3 py-2 whitespace-normal break-words font-medium">{formatCellText(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTableRows: string[][] = [];
    let isInsideTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('|')) {
        if (trimmedLine.replace(/[\s|:-]/g, '') === '') continue;
        isInsideTable = true;
        const cells = trimmedLine.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        currentTableRows.push(cells);
        continue;
      } else {
        if (isInsideTable && currentTableRows.length > 0) {
          elements.push(renderTableHelper(currentTableRows, i));
          currentTableRows = [];
          isInsideTable = false;
        }
      }
      let currentLine = line;
      let isBulletClick = false;
      if (trimmedLine.startsWith('* ')) {
        isBulletClick = true;
        currentLine = trimmedLine.substring(2);
      }
      const parts = currentLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIndex} className="font-extrabold text-gray-950">{renderLinksOnly(part.slice(2, -2))}</strong>;
        }
        return <span key={partIndex}>{renderLinksOnly(part)}</span>;
      });
      elements.push(
        <div key={i} className={isBulletClick ? "pl-4 my-1 flex items-start text-left" : "my-0.5 text-left"}>
          {isBulletClick && <span className="mr-2 text-indigo-500 font-bold">•</span>}
          <span className="flex-1 whitespace-pre-wrap break-all leading-relaxed">{renderedParts}</span>
        </div>
      );
    }
    if (isInsideTable && currentTableRows.length > 0) {
      elements.push(renderTableHelper(currentTableRows, lines.length));
    }
    return elements;
  };

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

        /* Soft colorful background */
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

        /* Sidebar */
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
        .nav-link:hover {
          background: #f5f3ff;
          color: #7c3aed;
          border-color: rgba(139,92,246,0.12);
        }
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
        .logout-btn:hover {
          background: #fff1f2;
          border-color: rgba(244,63,94,0.2);
        }

        /* Main area */
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

        /* Welcome header */
        .welcome-header {
          width: 100%;
          max-width: 1100px;
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
        .welcome-header::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #7c3aed, #ec4899, #f97316, #10b981);
          border-radius: 24px 24px 0 0;
        }

        .welcome-title {
          font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 900;
          color: #1e1b4b;
          letter-spacing: -0.02em;
        }

        .welcome-sub {
          font-size: 13px;
          color: #9ca3af;
          font-weight: 600;
          margin-top: 4px;
        }
        .welcome-sub .username { color: #7c3aed; font-weight: 800; }
        .welcome-sub .orgname { color: #10b981; font-weight: 800; }

        .header-logout-btn {
          background: #fef2f2;
          border: 1.5px solid rgba(244,63,94,0.2);
          color: #f43f5e;
          font-size: 13px;
          font-weight: 800;
          padding: 9px 22px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
        }
        .header-logout-btn:hover {
          background: #ffe4e6;
          border-color: #f43f5e;
        }

        /* Cards grid */
        .cards-grid {
          width: 100%;
          max-width: 1100px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        @media (max-width: 1024px) { .cards-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .cards-grid { grid-template-columns: 1fr; } }

        .dash-card {
          position: relative;
          border-radius: 24px;
          padding: 24px;
          min-height: 210px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-decoration: none;
          overflow: hidden;
          transition: transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s;
        }
        .dash-card:hover { transform: translateY(-6px); }

        .card-1 {
          background: linear-gradient(145deg, #ede9fe 0%, #ddd6fe 60%, #c4b5fd 100%);
          border: 1.5px solid rgba(139,92,246,0.2);
          box-shadow: 0 4px 20px rgba(124,58,237,0.12);
        }
        .card-1:hover { box-shadow: 0 16px 48px rgba(124,58,237,0.22); }

        .card-2 {
          background: linear-gradient(145deg, #e0f2fe 0%, #bae6fd 60%, #7dd3fc 100%);
          border: 1.5px solid rgba(14,165,233,0.2);
          box-shadow: 0 4px 20px rgba(14,165,233,0.12);
        }
        .card-2:hover { box-shadow: 0 16px 48px rgba(14,165,233,0.22); }

        .card-3 {
          background: linear-gradient(145deg, #dcfce7 0%, #bbf7d0 60%, #86efac 100%);
          border: 1.5px solid rgba(16,185,129,0.2);
          box-shadow: 0 4px 20px rgba(16,185,129,0.12);
        }
        .card-3:hover { box-shadow: 0 16px 48px rgba(16,185,129,0.22); }

        .card-4 {
          background: linear-gradient(145deg, #fff1f2 0%, #fecdd3 60%, #fda4af 100%);
          border: 1.5px solid rgba(244,63,94,0.2);
          box-shadow: 0 4px 20px rgba(244,63,94,0.12);
        }
        .card-4:hover { box-shadow: 0 16px 48px rgba(244,63,94,0.22); }

        /* Decorative orb inside each card */
        .card-orb {
          position: absolute;
          bottom: -20px;
          right: -20px;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          opacity: 0.35;
          transition: opacity 0.3s, transform 0.3s;
        }
        .dash-card:hover .card-orb { opacity: 0.55; transform: scale(1.1); }
        .orb-1 { background: radial-gradient(circle, #7c3aed, transparent); }
        .orb-2 { background: radial-gradient(circle, #0ea5e9, transparent); }
        .orb-3 { background: radial-gradient(circle, #10b981, transparent); }
        .orb-4 { background: radial-gradient(circle, #f43f5e, transparent); }

        .card-icon-wrap {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 14px;
        }
        .icon-1 { background: rgba(124,58,237,0.15); border: 1.5px solid rgba(124,58,237,0.2); }
        .icon-2 { background: rgba(14,165,233,0.15); border: 1.5px solid rgba(14,165,233,0.2); }
        .icon-3 { background: rgba(16,185,129,0.15); border: 1.5px solid rgba(16,185,129,0.2); }
        .icon-4 { background: rgba(244,63,94,0.15); border: 1.5px solid rgba(244,63,94,0.2); }

        .card-title {
          font-family: 'Outfit', sans-serif;
          font-size: 15.5px;
          font-weight: 900;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
          letter-spacing: -0.01em;
        }
        .card-1 .card-title { color: #4c1d95; }
        .card-2 .card-title { color: #0c4a6e; }
        .card-3 .card-title { color: #064e3b; }
        .card-4 .card-title { color: #881337; }

        .card-desc {
          font-size: 12px;
          line-height: 1.7;
          font-weight: 600;
          position: relative;
          z-index: 1;
        }
        .card-1 .card-desc { color: #5b21b6; }
        .card-2 .card-desc { color: #075985; }
        .card-3 .card-desc { color: #065f46; }
        .card-4 .card-desc { color: #9f1239; }

        .card-arrow {
          align-self: flex-end;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateX(-6px);
          transition: all 0.25s;
          position: relative;
          z-index: 1;
        }
        .dash-card:hover .card-arrow { opacity: 1; transform: translateX(0); }
        .arrow-1 { background: rgba(124,58,237,0.18); color: #7c3aed; }
        .arrow-2 { background: rgba(14,165,233,0.18); color: #0ea5e9; }
        .arrow-3 { background: rgba(16,185,129,0.18); color: #10b981; }
        .arrow-4 { background: rgba(244,63,94,0.18); color: #f43f5e; }

        /* Chatbot */
        .chatbot-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .fab-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #ec4899, #f97316);
          box-shadow: 0 8px 28px rgba(124,58,237,0.4);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .fab-btn.bouncing { animation: fabBounce 1.8s ease-in-out infinite; }
        .fab-btn:hover { transform: scale(1.1); box-shadow: 0 12px 40px rgba(124,58,237,0.55); }
        @keyframes fabBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .chat-window {
          background: white;
          border: 1.5px solid rgba(139,92,246,0.15);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(124,58,237,0.18);
          margin-bottom: 16px;
          transition: all 0.3s cubic-bezier(.4,0,.2,1);
        }
        .chat-window.normal { width: 380px; height: 520px; }
        .chat-window.large {
          position: fixed;
          inset: 0;
          margin: auto;
          width: 950px;
          height: 650px;
          max-width: 95vw;
          max-height: 85vh;
          z-index: 50;
        }

        .chat-header {
          background: linear-gradient(135deg, #7c3aed, #a855f7, #ec4899);
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .chat-header-title { font-weight: 800; font-size: 13px; color: white; font-family: 'Outfit', sans-serif; }
        .chat-header-sub { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 1px; font-weight: 600; }

        .chat-icon-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 8px;
          padding: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-icon-btn:hover { background: rgba(255,255,255,0.35); }
        .chat-close-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          font-size: 18px;
          cursor: pointer;
          font-weight: 700;
          transition: color 0.2s;
          padding: 2px 6px;
        }
        .chat-close-btn:hover { color: white; }

        .chat-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #f8f7ff;
        }

        .msg-bubble {
          max-width: 88%;
          padding: 11px 14px;
          border-radius: 16px;
          font-size: 12.5px;
          line-height: 1.65;
          font-weight: 600;
        }
        .msg-user {
          align-self: flex-end;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          border-bottom-right-radius: 4px;
          max-width: 80%;
        }
        .msg-ai {
          align-self: flex-start;
          background: white;
          border: 1.5px solid rgba(139,92,246,0.12);
          color: #1e1b4b;
          border-bottom-left-radius: 4px;
          width: 94%;
          max-width: 94%;
          box-shadow: 0 2px 8px rgba(124,58,237,0.06);
        }

        .chat-input-row {
          padding: 12px 16px;
          border-top: 1.5px solid rgba(139,92,246,0.1);
          background: white;
          display: flex;
          gap: 10px;
        }
        .chat-input {
          flex: 1;
          background: #f5f3ff;
          border: 1.5px solid rgba(139,92,246,0.15);
          border-radius: 14px;
          padding: 9px 14px;
          font-size: 12.5px;
          color: #1e1b4b;
          outline: none;
          font-family: 'Nunito', sans-serif;
          font-weight: 600;
          transition: border-color 0.2s;
        }
        .chat-input::placeholder { color: #a78bfa; }
        .chat-input:focus { border-color: #7c3aed; background: #faf5ff; }
        .chat-send-btn {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 12.5px;
          font-weight: 800;
          padding: 9px 18px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
        }
        .chat-send-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(124,58,237,0.35); }
        .chat-send-btn:disabled { opacity: 0.4; transform: none; cursor: not-allowed; }

        .typing-dot {
          width: 8px; height: 8px;
          background: #a855f7;
          border-radius: 50%;
          display: inline-block;
        }
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: white;
          border: 1.5px solid rgba(139,92,246,0.12);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          box-shadow: 0 2px 8px rgba(124,58,237,0.06);
        }
        .typing-label {
          font-size: 11px;
          font-weight: 800;
          color: #7c3aed;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* Scrollbar */
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.3); border-radius: 4px; }
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
              <Link href="/dashboard" className="nav-link active">
                <span className="nav-icon">🏠</span>
                {isSidebarOpen && <span>Dashboard</span>}
              </Link>
              <Link href="/profile" className="nav-link">
                <span className="nav-icon">👤</span>
                {isSidebarOpen && <span>Account Profile</span>}
              </Link>
              <Link href="/upload" className="nav-link">
                <span className="nav-icon">📸</span>
                {isSidebarOpen && <span>Upload & AI Classify</span>}
              </Link>
              <Link href="/items" className="nav-link">
                <span className="nav-icon">📦</span>
                {isSidebarOpen && <span>Browse Items</span>}
              </Link>
              <Link href="/distribution-records" className="nav-link">
                <span className="nav-icon">🚚</span>
                {isSidebarOpen && <span>Distribution Records</span>}
              </Link>
            </nav>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>

        {/* Main content */}
        <div className="main-area">

          {/* Welcome Header */}
          <div className="welcome-header">
            <div>
              <div className="welcome-title">Dashboard Overview</div>
              <div className="welcome-sub">
                Welcome back,{' '}
                <span className="username">{user?.username || '34'}</span>
                {user?.organization_name && (
                  <> from <span className="orgname">{user.organization_name}</span></>
                )}
              </div>
            </div>
            <button onClick={handleLogout} className="header-logout-btn">Logout</button>
          </div>

          {/* Cards */}
          <div className="cards-grid">

            {/* Card 1 — Account Profile */}
            <Link href="/profile" className="dash-card card-1">
              <div className="card-orb orb-1" />
              <div>
                <div className="card-icon-wrap icon-1">👤</div>
                <div className="card-title">Account Profile</div>
                <div className="card-desc">View organization name, change username/email/password.</div>
              </div>
              <div className="card-arrow arrow-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </div>
            </Link>

            {/* Card 2 — Upload */}
            <Link href="/upload" className="dash-card card-2">
              <div className="card-orb orb-2" />
              <div>
                <div className="card-icon-wrap icon-2">📸</div>
                <div className="card-title">Upload & AI Classify</div>
                <div className="card-desc">Upload raw clothing images. Let our SnapDonate AI analyses and catogotised the cloth types.</div>
              </div>
              <div className="card-arrow arrow-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </div>
            </Link>

            {/* Card 3 — Browse Items */}
            <Link href="/items" className="dash-card card-3">
              <div className="card-orb orb-3" />
              <div>
                <div className="card-icon-wrap icon-3">📦</div>
                <div className="card-title">Browse Items</div>
                <div className="card-desc">Access secure shared catalogs. Experience multi-selection grid mechanics, and category count summaries.</div>
              </div>
              <div className="card-arrow arrow-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </div>
            </Link>

            {/* Card 4 — Distribution Records */}
            <Link href="/distribution-records" className="dash-card card-4">
              <div className="card-orb orb-4" />
              <div>
                <div className="card-icon-wrap icon-4">🚚</div>
                <div className="card-title">Distribution Records</div>
                <div className="card-desc">View distributed items and query historical recipient records.</div>
              </div>
              <div className="card-arrow arrow-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </div>
            </Link>

          </div>
        </div>

        {/* AI Chatbot */}
        <div className="chatbot-fab">
          {isOpen && (
            <div className={`chat-window ${isLarge ? 'large' : 'normal'}`}>
              {/* Header */}
              <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🤖</span>
                  <div>
                    <div className="chat-header-title">SnapDonate AI Shelter Finder</div>
                    <div className="chat-header-sub">Live Search Grounding Enabled</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" onClick={() => setIsLarge(!isLarge)} className="chat-icon-btn">
                    {isLarge ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                      </svg>
                    )}
                  </button>
                  <button onClick={() => { setIsOpen(false); setIsLarge(false); }} className="chat-close-btn">✕</button>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div className={`msg-bubble ${msg.sender === 'user' ? 'msg-user' : 'msg-ai'}`}>
                      {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="typing-indicator">
                    <span className="typing-dot" style={{ animation: 'pulse 1.2s 0s infinite' }} />
                    <span className="typing-dot" style={{ animation: 'pulse 1.2s 0.2s infinite' }} />
                    <span className="typing-dot" style={{ animation: 'pulse 1.2s 0.4s infinite' }} />
                    <span className="typing-label">🤖 AI is crawling relevant source networks for live grounding...</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="chat-input-row">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me: shelters in Perak that need clothes..."
                  className="chat-input"
                />
                <button type="submit" disabled={chatLoading} className="chat-send-btn">Send</button>
              </form>
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`fab-btn ${isOpen && !isLarge ? '' : 'bouncing'}`}
          >
            {isOpen && !isLarge
              ? <span style={{ fontSize: 18 }}>✕</span>
              : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 24, height: 24 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.418-4.03 8.25-9 8.25a9.865 9.865 0 0 1-4.8-.124l-3.119 1.241a.421.421 0 0 1-.538-.344l.17-2.614C3.395 16.81 2.25 14.535 2.25 12c0-4.418 4.03-8.25 9-8.25s9 3.832 9 8.25Z" />
                </svg>
            }
          </button>
        </div>

      </div>
    </>
  );
}