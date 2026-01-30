export interface Consent {
  id: number;
  user_id?: number;
  session_id?: string;
  type: 'cookies' | 'privacy' | 'marketing' | 'analytics';
  category?: 'necessary' | 'functional' | 'analytical' | 'marketing';
  necessary?: boolean;
  functional?: boolean;
  analytical?: boolean;
  marketing?: boolean;
  accepted: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

