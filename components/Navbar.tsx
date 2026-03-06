
import React, { useState } from 'react';
import { User, Page } from '../types';
import { LOGO_SVG } from '../constants';

interface NavbarProps {
  user: User | null;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onSearch: (query: string) => void;
  onLogout: () => void;
  onNavigate: (page: Page, userId?: string) => void;
  isSyncing?: boolean;
  currentPage: Page;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  isDarkMode,
  toggleDarkMode,
  onSearch, 
  onNavigate,
  currentPage
}) => {
  const [query, setQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const NavItem = ({ page, label }: { page: Page; label: string }) => (
    <button 
      onClick={() => onNavigate(page)}
      className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${
        currentPage === page 
          ? 'text-indigo-600' 
          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <nav className={`sticky top-0 z-50 w-full h-20 border-b transition-colors ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
    }`}>
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-12">
        {/* Left: Logo */}
        <div 
          className="flex items-center cursor-pointer group shrink-0"
          onClick={() => { onNavigate('home'); setQuery(''); }}
        >
          <div className="brightness-0 dark:brightness-200 scale-90 sm:scale-100">
            {LOGO_SVG}
          </div>
          <span className={`text-xl font-bold tracking-tight ml-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            StoryVerse
          </span>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by title, content, or @username..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch(e.target.value);
              }}
              className={`w-full py-2.5 px-5 pl-12 rounded-full text-xs outline-none border transition-all ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' 
                  : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white focus:border-indigo-200 focus:shadow-sm'
              }`}
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Mobile Search Icon */}
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>

          <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {isDarkMode ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
            ) : (
              <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
            )}
          </button>

          <div className="hidden lg:flex items-center gap-6 border-r dark:border-slate-800 pr-6">
            <NavItem page="home" label="Feed" />
            <NavItem page="bookmarks" label="Saved" />
            <NavItem page="create" label="Write" />
            <NavItem page="profile" label="Profile" />
          </div>

          {user ? (
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => onNavigate('profile')}
            >
              <img 
                src={user.avatar} 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-sm group-hover:ring-2 ring-indigo-500/20 transition-all" 
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-bold leading-none">{user.username}</span>
                <span className="text-[8px] font-black uppercase text-indigo-500 tracking-widest mt-1">{user.badge}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => onNavigate('login')}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button 
                onClick={() => onNavigate('register')}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
              >
                Join Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 p-4 border-b shadow-lg animate-in slide-in-from-top duration-200">
           <div className="relative">
            <input
              autoFocus
              type="text"
              placeholder="Search Verse..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch(e.target.value);
              }}
              className={`w-full py-3 px-5 pl-12 rounded-2xl text-xs outline-none border transition-all ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      )}
    </nav>
  );
};
