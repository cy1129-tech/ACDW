// lib/api.ts
// This file handles all communication with the backend API

// frontend/lib/api.ts
// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ✅ 替换为下面这段【智能兼容版】代码：
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

// 这样不管 process.env 后面带不带 /api，API_URL 最终都一定会完美带有 /api！

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

  // Add JWT token if provided (for protected routes)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: any = {
    method,
    headers,
  };

  // Add body for POST, PUT requests
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

// Get all clothing items with optional filters and search
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

// Add new clothing manually
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

// Edit clothing item
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

// Delete clothing item
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
