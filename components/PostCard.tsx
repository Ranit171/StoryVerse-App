
import React, { useState, useMemo, useEffect } from 'react';
import { Post, User, BadgeTier, Notification } from '../types';
import { BadgeIcon } from './BadgeIcon';
import { db } from '../services/db';
import { EditPostModal } from './EditPostModal';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  isDarkMode: boolean;
  onPostUpdate: (post: Post) => void;
  onPostDeleted: () => void;
  onUserClick?: (userId: string) => void;
  onBookmarkToggle?: (updatedUser: User) => void;
  onFollowToggle?: (targetUserId: string) => void;
  notify?: (notif: Omit<Notification, 'id'>) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  currentUser, 
  isDarkMode,
  onPostUpdate, 
  onPostDeleted,
  onUserClick,
  onBookmarkToggle,
  onFollowToggle,
  notify
}) => {
  const [showComments, setShowComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [authorBadge, setAuthorBadge] = useState<BadgeTier>(BadgeTier.NOVICE);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showShareFeedback, setShowShareFeedback] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const isOwner = currentUser?.id === post.userId;
  const isBookmarked = currentUser?.bookmarks?.includes(post.id);
  const isLiked = currentUser ? post.likedBy?.includes(currentUser.id) : false;

  useEffect(() => {
    db.getUserById(post.userId).then(u => u && setAuthorBadge(u.badge));
    if (currentUser && !isOwner) {
      db.isFollowing(currentUser.id, post.userId).then(setIsFollowing);
    }
  }, [post.userId, currentUser, isOwner]);

  const handleLike = async () => {
    if (!currentUser) return;
    const hasLiked = post.likedBy?.includes(currentUser.id);
    const updated = { 
      ...post, 
      likes: post.likes + (hasLiked ? -1 : 1), 
      likedBy: hasLiked ? post.likedBy.filter(id => id !== currentUser.id) : [...(post.likedBy || []), currentUser.id] 
    };
    onPostUpdate(updated);
    await db.updatePost(updated);
    await db.updateUserLikes(post.userId, hasLiked ? -1 : 1);
    
    if (notify) {
      notify({
        type: 'like',
        message: hasLiked ? `Like removed from "${post.title}"` : `You liked "${post.title}"`,
        title: hasLiked ? 'Activity' : 'New Interaction'
      });
    }
  };

  const handleFollowClick = async () => {
    if (!currentUser || !onFollowToggle || isFollowLoading) return;
    setIsFollowLoading(true);
    await onFollowToggle(post.userId);
    setIsFollowing(!isFollowing);
    setIsFollowLoading(false);
  };

  const handleShare = async () => {
    if (isSharing) return;
    const currentUrl = window.location.href.startsWith('http') 
      ? window.location.href 
      : window.location.origin;

    const shareData = {
      title: post.title,
      text: `Check out "${post.title}" by @${post.username} on StoryVerse!`,
      url: currentUrl,
    };

    setIsSharing(true);
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(currentUrl);
        setShowShareFeedback(true);
        setTimeout(() => setShowShareFeedback(false), 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className={`rounded-[2rem] border transition-all mb-6 overflow-hidden ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
    }`}>
      <div className="p-6 sm:p-8 md:p-10">
        <div className="flex items-start justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img 
              src={post.userAvatar} 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover cursor-pointer shadow-sm" 
              onClick={() => onUserClick?.(post.userId)}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5 sm:mb-1">
                <span className="font-bold text-xs sm:text-sm cursor-pointer" onClick={() => onUserClick?.(post.userId)}>@{post.username}</span>
                <BadgeIcon tier={authorBadge} />
                
                {!isOwner && currentUser && (
                  <button 
                    onClick={handleFollowClick}
                    disabled={isFollowLoading}
                    className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 sm:px-3 sm:py-1 rounded-full transition-all ${
                      isFollowing 
                        ? (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                        : 'text-indigo-600 hover:text-indigo-700'
                    }`}
                  >
                    {isFollowLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                <span>{new Date(post.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                <span>•</span>
                <span>READING NOW</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
            {showMenu && (
              <div className={`absolute right-0 top-10 w-44 rounded-2xl shadow-2xl border z-20 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <button onClick={() => { onUserClick?.(post.userId); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700">View Profile</button>
                {isOwner && (
                  <>
                    <button onClick={() => { setShowEditModal(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest border-t dark:border-slate-700">Edit Story</button>
                    <button onClick={async () => { await db.deletePost(post.id); onPostDeleted(); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 border-t dark:border-slate-700">Delete</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-6 leading-tight">{post.title}</h3>
        
        <div 
          className={`rich-content text-sm sm:text-base leading-relaxed mb-4 sm:mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} ${isExpanded ? '' : 'line-clamp-[8]'}`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 sm:mb-10 flex items-center gap-1 hover:underline group">
          {isExpanded ? 'Collapse Story ↑' : 'Read Full Story ↓'}
        </button>

        <div className="flex items-center justify-between pt-4 sm:pt-8 border-t dark:border-slate-800">
          <div className="flex items-center gap-6 sm:gap-8">
            <button onClick={handleLike} className={`flex items-center gap-1.5 sm:gap-2.5 text-xs font-bold transition-all ${isLiked ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}>
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'fill-none stroke-current'}`} strokeWidth="2" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              <span className={isLiked ? 'text-red-500' : ''}>{post.likes}</span>
            </button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 sm:gap-2.5 text-xs font-bold text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              <span>{post.comments.length}</span>
            </button>
            <button 
              onClick={handleShare}
              disabled={isSharing}
              className={`flex items-center gap-1 relative transition-all group ${showShareFeedback ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-500'} disabled:opacity-50`}
              title="Share Story"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
              {showShareFeedback && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase bg-indigo-600 text-white px-3 py-1.5 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 z-10 whitespace-nowrap">
                  Link Copied!
                </span>
              )}
            </button>
          </div>
          <button onClick={async () => {
             const updated = await db.toggleBookmark(currentUser!.id, post.id);
             if (updated && onBookmarkToggle) {
               onBookmarkToggle(updated);
               if (notify) notify({ type: 'system', message: updated.bookmarks.includes(post.id) ? 'Story saved to library.' : 'Story removed from library.' });
             }
          }} className={`p-1 transition-all ${isBookmarked ? 'text-indigo-500 scale-110' : 'text-slate-300 hover:text-slate-500'}`}>
            <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${isBookmarked ? 'fill-current' : 'fill-none stroke-current'}`} strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          </button>
        </div>
      </div>
      
      {showComments && (
        <div className={`p-6 sm:p-8 border-t dark:border-slate-800 animate-in slide-in-from-top duration-300 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
            {post.comments.map(c => (
              <div key={c.id} className="flex gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center text-indigo-600 text-[10px] font-black shrink-0">{c.username[0].toUpperCase()}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] sm:text-xs font-bold">@{c.username}</p>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
            {post.comments.length === 0 && <p className="text-center text-[10px] text-slate-400 italic py-4">No responses yet.</p>}
          </div>
          {currentUser && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const text = (e.target as any).reply.value;
              if (!text.trim() || !currentUser) return;
              const comm = { id: Math.random().toString(36).substr(2, 9), userId: currentUser.id, username: currentUser.username, content: text, createdAt: new Date().toISOString() };
              await db.addComment(post.id, comm);
              onPostUpdate({ ...post, comments: [...post.comments, comm] });
              (e.target as any).reply.value = '';
              if (notify) notify({ type: 'comment', message: 'Your response was published.', title: 'Comment Posted' });
            }} className="flex gap-2 sm:gap-3">
              <input name="reply" placeholder="Add response..." className={`flex-1 px-4 py-2.5 rounded-xl text-xs border outline-none transition-all ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-200'}`} />
              <button type="submit" className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Reply</button>
            </form>
          )}
        </div>
      )}
      {showEditModal && <EditPostModal post={post} isDarkMode={isDarkMode} onClose={() => setShowEditModal(false)} onUpdate={onPostUpdate} />}
    </div>
  );
};
