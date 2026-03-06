
import React, { useState, useRef, useEffect } from 'react';
import { Post } from '../types';
import { aiService } from '../services/ai';
import { db } from '../services/db';

interface EditPostModalProps {
  post: Post;
  isDarkMode: boolean;
  onClose: () => void;
  onUpdate: (updatedPost: Post) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ post, isDarkMode, onClose, onUpdate }) => {
  const [title, setTitle] = useState(post.title);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = post.content;
    }
  }, [post.content]);

  const execCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value || '');
    if (editorRef.current) editorRef.current.focus();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = editorRef.current?.innerHTML || '';
    if (!title.trim() || !content.trim()) return;
    
    setIsSaving(true);
    const success = await db.updatePostContent(post.id, title, content);
    if (success) {
      onUpdate({ ...post, title, content, lastEditedAt: new Date().toISOString() });
      onClose();
    } else {
      alert("Failed to save changes. Please try again.");
    }
    setIsSaving(false);
  };

  const handleFixGrammar = async () => {
    const text = editorRef.current?.innerText || '';
    if (!text.trim()) return;
    setIsAiLoading(true);
    setAiStatus('Refining...');
    const corrected = await aiService.fixGrammar(text);
    if (editorRef.current) editorRef.current.innerText = corrected;
    setIsAiLoading(false);
    setAiStatus('Polished!');
    setTimeout(() => setAiStatus(''), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
      <div className={`w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-100 text-slate-900'}`}>
        
        <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <h2 className="font-serif font-bold italic px-4">Refining History</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className={`p-3 border-b flex flex-wrap items-center gap-1.5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
           <select 
            onChange={(e) => execCommand('fontName', e.target.value)}
            className={`px-2 py-1.5 text-[10px] font-bold rounded-lg outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}
          >
            <option value="Inter">Modern Sans</option>
            <option value="Playfair Display">Classic Serif</option>
            <option value="monospace">Tech Mono</option>
          </select>

          {[
            { cmd: 'bold', label: 'B', title: 'Bold' },
            { cmd: 'italic', label: 'I', title: 'Italic', class: 'italic' },
            { cmd: 'underline', label: 'U', title: 'Underline', class: 'underline' },
          ].map((tool) => (
            <button
              key={tool.cmd}
              type="button"
              onClick={() => execCommand(tool.cmd)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 border shadow-sm'}`}
            >
              <span className={tool.class}>{tool.label}</span>
            </button>
          ))}
          
          <button
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 border shadow-sm'}`}
          >
            •
          </button>
          
          <div className="flex-1" />
          
          {aiStatus && <span className="text-[9px] font-black uppercase text-indigo-500 mr-4">{aiStatus}</span>}
          <button
            type="button"
            onClick={handleFixGrammar}
            disabled={isAiLoading}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
          >
            {isAiLoading ? '...' : '✨ Polish'}
          </button>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto flex-1">
          <input 
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-6 text-2xl md:text-3xl font-serif font-bold bg-transparent outline-none border-b border-transparent focus:border-indigo-500/30"
          />
          <div 
            ref={editorRef}
            contentEditable
            className={`w-full min-h-[400px] outline-none text-sm md:text-base leading-relaxed rich-editor ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          />
        </div>

        <div className={`p-6 border-t flex gap-4 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <button onClick={onClose} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">Update Changes</button>
        </div>
      </div>
    </div>
  );
};
