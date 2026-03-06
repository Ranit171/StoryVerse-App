
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Post, User, Page, BadgeTier, Notification } from './types';
import { db } from './services/db';
import { Navbar } from './components/Navbar';
import { AuthForm } from './components/AuthForm';
import { CreatePostForm } from './components/CreatePostForm';
import { PostList } from './components/PostList';
import { Profile } from './components/Profile';
import { ToastContainer } from './components/ToastContainer';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-slate-950 text-slate-100';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-slate-50 text-slate-900';
    }
  }, [isDarkMode]);

  const addNotification = useCallback((notif: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotif = { ...notif, id };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.getPosts();
      setPosts(data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const user = db.getCurrentUser();
    if (user) {
      const refreshedUser = await db.refreshUser(user.id);
      if (refreshedUser) setCurrentUser(refreshedUser);
    }
  }, []);

  useEffect(() => {
    const user = db.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      refreshCurrentUser();
    }
    fetchPosts();

    // Listen for OAuth identity changes
    const { data: { subscription } } = db.onAuthChange((user) => {
      if (user) {
        setCurrentUser(user);
        addNotification({ type: 'system', message: `Welcome back, @${user.username}` });
        setCurrentPage('home');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPosts, refreshCurrentUser, addNotification]);

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (currentUser) {
      const blockedIds = currentUser.blockedUsers || [];
      result = result.filter(p => !blockedIds.includes(p.userId));
    }
    if (currentPage === 'my-stories' && currentUser) {
      result = result.filter(p => p.userId === currentUser.id);
    } else if (currentPage === 'bookmarks' && currentUser) {
      const bookmarkIds = currentUser.bookmarks || [];
      result = result.filter(p => bookmarkIds.includes(p.id));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.content.toLowerCase().includes(q) || 
        p.username.toLowerCase().includes(q)
      );
    }
    return result;
  }, [posts, searchQuery, currentPage, currentUser]);

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
    setCurrentPage('home');
    setViewingUser(null);
    addNotification({ type: 'system', message: 'Successfully logged out.' });
  };

  const handleNavigate = async (page: Page, userId?: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSearchQuery('');
    if (page === 'profile') {
      const id = userId || currentUser?.id;
      if (id) {
        setIsLoading(true);
        const userToView = await db.getUserById(id);
        setViewingUser(userToView);
        setCurrentPage('profile');
        setIsLoading(false);
      } else {
        setCurrentPage('login');
      }
    } else {
      setCurrentPage(page);
      setViewingUser(null);
    }
  };

  const handleUserUpdate = (updated: User) => {
    if (currentUser?.id === updated.id) setCurrentUser(updated);
    if (viewingUser?.id === updated.id) setViewingUser(updated);
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser) {
      setCurrentPage('login');
      return;
    }
    
    const isFollowing = await db.isFollowing(currentUser.id, targetUserId);
    const result = isFollowing 
      ? await db.unfollowUser(currentUser.id, targetUserId)
      : await db.followUser(currentUser.id, targetUserId);
    
    if (result.follower) setCurrentUser(result.follower);
    if (result.following) {
      if (viewingUser?.id === targetUserId) setViewingUser(result.following);
      addNotification({ 
        type: 'follow', 
        message: isFollowing ? `Unfollowed @${result.following.username}` : `Now following @${result.following.username}`,
        title: 'Connection Updated'
      });
    }
  };

  const getListHeader = () => {
    if (searchQuery) return { title: `Search Results`, description: `Displaying matches for "${searchQuery}".` };
    switch (currentPage) {
      case 'my-stories': return { title: 'My Narratives', description: 'Your personal collection of living stories.' };
      case 'bookmarks': return { title: 'Saved Stories', description: 'Stories you have preserved in your library.' };
      default: return { title: 'Discover the Verse', description: 'Where the world shares its hidden stories.' };
    }
  };

  const { title, description } = getListHeader();

  const BottomNavItem = ({ page, label, icon }: { page: Page; label: string; icon: React.ReactNode }) => (
    <button 
      onClick={() => handleNavigate(page)}
      className={`flex flex-col items-center gap-1 transition-all ${
        currentPage === page ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Navbar 
        user={currentUser} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onSearch={setSearchQuery}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        currentPage={currentPage}
      />
      
      <ToastContainer notifications={notifications} isDarkMode={isDarkMode} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-8 sm:pt-12 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className={`w-12 h-12 border-4 border-t-indigo-500 rounded-full animate-spin ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}></div>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {(currentPage === 'home' || currentPage === 'my-stories' || currentPage === 'bookmarks') && (
              <>
                <div className="text-center mb-10 sm:mb-16">
                  <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 tracking-tight px-2">{title}</h1>
                  <p className="text-[10px] sm:text-sm md:text-base text-slate-400 font-medium px-4">{description}</p>
                </div>
                <PostList 
                  posts={filteredPosts}
                  currentUser={currentUser}
                  isDarkMode={isDarkMode}
                  onPostUpdate={(upd) => setPosts(prev => prev.map(p => p.id === upd.id ? upd : p))}
                  onPostDeleted={fetchPosts}
                  onBookmarkToggle={handleUserUpdate}
                  onUserClick={(id) => handleNavigate('profile', id)}
                  onActionClick={() => handleNavigate('create')}
                  onFollowToggle={handleFollowToggle}
                  notify={addNotification}
                  title="" 
                  description=""
                />
              </>
            )}

            {currentPage === 'create' && currentUser && (
              <CreatePostForm currentUser={currentUser} isDarkMode={isDarkMode} onPostCreated={() => { fetchPosts(); setCurrentPage('home'); addNotification({ type: 'system', message: 'Your narrative has been published.' }); }} />
            )}

            {currentPage === 'profile' && viewingUser && (
              <Profile 
                user={viewingUser} 
                currentUser={currentUser} 
                posts={posts} 
                isDarkMode={isDarkMode} 
                onAccountDeleted={handleLogout} 
                onLogout={handleLogout} 
                onUserUpdate={handleUserUpdate} 
                onFollowToggle={handleFollowToggle}
                onUserClick={(id) => handleNavigate('profile', id)}
              />
            )}

            {(currentPage === 'login' || currentPage === 'register') && (
              <div className="max-w-md mx-auto pt-4 sm:pt-10">
                <AuthForm mode={currentPage} isDarkMode={isDarkMode} onAuthSuccess={(u) => { setCurrentUser(u); setCurrentPage('home'); addNotification({ type: 'system', message: `Welcome back, @${u.username}` }); }} onSwitchMode={setCurrentPage} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className={`hidden md:block w-full py-16 border-t text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            © 2026 StoryVerse Collective. Verified Global Sync.
          </p>
        </div>
      </footer>

      <div className={`md:hidden fixed bottom-0 left-0 w-full h-20 border-t z-50 flex items-center justify-around px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <BottomNavItem 
          page="home" 
          label="Feed" 
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} 
        />
        <BottomNavItem 
          page="bookmarks" 
          label="Saved" 
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>} 
        />
        <BottomNavItem 
          page="create" 
          label="Write" 
          icon={<div className="bg-indigo-600 text-white rounded-xl p-1.5"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></div>} 
        />
        <BottomNavItem 
          page="profile" 
          label="Me" 
          icon={currentUser ? (
            <img src={currentUser.avatar} className="w-6 h-6 rounded-lg object-cover ring-2 ring-transparent group-active:ring-indigo-600 transition-all" />
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          )} 
        />
      </div>
    </div>
  );
};

export default App;
