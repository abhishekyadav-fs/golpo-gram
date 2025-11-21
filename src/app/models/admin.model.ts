export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  profile_image_url?: string;
  created_at: string;
  is_blocked: boolean;
  is_storyteller: boolean;
  story_count?: number;
  is_moderator?: boolean;
  last_login?: string;
}

export interface Storyteller {
  id: string;
  full_name: string;
  storyteller_name: string;
  storyteller_bio?: string;
  storyteller_photo_url?: string;
  profile_image_url?: string;
  story_count: number;
  first_story_date: string;
  email: string;
  is_blocked: boolean;
  approved_stories: number;
  pending_stories: number;
  rejected_stories: number;
}

export interface Moderator {
  id: string;
  full_name: string;
  email: string;
  profile_image_url?: string;
  assigned_date: string;
  stories_reviewed: number;
  stories_approved: number;
  stories_rejected: number;
  last_activity?: string;
}

export interface ModeratorActivity {
  id: string;
  moderator_id: string;
  story_id: string;
  action: 'approved' | 'rejected';
  action_date: string;
  story_title: string;
  author_name: string;
}

export interface BlockUserRequest {
  user_id: string;
  reason?: string;
}

export interface DeleteUserRequest {
  user_id: string;
  reason?: string;
}

export interface ModeratorRequest {
  user_id: string;
}
