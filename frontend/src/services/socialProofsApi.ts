import { getApiBase } from '@/utils/apiBase';

export interface SocialProof {
  id: number;
  type: 'review' | 'case' | 'metric' | 'testimonial';
  title: string;
  description?: string;
  imageUrl?: string;
  value?: string;
  label?: string;
  authorName?: string;
  authorPosition?: string;
  authorCompany?: string;
  rating?: number;
  linkUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function getPublicSocialProofs(): Promise<SocialProof[]> {
  const base = getApiBase();
  const response = await fetch(`${base}/api/public/social-proofs`);
  if (!response.ok) {
    throw new Error('Failed to fetch social proofs');
  }
  return response.json();
}

export async function getSocialProofs(): Promise<SocialProof[]> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/social-proofs`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch social proofs');
  }
  return response.json();
}

export async function createSocialProof(data: Partial<SocialProof>): Promise<SocialProof> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/social-proofs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create social proof');
  }
  return response.json();
}

export async function updateSocialProof(id: number, data: Partial<SocialProof>): Promise<SocialProof> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/social-proofs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update social proof');
  }
  return response.json();
}

export async function deleteSocialProof(id: number): Promise<void> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/social-proofs/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to delete social proof');
  }
}
