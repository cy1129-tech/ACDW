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

  // 🟢 AI Chatbot 状态控制中心
  const [isOpen, setIsOpen] = useState(false); 
  const [isLarge, setIsLarge] = useState(false); 
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Hello! 🤖 I am your ACDW Charity Assistant. Ask me which real shelters or orphanages in Malaysia urgently need clothing donations right now!' }
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

  // 发送消息给后端 Gemini / AI 路由
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;

    const userText = input.trim();
    setInput('');
    
    // 记录包含当前用户输入的完整最新对话组
    const updatedMessages = [...messages, { sender: 'user', text: userText }];
    setMessages(updatedMessages);
    setChatLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/chatbot',
        { 
          message: userText,
          history: messages // 🟢 核心升级：把这一轮之前的完整聊天记忆同步发给后端
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(prev => [...prev, { sender: 'ai', text: response.data.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { sender: 'ai', text: '⚠️ Connection timeout. Please check if your backend Gemini/AI agent server is running.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // 🛡️ 核心解析引擎：同时安全拆解【加粗】与【蓝色可点击网址】
  const parseTextWithLinksAndBold = (inputText: string) => {
    const boldParts = inputText.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldContent = part.slice(2, -2);
        return (
          <strong key={`b-${partIdx}`} className="font-extrabold text-gray-950 tracking-wide">
            {renderLinksOnly(boldContent)}
          </strong>
        );
      }
      return renderLinksOnly(part);
    });
  };

  // 🛡️ 子级链接拦截过滤器：把 http 文本变成真正的 <a> 标签并清除多余反引号
  const renderLinksOnly = (textSegment: string) => {
    const urlRegex = /(https?:\/\/[^\s`*()\[\]{}<>]+)/g;
    const pieces = textSegment.split(urlRegex);
    return pieces.map((piece, pieceIdx) => {
      if (piece.match(urlRegex)) {
        const cleanUrl = piece.replace(/[`*]/g, '');
        return (
          <a
            key={`link-${pieceIdx}`}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-bold hover:underline break-all mx-0.5"
          >
            {cleanUrl}
          </a>
        );
      }
      return piece.replace(/`/g, ''); // 清理文本中残留的 Markdown 反引号
    });
  };

  // 🛡️ 辅助渲染器：把表格数据渲染成高级精美的 HTML Table
  const renderTableHelper = (rows: string[][], keyPrefix: any) => {
    if (rows.length === 0) return null;
    const headers = rows[0];
    const bodyRows = rows.slice(1);

    return (
      <div key={`table-${keyPrefix}`} className="my-3 w-full overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-[11px] text-left text-gray-700">
          <thead className="bg-gray-50 text-gray-900">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-black border-b border-gray-200 bg-gray-100 tracking-wide">{parseTextWithLinksAndBold(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 whitespace-normal break-words font-medium">{parseTextWithLinksAndBold(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 🛡️ 全局排版核心解析器
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTableRows: string[][] = [];
    let isInsideTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('|')) {
        if (trimmedLine.replace(/[\s|:-]/g, '') === '') {
          continue;
        }
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

      elements.push(
        <div key={i} className={isBulletClick ? "pl-4 my-1 flex items-start text-left" : "my-0.5 text-left"}>
          {isBulletClick && <span className="mr-2 text-indigo-500 font-bold">•</span>}
          <span className="flex-1">{parseTextWithLinksAndBold(currentLine)}</span>
        </div>
      );
    }

    if (isInsideTable && currentTableRows.length > 0) {
      elements.push(renderTableHelper(currentTableRows, lines.length));
    }

    return elements;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6 relative flex flex-col items-center">
      
      {/* Top Header */}
      <div className="w-full max-w-5xl mx-auto flex justify-between items-center mb-10 bg-white p-6 rounded-xl shadow-sm">
        <div className="text-left">
          <h1 className="text-3xl font-extrabold text-gray-800">ACDW System</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, <span className="font-bold text-indigo-600">{user?.username || 'User'}</span> 
            {user?.organization_name && <> from <span className="font-bold text-emerald-600">{user.organization_name}</span></>}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-5 rounded-lg transition shadow-sm text-sm"
        >
          Logout
        </button>
      </div>

      {/* 3 Columns Cards Layout */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        
        {/* Card 1: Account Profile */}
        <Link 
          href="/profile" 
          className="w-full bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition flex flex-col items-start text-left border border-gray-100 group"
        >
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg mb-4 group-hover:bg-indigo-100 transition flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Account Profile</h2>
          <p className="text-xs text-gray-500 text-left leading-relaxed">
            View organization identity sandbox, manage username tokens, email descriptors, and change secure authentication credential password keys.
          </p>
        </Link>

        {/* Card 2: Upload & AI Classify */}
        <Link 
          href="/upload" 
          className="w-full bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition flex flex-col items-start text-left border border-gray-100 group"
        >
          <div className="bg-blue-50 text-blue-600 p-3 rounded-lg mb-4 group-hover:bg-blue-100 transition flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Upload & AI Classify</h2>
          <p className="text-xs text-gray-500 text-left leading-relaxed">
            Upload raw clothing images. Let our multi-stage Cascading CLIP AI machine parse gender types, age filters, and auto-label garments into database partitions.
          </p>
        </Link>

        {/* Card 3: Browse Items */}
        <Link 
          href="/items" 
          className="w-full bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition flex flex-col items-start text-left border border-gray-100 group"
        >
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg mb-4 group-hover:bg-emerald-100 transition flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.007 5.243H3.75v.008h.007v-.008Zm0 5.25H3.75v.008h.007v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Browse Items</h2>
          <p className="text-xs text-gray-500 text-left leading-relaxed">
            Access secure shared organizational catalogs. Experience multi-selection grid mechanics, smooth pagination clusters, and dual-interception bulk delete blocks.
          </p>
        </Link>

      </div>

      {/* ================================================================= */}
      {/* 🔮 AI Chatbot 智能挂件组件 */}
      {/* ================================================================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        
        {isOpen && (
          <div className={`bg-white rounded-2xl shadow-2xl mb-4 flex flex-col overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-5 transition-all duration-300 ${
            isLarge ? 'w-[90vw] max-w-4xl h-[70vh]' : 'w-80 md:w-96 h-[480px]'
          }`}>
            {/* Header */}
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-pulse">🤖</span>
                <div>
                  <h4 className="font-bold text-sm text-left">ACDW AI Shelter Finder</h4>
                  <p className="text-[10px] text-indigo-200">Live Search Grounding Enabled</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsLarge(!isLarge)}
                  className="text-indigo-200 hover:text-white text-xs bg-indigo-700/50 hover:bg-indigo-700 px-1.5 py-0.5 rounded transition-colors font-mono"
                >
                  {isLarge ? '🗗' : '🗖'}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white font-bold text-sm">✕</button>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50 text-xs text-gray-900">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-xl p-3 shadow-sm leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none max-w-[85%]' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm w-full max-w-[95%]'
                  }`}>
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-xl rounded-bl-none p-3 shadow-sm text-gray-400 italic flex items-center gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce [animation-delay:0.2s]">●</span>
                    <span className="animate-bounce [animation-delay:0.4s]">●</span>
                    AI is crawling Malaysian web handles...
                  </div>
                </div>
              )}
            </div>

            {/* Input Form Footer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me: shelters in Perak that need clothes"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-gray-900"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-xl text-xs transition disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Floating Bubble Circle Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition transform hover:scale-105 active:scale-95 duration-200 ${
            isOpen ? 'bg-gray-800 rotate-90' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isOpen ? <span className="text-xl">✕</span> : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 animate-bounce">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.418-4.03 8.25-9 8.25a9.865 9.865 0 0 1-4.8-.124l-3.119 1.241a.421.421 0 0 1-.538-.344l.17-2.614C3.395 16.81 2.25 14.535 2.25 12c0-4.418 4.03-8.25 9-8.25s9 3.832 9 8.25Z" />
            </svg>
          )}
        </button>

      </div>

    </div>
  );
}