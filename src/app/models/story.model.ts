export interface Story {
  id?: string;
  title: string;
  content: string;
  story_type?: 'text' | 'audio';
  audio_url?: string;
  audio_duration?: number;
  cover_image_url?: string;
  description?: string;
  main_characters?: string[];
  genre?: string;
  language?: string;
  tags?: Tag[];
  locality_id: string;
  locality_name?: string;
  author_id: string;
  author_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  media_files?: MediaFile[];
  story_images?: StoryImage[];
  created_at?: Date;
  updated_at?: Date;
  moderated_at?: Date;
  moderator_id?: string;
  moderator_notes?: string;
}

export interface MediaFile {
  id?: string;
  story_id?: string;
  file_url: string;
  file_type: 'image' | 'video' | 'audio';
  file_name: string;
  file_size: number;
  created_at?: Date;
}

export interface Locality {
  id: string;
  name: string;
  state?: string;
  country?: string;
  created_at?: Date;
}

export interface Tag {
  id?: string;
  name: string;
  usage_count?: number;
  created_at?: Date;
}

export interface Genre {
  id: string;
  name: string;
  description?: string;
  created_at?: Date;
}

export interface StoryImage {
  id?: string;
  story_id?: string;
  image_url: string;
  image_caption?: string;
  image_order: number;
  file_size: number;
  file_name: string;
  created_at?: Date;
}
