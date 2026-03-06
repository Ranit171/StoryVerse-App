
import { createClient } from '@supabase/supabase-js';
import { Post, User, BadgeTier, Comment, ReportType } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;

if (!isConfigured) {
  console.warn("StoryVerse: Supabase is not configured. Using mock data mode.");
} else {
  console.log("StoryVerse: Supabase connection established.");
}

const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder');
const SESSION_KEY = 'storyverse_session';

const MOCK_POSTS: Post[] = [
  {
    id: 'mock-1',
    userId: 'system',
    username: 'storyverse_guide',
    title: 'Welcome to the Verse',
    content: '<p>This is your space to share stories that matter. Connect your Supabase backend to start saving your own narratives and interacting with the community.</p><p>StoryVerse supports rich text, real-time engagement, and a dynamic badge system.</p>',
    likes: 42,
    likedBy: [],
    shares: 12,
    createdAt: new Date().toISOString(),
    userAvatar: 'https://picsum.photos/seed/guide/100',
    comments: [
      { id: 'c1', userId: 'u1', username: 'explorer', content: 'Excited to be here!', createdAt: new Date().toISOString() }
    ]
  },
  {
    id: 'mock-2',
    userId: 'system',
    username: 'creative_soul',
    title: 'The Art of Digital Storytelling',
    content: '<p>In the digital age, stories are no longer just text on a page. They are living, breathing entities that evolve with every like, comment, and share.</p><p>Use the AI assistant to help you find the right words when you get stuck.</p>',
    likes: 88,
    likedBy: [],
    shares: 24,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    userAvatar: 'https://picsum.photos/seed/soul/100',
    comments: []
  }
];

export const getBadge = (likes: number): BadgeTier => {
  if (likes >= 500) return BadgeTier.PLATINUM;
  if (likes >= 100) return BadgeTier.GOLD;
  if (likes >= 25) return BadgeTier.SILVER;
  if (likes >= 5) return BadgeTier.BRONZE;
  return BadgeTier.NOVICE;
};

