
import React from 'react';
import { Post, User, Notification } from '../types';
import { PostCard } from './PostCard';

interface PostListProps {
  posts: Post[];
  currentUser: User | null;
  isDarkMode: boolean;
  onPostUpdate: (updatedPost: Post) => void;
  onPostDeleted: () => void;
  onActionClick: () => void;
  onUserClick?: (userId: string) => void;
  onFollowToggle?: (targetUserId: string) => void;
  onBookmarkToggle?: (updatedUser: User) => void;
  onBlockUser?: (targetUserId: string) => void;
  onClearSearch?: () => void;
  isSearchActive?: boolean;
  notify?: (notif: Omit<Notification, 'id'>) => void;
  title: string;
  description: string;
}

export const PostList: React.FC<PostListProps> = ({ 
  posts, 
  currentUser, 
  isDarkMode, 
  onPostUpdate, 
  onPostDeleted,
  onActionClick,
  onUserClick,
  onFollowToggle,
  onBookmarkToggle,
  onBlockUser,
  notify,
  title,
  description
}) => {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {title && (
        <div className="mb-12">
          <h1 className={`font-serif text-5xl font-bold tracking-tight mb-3 capitalize ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            {title}
          </h1>
          <p className={`text-sm md:text-base font-medium ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {description}
          </p>
        </div>
      )}

      {posts.length === 0 ? (
        <div className={`rounded-[2.5rem] p-12 text-center border-2 border-dashed transition-all ${
          isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <h2 className="text-xl font-serif font-bold mb-4">No stories found.</h2>
          <p className="text-xs mb-8 uppercase font-bold tracking-widest opacity-60">The verse is currently quiet.</p>
          <button 
            onClick={onActionClick}
            className="px-8 py-3 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all"
          >
            Start Narrating
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUser={currentUser} 
              isDarkMode={isDarkMode} 
              onPostUpdate={onPostUpdate}
              onPostDeleted={onPostDeleted}
              onUserClick={onUserClick}
              onBookmarkToggle={onBookmarkToggle}
              onFollowToggle={onFollowToggle}
              notify={notify}
            />
          ))}
        </div>
      )}
    </section>
  );
};
