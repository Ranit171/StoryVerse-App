
import React from 'react';

export const BADGE_CONFIG = {
  Novice: { color: 'text-slate-400', bg: 'bg-slate-100', threshold: 0 },
  Bronze: { color: 'text-amber-600', bg: 'bg-amber-100', threshold: 5 },
  Silver: { color: 'text-slate-500', bg: 'bg-slate-200', threshold: 25 },
  Gold: { color: 'text-yellow-500', bg: 'bg-yellow-100', threshold: 100 },
  Platinum: { color: 'text-indigo-600', bg: 'bg-indigo-100', threshold: 500 },
};

export const LOGO_SVG = (
  <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3">
    <rect width="40" height="40" rx="10" fill="black" />
    <path 
      d="M27 13C27 13 24.5 13 21.5 16C18.5 19 15.5 27 15.5 27C15.5 27 23.5 24 26.5 21C29.5 18 27 13 27 13Z" 
      stroke="white" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M18.5 23.5L13.5 28.5" 
      stroke="white" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle cx="21.5" cy="18.5" r="1.2" fill="white" />
  </svg>
);