export const db = {
  // --- Auth & Identity ---
  async register(username: string, email: string, password: string): Promise<{ success: boolean, user?: User, error?: string }> {
    if (!isConfigured) return { success: false, error: 'Backend not linked.' };
    
    const lowerEmail = email.toLowerCase().trim();
    if (!lowerEmail.endsWith('@gmail.com')) {
      return { success: false, error: 'Registration restricted to @gmail.com addresses only.' };
    }
    
    try {
      const userId = Math.random().toString(36).substr(2, 9);
      const userPayload = {
        id: userId,
        username: username.toLowerCase().trim(),
        email: lowerEmail,
        password: password,
        avatar: `https://picsum.photos/seed/${username}/100`,
        bio: '',
        bookmarks: [],
        blocked_users: [],
        total_likes: 0,
        badge: BadgeTier.NOVICE,
        report_count: 0
      };
      
      const { error } = await supabase.from('users').insert([userPayload]);
      if (error) {
        if (error.message.includes('unique constraint')) return { success: false, error: 'Username or Email already taken.' };
        return { success: false, error: error.message };
      }

      const user: User = {
        id: userId,
        username: userPayload.username,
        email: userPayload.email,
        avatar: userPayload.avatar,
        bio: '',
        bookmarks: [],
        blockedUsers: [],
        totalLikes: 0,
        badge: BadgeTier.NOVICE,
        followerCount: 0,
        followingCount: 0,
        reportCount: 0,
        settings: { showReportCount: true, showStats: true }
      };
      
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async login(identifier: string, password: string, method: 'username' | 'email'): Promise<{ success: boolean, user?: User, error?: string }> {
    if (!isConfigured) return { success: false, error: 'Backend not linked.' };
    const field = method === 'username' ? 'username' : 'email';
    try {
      const { data, error } = await supabase.from('users').select('*').ilike(field, identifier).eq('password', password).maybeSingle();
      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: 'Invalid credentials.' };
      const user = await this.refreshUser(data.id);
      return user ? { success: true, user } : { success: false, error: 'Session error.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async signInWithGoogle(): Promise<{ success: boolean, error?: string }> {
    if (!isConfigured) return { success: false, error: 'Backend not configured.' };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async handleOauthCallback(sbUser: any): Promise<User | null> {
    try {
      const { data: existingUser } = await supabase.from('users').select('*').eq('email', sbUser.email).maybeSingle();
      
      if (existingUser) {
        return await this.refreshUser(existingUser.id);
      }

      const username = sbUser.user_metadata?.full_name?.toLowerCase().replace(/\s/g, '') || sbUser.email.split('@')[0];
      const userId = sbUser.id; 
      const userPayload = {
        id: userId,
        username: username,
        email: sbUser.email,
        password: 'OAUTH_USER_' + Math.random().toString(36),
        avatar: sbUser.user_metadata?.avatar_url || `https://picsum.photos/seed/${username}/100`,
        bio: '',
        bookmarks: [],
        blocked_users: [],
        total_likes: 0,
        badge: BadgeTier.NOVICE,
        report_count: 0
      };
      
      await supabase.from('users').insert([userPayload]);
      return await this.refreshUser(userId);
    } catch (err) {
      console.error("OAuth sync error:", err);
      return null;
    }
  },

  onAuthChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && !this.getCurrentUser()) {
        const user = await this.handleOauthCallback(session.user);
        if (user) callback(user);
      }
    });
  },

  async updateUserProfile(userId: string, data: { username?: string; avatar?: string; bio?: string }): Promise<User | null> {
    if (!isConfigured || !userId) return null;
    try {
      const updatePayload: any = {};
      if (data.username !== undefined) updatePayload.username = data.username.toLowerCase();
      if (data.avatar !== undefined) updatePayload.avatar = data.avatar;
      if (data.bio !== undefined) updatePayload.bio = data.bio;

      await supabase.from('users').update(updatePayload).eq('id', userId);

      if (data.username || data.avatar) {
        const postUpdate: any = {};
        if (data.username) postUpdate.username = data.username.toLowerCase();
        if (data.avatar) postUpdate.user_avatar = data.avatar;
        await supabase.from('posts').update(postUpdate).eq('user_id', userId);
      }

      return await this.refreshUser(userId);
    } catch (err) {
      return null;
    }
  },

  // --- Blocking System ---
  async blockUser(userId: string, targetId: string): Promise<User | null> {
    if (!isConfigured || !userId || !targetId) return null;
    try {
      const { data, error } = await supabase.from('users').select('blocked_users').eq('id', userId).maybeSingle();
      if (error) throw error;
      
      let blockedList = Array.isArray(data?.blocked_users) ? data.blocked_users : [];
      if (!blockedList.includes(targetId)) {
        blockedList = [...blockedList, targetId];
        const { error: updateError } = await supabase.from('users').update({ blocked_users: blockedList }).eq('id', userId);
        if (updateError) throw updateError;
      }
      return await this.refreshUser(userId);
    } catch (err) {
      console.error("blockUser failed:", err);
      return null;
    }
  },

  async unblockUser(userId: string, targetId: string): Promise<User | null> {
    if (!isConfigured || !userId || !targetId) return null;
    try {
      const { data, error } = await supabase.from('users').select('blocked_users').eq('id', userId).maybeSingle();
      if (error) throw error;
      
      let blockedList = Array.isArray(data?.blocked_users) ? data.blocked_users : [];
      const newBlockedList = blockedList.filter((id: string) => id !== targetId);
      
      const { error: updateError } = await supabase.from('users').update({ blocked_users: newBlockedList }).eq('id', userId);
      if (updateError) throw updateError;
      
      return await this.refreshUser(userId);
    } catch (err) {
      console.error("unblockUser failed:", err);
      return null;
    }
  },

  // --- Posts & Content ---
  async getPosts(): Promise<Post[]> {
    if (!isConfigured) return MOCK_POSTS;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, comments (*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const posts = (data || []).map(post => ({
        id: post.id,
        userId: post.user_id,
        username: post.username,
        title: post.title,
        content: post.content,
        likes: post.likes || 0,
        likedBy: Array.isArray(post.liked_by) ? post.liked_by : [],
        shares: post.shares || 0,
        createdAt: post.created_at,
        userAvatar: post.user_avatar,
        reportCount: post.report_count || 0,
        lastEditedAt: post.last_edited_at,
        comments: (post.comments || []).map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          username: c.username,
          content: c.content,
          createdAt: c.created_at,
          reportCount: c.report_count || 0
        }))
      }));

      return posts.length > 0 ? posts : MOCK_POSTS;
    } catch (err) {
      console.error("getPosts failed:", err);
      return MOCK_POSTS;
    }
  },

  async savePost(post: Post): Promise<void> {
    const user = this.getCurrentUser();
    if (this.isBanned(user)) throw new Error("Suspended account.");
    if (!isConfigured) return;
    await supabase.from('posts').insert([{
      id: post.id,
      user_id: post.userId,
      username: post.username,
      title: post.title,
      content: post.content,
      likes: post.likes,
      liked_by: post.likedBy,
      shares: post.shares,
      user_avatar: post.userAvatar,
      created_at: post.createdAt,
      report_count: 0
    }]);
  },

  async updatePost(updatedPost: Post): Promise<void> {
    if (!isConfigured) return;
    await supabase.from('posts').update({
      likes: updatedPost.likes,
      liked_by: updatedPost.likedBy,
      shares: updatedPost.shares,
      title: updatedPost.title,
      content: updatedPost.content
    }).eq('id', updatedPost.id);
  },

  async updatePostContent(postId: string, title: string, content: string): Promise<boolean> {
    if (!isConfigured) return false;
    try {
      const { error } = await supabase.from('posts').update({
        title,
        content,
        last_edited_at: new Date().toISOString()
      }).eq('id', postId);
      return !error;
    } catch {
      return false;
    }
  },

  async deletePost(postId: string): Promise<{ success: boolean, error?: string }> {
    if (!isConfigured) return { success: false };
    try {
      await supabase.from('comments').delete().eq('post_id', postId);
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async addComment(postId: string, comment: Comment): Promise<void> {
    const user = this.getCurrentUser();
    if (this.isBanned(user)) throw new Error("Suspended account.");
    if (!isConfigured) return;
    await supabase.from('comments').insert([{
      id: comment.id,
      post_id: postId,
      user_id: comment.userId,
      username: comment.username,
      content: comment.content,
      created_at: comment.createdAt,
      report_count: 0
    }]);
  },

  // --- Global Utility ---
  async getUserById(userId: string): Promise<User | null> {
    if (!isConfigured || !userId) return null;
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (error || !data) return null;
      const stats = await this.getFollowStats(data.id);
      return {
        id: data.id,
        username: data.username,
        email: data.email,
        avatar: data.avatar,
        bio: data.bio || '',
        bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
        blockedUsers: Array.isArray(data.blocked_users) ? data.blocked_users : [],
        totalLikes: data.total_likes || 0,
        badge: (data.badge as BadgeTier) || BadgeTier.NOVICE,
        followerCount: stats.followers,
        followingCount: stats.following,
        reportCount: data.report_count || 0,
        bannedUntil: data.banned_until,
        settings: { showReportCount: true, showStats: true }
      };
    } catch (err) {
      console.error("getUserById error:", err);
      return null;
    }
  },

  async refreshUser(userId: string): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  getCurrentUser(): User | null {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  },

  async toggleBookmark(userId: string, postId: string): Promise<User | null> {
    if (!isConfigured || !userId) return null;
    try {
      const { data: user } = await supabase.from('users').select('bookmarks').eq('id', userId).maybeSingle();
      if (!user) return null;
      let bookmarks = Array.isArray(user.bookmarks) ? user.bookmarks : [];
      const newBookmarks = bookmarks.includes(postId)
        ? bookmarks.filter((id: string) => id !== postId)
        : [...bookmarks, postId];
      await supabase.from('users').update({ bookmarks: newBookmarks }).eq('id', userId);
      return await this.refreshUser(userId);
    } catch (err) {
      return null;
    }
  },

  async updateUserLikes(userId: string, delta: number): Promise<void> {
    if (!isConfigured) return;
    const { data: dbUser } = await supabase.from('users').select('total_likes').eq('id', userId).maybeSingle();
    if (!dbUser) return;
    const newTotalLikes = Math.max(0, (dbUser.total_likes || 0) + delta);
    const newBadge = getBadge(newTotalLikes);
    await supabase.from('users').update({ total_likes: newTotalLikes, badge: newBadge }).eq('id', userId);
  },

  async updateUserSettings(userId: string, settings: any): Promise<User | null> {
    if (!isConfigured || !userId) return null;
    try {
      const user = this.getCurrentUser();
      if (user && user.id === userId) {
        user.settings = settings;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
      return await this.refreshUser(userId);
    } catch (err) {
      return null;
    }
  },

  async reportEntity(reporterId: string, targetType: ReportType, targetId: string, reason: string): Promise<{ success: boolean, message: string }> {
    if (!isConfigured) return { success: false, message: 'Backend not configured.' };
    try {
      const alreadyReported = await this.hasAlreadyReported(reporterId, targetType, targetId);
      if (alreadyReported) return { success: false, message: 'Already reported.' };
      let table = targetType === 'user' ? 'users' : (targetType === 'post' ? 'posts' : 'comments');
      await supabase.from('reports').insert([{ id: Math.random().toString(36).substr(2, 9), reporter_id: reporterId, target_type: targetType, target_id: targetId, reason }]);
      const { data } = await supabase.from(table).select('report_count').eq('id', targetId).maybeSingle();
      const newCount = (data?.report_count || 0) + 1;
      await supabase.from(table).update({ report_count: newCount }).eq('id', targetId);
      return { success: true, message: 'Report submitted.' };
    } catch {
      return { success: false, message: 'Error submitting report.' };
    }
  },

  async hasAlreadyReported(reporterId: string, targetType: ReportType, targetId: string): Promise<boolean> {
    const { data } = await supabase.from('reports').select('id').eq('reporter_id', reporterId).eq('target_type', targetType).eq('target_id', targetId).maybeSingle();
    return !!data;
  },

  async getFollowStats(userId: string): Promise<{ followers: number, following: number }> {
    try {
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId);
      return { followers: followers || 0, following: following || 0 };
    } catch { return { followers: 0, following: 0 }; }
  },

  async getFollowers(userId: string): Promise<User[]> {
    try {
      const { data } = await supabase.from('follows').select('follower_id').eq('following_id', userId);
      if (!data) return [];
      const ids = data.map(f => f.follower_id);
      if (ids.length === 0) return [];
      const users = await Promise.all(ids.map(id => this.getUserById(id)));
      return users.filter((u): u is User => u !== null);
    } catch { return []; }
  },

  async getFollowingList(userId: string): Promise<User[]> {
    try {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
      if (!data) return [];
      const ids = data.map(f => f.following_id);
      if (ids.length === 0) return [];
      const users = await Promise.all(ids.map(id => this.getUserById(id)));
      return users.filter((u): u is User => u !== null);
    } catch { return []; }
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase.from('follows').select('*').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle();
    return !!data;
  },

  async followUser(followerId: string, followingId: string): Promise<{ follower: User | null, following: User | null }> {
    await supabase.from('follows').insert([{ follower_id: followerId, following_id: followingId }]);
    return { follower: await this.refreshUser(followerId), following: await this.getUserById(followingId) };
  },

  async unfollowUser(followerId: string, followingId: string): Promise<{ follower: User | null, following: User | null }> {
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
    return { follower: await this.refreshUser(followerId), following: await this.getUserById(followingId) };
  },

  async deleteAccount(userId: string): Promise<{ success: boolean, error?: string }> {
    if (!isConfigured) return { success: false, error: 'Database connection lost.' };
    try {
      const { data: postsData } = await supabase.from('posts').select('id').eq('user_id', userId);
      const postIds = (postsData || []).map(p => p.id);
      
      if (postIds.length > 0) {
        await supabase.from('comments').delete().in('post_id', postIds);
        await supabase.from('reports').delete().eq('target_type', 'post').in('target_id', postIds);
      }
      
      await supabase.from('comments').delete().eq('user_id', userId);
      await supabase.from('posts').delete().eq('user_id', userId);
      await supabase.from('follows').delete().eq('follower_id', userId);
      await supabase.from('follows').delete().eq('following_id', userId);
      await supabase.from('reports').delete().eq('reporter_id', userId);
      await supabase.from('reports').delete().eq('target_type', 'user').eq('target_id', userId);
      
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      
      this.logout();
      return { success: true };
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      return { success: false, error: err.message || 'Deletion failed due to database constraints.' };
    }
  },

  isBanned(user: User | null): boolean {
    if (!user || !user.bannedUntil) return false;
    return new Date(user.bannedUntil) > new Date();
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    supabase.auth.signOut();
  }
};
