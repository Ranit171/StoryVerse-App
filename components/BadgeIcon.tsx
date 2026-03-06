import React from 'react';
import { BadgeTier } from '../types';

interface BadgeIconProps {
  tier: BadgeTier;
  size?: 'sm' | 'md';
}

const COLORS = {
  [BadgeTier.NOVICE]: 'from-slate-500 to-slate-700 shadow-slate-900/40',
  [BadgeTier.BRONZE]: 'from-amber-600 to-amber-800 shadow-amber-900/40',
  [BadgeTier.SILVER]: 'from-slate-300 to-slate-500 shadow-slate-500/40',
  [BadgeTier.GOLD]: 'from-yellow-400 to-yellow-600 shadow-yellow-600/40',
  [BadgeTier.PLATINUM]: 'from-indigo-400 to-violet-600 shadow-indigo-600/40',
};

export const BadgeIcon: React.FC<BadgeIconProps> = ({ tier, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[8px]' : 'px-3 py-1 text-[10px]';
  
  return (
    <span className={`bg-gradient-to-br ${COLORS[tier]} text-white font-black rounded-md uppercase tracking-[0.2em] shadow-lg ${sizeClasses} ring-1 ring-white/20`}>
      {tier}
    </span>
  );
};