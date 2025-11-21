import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AdminUser, Storyteller, Moderator, ModeratorActivity, BlockUserRequest, DeleteUserRequest, ModeratorRequest } from '../models/admin.model';
import { AuthService } from './auth.service';
import { EventBusService, EventType } from './event-bus.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private supabase: SupabaseClient;

  constructor(
    private authService: AuthService,
    private eventBus: EventBusService
  ) {
    this.supabase = this.authService.getSupabaseClient();
  }

  // ============ USER MANAGEMENT ============

  async getAllUsers(): Promise<AdminUser[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        profile_image_url,
        created_at,
        is_blocked,
        is_storyteller,
        story_count,
        is_moderator,
        last_login
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return data || [];
  }

  async getUserById(userId: string): Promise<AdminUser | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        profile_image_url,
        created_at,
        is_blocked,
        is_storyteller,
        story_count,
        is_moderator,
        last_login
      `)
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      throw error;
    }

    return data;
  }

  async blockUser(request: BlockUserRequest): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_blocked: true })
      .eq('id', request.user_id);

    if (error) {
      console.error('Error blocking user:', error);
      throw error;
    }

    // Log the action
    await this.logAdminAction('block_user', request.user_id, request.reason);

    // Publish event
    this.eventBus.publish({
      type: EventType.USER_BLOCKED,
      payload: { userId: request.user_id, reason: request.reason }
    });
  }

  async unblockUser(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_blocked: false })
      .eq('id', userId);

    if (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }

    await this.logAdminAction('unblock_user', userId);

    // Publish event
    this.eventBus.publish({
      type: EventType.USER_UNBLOCKED,
      payload: { userId }
    });
  }

  async deleteUser(request: DeleteUserRequest): Promise<void> {
    const currentUser = await this.supabase.auth.getUser();
    if (!currentUser.data.user) throw new Error('Not authenticated');

    // Soft delete user's stories first
    const { error: storiesError } = await this.supabase
      .from('stories')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser.data.user.id
      })
      .eq('author_id', request.user_id)
      .is('deleted_at', null);

    if (storiesError) {
      console.error('Error soft deleting user stories:', storiesError);
      throw storiesError;
    }

    // Soft delete profile
    const { error: profileError } = await this.supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser.data.user.id
      })
      .eq('id', request.user_id)
      .is('deleted_at', null);

    if (profileError) {
      console.error('Error soft deleting user profile:', profileError);
      throw profileError;
    }

    await this.logAdminAction('delete_user', request.user_id, request.reason);
  }

  // ============ STORYTELLER MANAGEMENT ============

  async getAllStorytellers(): Promise<Storyteller[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        storyteller_name,
        storyteller_bio,
        storyteller_photo_url,
        story_count,
        first_story_date,
        is_blocked
      `)
      .eq('is_storyteller', true)
      .is('deleted_at', null)
      .order('story_count', { ascending: false });

    if (error) {
      console.error('Error fetching storytellers:', error);
      throw error;
    }

    // Get story statistics for each storyteller
    const storytellers = await Promise.all((data || []).map(async (st: any) => {
      const stats = await this.getStorytellerStats(st.id);
      return {
        ...st,
        approved_stories: stats.approved,
        pending_stories: stats.pending,
        rejected_stories: stats.rejected
      };
    }));

    return storytellers;
  }

  async getStorytellerById(storytellerId: string): Promise<Storyteller | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        storyteller_name,
        storyteller_bio,
        storyteller_photo_url,
        story_count,
        first_story_date,
        is_blocked
      `)
      .eq('id', storytellerId)
      .eq('is_storyteller', true)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error fetching storyteller:', error);
      throw error;
    }

    const stats = await this.getStorytellerStats(storytellerId);
    
    return {
      ...data,
      approved_stories: stats.approved,
      pending_stories: stats.pending,
      rejected_stories: stats.rejected
    };
  }

  private async getStorytellerStats(storytellerId: string): Promise<{ approved: number, pending: number, rejected: number }> {
    const { data } = await this.supabase
      .from('stories')
      .select('status')
      .eq('author_id', storytellerId)
      .is('deleted_at', null);

    const approved = data?.filter((s: any) => s.status === 'approved').length || 0;
    const pending = data?.filter((s: any) => s.status === 'pending').length || 0;
    const rejected = data?.filter((s: any) => s.status === 'rejected').length || 0;

    return { approved, pending, rejected };
  }

  async blockStoryteller(storytellerId: string, reason?: string): Promise<void> {
    await this.blockUser({ user_id: storytellerId, reason });

    // Publish storyteller-specific event
    this.eventBus.publish({
      type: EventType.STORYTELLER_BLOCKED,
      payload: { storytellerId, reason }
    });
  }

  async deleteStoryteller(storytellerId: string, reason?: string): Promise<void> {
    await this.deleteUser({ user_id: storytellerId, reason });
  }

  async deleteStory(storyId: string): Promise<void> {
    const currentUser = await this.supabase.auth.getUser();
    if (!currentUser.data.user) throw new Error('Not authenticated');

    // Get story details before soft deleting
    const { data: story } = await this.supabase
      .from('stories')
      .select('author_id')
      .eq('id', storyId)
      .single();

    // Soft delete the story
    const { error } = await this.supabase
      .from('stories')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser.data.user.id
      })
      .eq('id', storyId)
      .is('deleted_at', null);

    if (error) {
      console.error('Error soft deleting story:', error);
      throw error;
    }

    await this.logAdminAction('delete_story', storyId);

    // Publish event
    this.eventBus.publish({
      type: EventType.STORY_DELETED,
      payload: { storyId, authorId: story?.author_id }
    });
  }

  // ============ MODERATOR MANAGEMENT ============

  async getAllModerators(): Promise<Moderator[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        profile_image_url,
        created_at
      `)
      .eq('is_moderator', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching moderators:', error);
      throw error;
    }

    // Get activity stats for each moderator
    const moderators = await Promise.all((data || []).map(async (mod: any) => {
      const activity = await this.getModeratorActivity(mod.id);
      const lastActivity = activity.length > 0 ? activity[0].action_date : undefined;
      
      return {
        ...mod,
        assigned_date: mod.created_at,
        stories_reviewed: activity.length,
        stories_approved: activity.filter(a => a.action === 'approved').length,
        stories_rejected: activity.filter(a => a.action === 'rejected').length,
        last_activity: lastActivity
      };
    }));

    return moderators;
  }

  async getModeratorActivity(moderatorId: string): Promise<ModeratorActivity[]> {
    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        id,
        title,
        status,
        reviewed_at,
        reviewed_by,
        author_id,
        profiles!stories_author_id_fkey(full_name)
      `)
      .eq('reviewed_by', moderatorId)
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching moderator activity:', error);
      throw error;
    }

    return (data || []).map((story: any) => ({
      id: story.id,
      moderator_id: moderatorId,
      story_id: story.id,
      action: story.status as 'approved' | 'rejected',
      action_date: story.reviewed_at || '',
      story_title: story.title,
      author_name: (story.profiles as any)?.full_name || 'Unknown'
    }));
  }

  async addModerator(request: ModeratorRequest): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_moderator: true })
      .eq('id', request.user_id);

    if (error) {
      console.error('Error adding moderator:', error);
      throw error;
    }

    await this.logAdminAction('add_moderator', request.user_id);
  }

  async removeModerator(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_moderator: false })
      .eq('id', userId);

    if (error) {
      console.error('Error removing moderator:', error);
      throw error;
    }

    await this.logAdminAction('remove_moderator', userId);
  }

  // ============ UTILITY METHODS ============

  async searchUsers(searchTerm: string): Promise<AdminUser[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        profile_image_url,
        created_at,
        is_blocked,
        is_storyteller,
        story_count,
        is_moderator,
        last_login
      `)
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error searching users:', error);
      throw error;
    }

    return data || [];
  }

  private async logAdminAction(action: string, targetUserId: string, reason?: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const { error } = await this.supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action,
        target_user_id: targetUserId,
        reason,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  }

  async isAdmin(): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const { data, error } = await this.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data?.is_admin || false;
  }
}
