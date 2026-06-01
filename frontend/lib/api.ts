// final check
// lib/api.ts
// This file handles all communication with the backend API
// frontend/lib/api.ts
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

async function apiCall(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options: any = { method, headers };
  if (body && (method === 'POST' || method === 'PUT')) options.body = JSON.stringify(body);
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'API request failed');
  return data;
}

export async function registerUser(username: string, email: string, password: string) {
  return apiCall('/auth/register', 'POST', { username, email, password });
}
export async function loginUser(username: string, password: string) {
  return apiCall('/auth/login', 'POST', { username, password });
}
export async function getClothingItems(token: string, filters?: { type?: string; gender?: string; age_group?: string; search?: string; }) {
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
export async function addClothingItem(token: string, item: { item_name: string; description?: string; gender?: string; age_group?: string; clothing_type: string; sub_type?: string; }) {
  return apiCall('/clothing', 'POST', item, token);
}
export async function updateClothingItem(token: string, itemId: number, item: { item_name: string; description?: string; gender?: string; age_group?: string; clothing_type: string; sub_type?: string; }) {
  return apiCall(`/clothing/${itemId}`, 'PUT', item, token);
}
export async function deleteClothingItem(token: string, itemId: number) {
  return apiCall(`/clothing/${itemId}`, 'DELETE', null, token);
}

// 👑 你的黄金 JSON 版
export async function uploadAndClassifyImage(
  token: string,
  file: File,
  item_name: string,
  description: string,
  gender?: string,
  age_group?: string,
  sub_type?: string
) {
  const toBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  try {
    const base64Image = await toBase64(file);
    return await apiCall('/clothing/upload', 'POST', {
      image: base64Image,
      item_name,
      description,
      gender: gender || 'Unisex',
      age_group: age_group || 'Adult',
      sub_type
    }, token);
  } catch (error) {
    console.error("❌ Front-end Error:", error);
    throw error;
  }
}