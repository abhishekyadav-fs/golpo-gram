export interface Storyteller {
  id: string;
  full_name: string;
  storyteller_name: string;
  storyteller_bio?: string;
  storyteller_photo_url?: string;
  story_count: number;
  first_story_date?: Date;
  created_at?: Date;
}
