// lib/api.ts
// This file handles all communication with the backend API

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://acdw-backend-node.onrender.com/api';;

// Helper function to make API calls
async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  token?: string
) {
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

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ==========================================
// AUTH FUNCTIONS
// ==========================================

export async function registerUser(username: string, email: string, password: string) {
  return apiCall('/auth/register', 'POST', { username, email, password });
}

export async function loginUser(username: string, password: string) {
  return apiCall('/auth/login', 'POST', { username, password });
}

// ==========================================
// CLOTHING FUNCTIONS
// ==========================================

export async function getClothingItems(
  token: string,
  filters?: {
    type?: string;
    gender?: string;
    age_group?: string;
    search?: string;
  }
) {
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

export async function addClothingItem(
  token: string,
  item: {
    item_name: string;
    description?: string;
    gender?: string;
    age_group?: string;
    clothing_type: string;
    sub_type?: string;
  }
) {
  return apiCall('/clothing', 'POST', item, token);
}

export async function updateClothingItem(
  token: string,
  itemId: number,
  item: {
    item_name: string;
    description?: string;
    gender?: string;
    age_group?: string;
    clothing_type: string;
    sub_type?: string;
  }
) {
  return apiCall(`/clothing/${itemId}`, 'PUT', item, token);
}

export async function deleteClothingItem(token: string, itemId: number) {
  return apiCall(`/clothing/${itemId}`, 'DELETE', null, token);
}

// Upload image and AI classify
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
  // 🟢 FIXED: 使用正确的 file 参数，不再报错
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

  // 🟢 重要：不要手动设置 Content-Type，让浏览器自动识别 multipart/form-data
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
  } else if (imagePath.includes('uploads\\')) {
    fileName = imagePath.split('uploads\\').pop() || imagePath;
  }
  
  fileName = fileName.replace(/\\/g, '/').replace(/^\//, '');

  const baseDomain = API_URL.replace(/\/api$/, '');
  return `${baseDomain}/uploads/${fileName}`;
}