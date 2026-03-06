
import React, { useState } from 'react';
import { ReportType } from '../types';

interface ReportModalProps {
  targetType: ReportType;
  targetId: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isDarkMode: boolean;
}

const REASONS = [
  'Spam or misleading',
  'Harassment or hate speech',
  'Inappropriate content',
  'Intellectual property violation',
  'Self-harm or violence',
  'Other'
];

export const ReportModal: React.FC<ReportModalProps> = ({ targetType, onClose, onSubmit, isDarkMode }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!selectedReason) return;
    setIsSubmitting(true);
    onSubmit(selectedReason);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-100 text-slate-900'}`}>
        <h3 className="font-serif text-xl font-bold mb-2">Report {targetType}</h3>
        <p className="text-xs text-slate-500 mb-6 uppercase font-black tracking-widest">Help us keep StoryVerse safe.</p>
        
        <div className="space-y-2 mb-8">
          {REASONS.map(reason => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className={`w-full text-left p-3 text-xs rounded-xl transition-all border font-bold ${
                selectedReason === reason 
                  ? 'bg-red-500/10 border-red-500 text-red-500' 
                  : (isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-100 hover:bg-slate-50 text-slate-600')
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button 
            disabled={isSubmitting}
            onClick={onClose} 
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700"
          >
            Cancel
          </button>
          <button 
            disabled={!selectedReason || isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-red-600 text-white rounded-xl shadow-lg disabled:opacity-50 active:scale-95 transition-all"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};
