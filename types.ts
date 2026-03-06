
export type Page = 'home' | 'create' | 'login' | 'register' | 'my-stories' | 'profile' | 'bookmarks';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio?: string;
  bookmarks: string[];
  blockedUsers: string[];
  totalLikes: number;
  badge: BadgeTier;
  followerCount: number;
  followingCount: number;
  password?: string;
  reportCount?: number;
  bannedUntil?: string;
  settings?: {
    showReportCount: boolean;
    showStats: boolean;
  };
}

export enum BadgeTier {
  NOVICE = 'Novice',
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum'
}

export type ReportType = 'user' | 'post' | 'comment';

export interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  reportCount?: number;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  title: string;
  content: string;
  likes: number;
  likedBy: string[]; 
  comments: Comment[];
  shares: number;
  createdAt: string;
  userAvatar: string;
  reportCount?: number;
  lastEditedAt?: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system';
  message: string;
  title?: string;
}

export interface AppState {
  currentUser: User | null;
  posts: Post[];
  isDarkMode: boolean;
  searchQuery: string;
}
