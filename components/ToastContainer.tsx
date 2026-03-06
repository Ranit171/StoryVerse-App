
import React from 'react';
import { Notification } from '../types';

interface ToastProps {
  notifications: Notification[];
  isDarkMode: boolean;
}

export const ToastContainer: React.FC<ToastProps> = ({ notifications, isDarkMode }) => {
  return (
    <div className="fixed top-24 right-4 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      {notifications.map((n) => (
        <div 
          key={n.id}
          className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right-8 duration-300 backdrop-blur-md ${
            isDarkMode 
              ? 'bg-slate-900/90 border-slate-800 text-white' 
              : 'bg-white/90 border-slate-100 text-slate-900'
          }`}
        >
          <div className={`mt-1 flex shrink-0 items-center justify-center w-8 h-8 rounded-xl ${
            n.type === 'like' ? 'bg-red-500/10 text-red-500' :
            n.type === 'comment' ? 'bg-indigo-500/10 text-indigo-500' :
            n.type === 'follow' ? 'bg-emerald-500/10 text-emerald-500' :
            'bg-slate-500/10 text-slate-500'
          }`}>
            {n.type === 'like' && <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>}
            {n.type === 'comment' && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>}
            {n.type === 'follow' && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
            {n.type === 'system' && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          </div>
          <div className="flex-1">
            {n.title && <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{n.title}</p>}
            <p className="text-xs font-bold leading-tight">{n.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
