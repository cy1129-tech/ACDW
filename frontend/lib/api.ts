// lib/api.ts
// This file handles all communication with the backend API

// 确保 URL 结尾没有多余的斜杠
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// Helper function to make API calls
async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  token?: string
) {
  // 🟢 调试：这是查找 404 的关键
  const fullUrl = `${API_URL}${endpoint}`;
  console.log("🚀 正在请求后端:", fullUrl);

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: any = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(fullUrl, options);
  
  // 检查是否返回了 HTML (这通常是 404 或 500 的报错页)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") === -1) {
    throw new Error("服务器返回了非 JSON 格式的响应 (可能是 404 或服务器错误)");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ==========================================
// 简化路由：确保 endpoint 以 / 开头
// ==========================================

export async function getClothingItems(token: string, filters?: any) {
  let query = '';
  if (filters) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.age_group) params.append('age_group', filters.age_group);
    if (filters.search) params.append('search', filters.search);
    query = '?' + params.toString();
  }
  return apiCall(`/clothing${query}`, 'GET', null, token);
}

export async function uploadAndClassifyImage(
  token: string,
  file: File,
  item_name: string,
  description: string,
  gender?: string,
  age_group?: string,
  sub_type?: string
) {
  const formData = new FormData();
  formData.append('image', file); 
  formData.append('item_name', item_name);
  formData.append('description', description);
  if (gender) formData.append('gender', gender);
  if (age_group) formData.append('age_group', age_group);
  if (sub_type) formData.append('sub_type', sub_type);

  const headers: any = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 必须使用 full URL
  const response = await fetch(`${API_URL}/clothing/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }
  return data;
}

export function getSharedImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return 'https://placehold.co/600x400/ede9fe/7c3aed?text=No+Image';

  let fileName = imagePath;
  if (imagePath.includes('uploads/')) {
    fileName = imagePath.split('uploads/').pop() || imagePath;
  }
  
  fileName = fileName.replace(/\\/g, '/').replace(/^\//, '');

  const baseDomain = API_URL.replace(/\/api$/, '');
  return `${baseDomain}/uploads/${fileName}`;
}