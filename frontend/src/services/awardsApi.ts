import { getApiBase } from '@/utils/apiBase';
import { getAuthToken } from '@/utils/authStorage';

const API_BASE = getApiBase();

export interface Award {
  id: number;
  year: number;
  description: string;
  caseSlug?: string;
  externalUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getPublicAwards(): Promise<Award[]> {
  const res = await fetch(`${API_BASE}/api/public/awards`);
  if (!res.ok) throw new Error('Failed to fetch awards');
  return res.json();
}

export async function getAwards(): Promise<Award[]> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/awards`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch awards');
  return res.json();
}

export async function getAward(id: number): Promise<Award> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/awards/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch award');
  return res.json();
}

export async function createAward(award: Partial<Award>): Promise<Award> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/awards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(award),
  });
  if (!res.ok) throw new Error('Failed to create award');
  return res.json();
}

export async function updateAward(id: number, award: Partial<Award>): Promise<Award> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/awards/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(award),
  });
  if (!res.ok) throw new Error('Failed to update award');
  return res.json();
}

export async function deleteAward(id: number): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/awards/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to delete award');
}

