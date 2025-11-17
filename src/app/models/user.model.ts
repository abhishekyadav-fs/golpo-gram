export interface User {
  id: string;
  email: string;
  full_name: string;
  profile_image_url?: string;
  role_id: string;
  role_name?: 'user' | 'moderator' | 'admin';
  created_at: Date;
}

export interface Role {
  id: string;
  name: 'user' | 'moderator' | 'admin';
  description: string;
  created_at: Date;
}

export interface AuthResponse {
  user: User | null;
  session: any;
  error?: any;
}
