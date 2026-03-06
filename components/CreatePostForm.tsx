
import React, { useState, useRef } from 'react';
import { User, Post } from '../types';
import { db } from '../services/db';
import { aiService } from '../services/ai';

interface CreatePostFormProps {
  currentUser: User;
  isDarkMode: boolean;
  onPostCreated: () => void;
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ currentUser, isDarkMode, onPostCreated }) => {
  const [newTitle, setNewTitle] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const isBanned = db.isBanned(currentUser);

  const execCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value || '');
    if (editorRef.current) editorRef.current.focus();
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError('');
    
    const content = editorRef.current?.innerHTML || '';

    if (isBanned) {
      setError("Your account is currently suspended. You cannot publish stories.");
      return;
    }
    
    if (!content.trim() || content === '<br>') {
      setError("Please write something before publishing.");
      return;
    }

    const newPost: Post = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      username: currentUser.username,
      title: newTitle,
      content: content,
      likes: 0,
      likedBy: [],
      shares: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      userAvatar: currentUser.avatar
    };

    try {
      await db.savePost(newPost);
      setNewTitle('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      onPostCreated();
    } catch (err: any) {
      setError(err.message || "Failed to publish.");
    }
  };

  const handleFixGrammar = async () => {
    const text = editorRef.current?.innerText || '';
    if (!text.trim()) return;
    setIsAiLoading(true);
    setAiStatus('Refining...');
    try {
      const corrected = await aiService.fixGrammar(text);
      if (editorRef.current) editorRef.current.innerText = corrected;
      setAiStatus('Polished!');
    } catch (error) {
      setAiStatus('Offline');
    } finally {
      setIsAiLoading(false);
      setTimeout(() => setAiStatus(''), 3000);
    }
  };

  const handleGetSuggestion = async () => {
    const text = editorRef.current?.innerText || '';
    if (!text.trim()) return;
    setIsAiLoading(true);
    setAiStatus('Thinking...');
    try {
      const suggestion = await aiService.getSuggestion(newTitle, text);
      if (editorRef.current) {
        editorRef.current.innerHTML += " " + suggestion;
      }
      setAiStatus('Inspired!');
    } catch (error) {
      setAiStatus('Silent');
    } finally {
      setIsAiLoading(false);
      setTimeout(() => setAiStatus(''), 3000);
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-1">
      <h1 className="font-serif text-2xl md:text-4xl font-bold mb-6 md:mb-10 text-center italic">Craft Your Narrative</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-600 text-white rounded-2xl font-bold text-xs flex items-center gap-3 shadow-lg animate-in slide-in-from-top">
           <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           {error}
        </div>
      )}

      <form 
        onSubmit={handleCreatePost}
        className={`rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'} ${isBanned ? 'opacity-50' : ''}`}
      >
        {/* Toolbar */}
        <div className={`p-3 border-b flex flex-wrap items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <select 
            onChange={(e) => execCommand('fontName', e.target.value)}
            className={`px-2 py-1.5 text-[10px] font-bold rounded-lg outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}
          >
            <option value="Inter">Modern Sans</option>
            <option value="Playfair Display">Classic Serif</option>
            <option value="monospace">Tech Mono</option>
          </select>

          <select 
            onChange={(e) => execCommand('fontSize', e.target.value)}
            className={`px-2 py-1.5 text-[10px] font-bold rounded-lg outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}
            defaultValue="3"
          >
            <option value="1">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="7">Extra Large</option>
          </select>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          {[
            { cmd: 'bold', label: 'B', title: 'Bold' },
            { cmd: 'italic', label: 'I', title: 'Italic', class: 'italic' },
            { cmd: 'underline', label: 'U', title: 'Underline', class: 'underline' },
          ].map((tool) => (
            <button
              key={tool.cmd}
              type="button"
              title={tool.title}
              onClick={() => execCommand(tool.cmd)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'}`}
            >
              <span className={tool.class}>{tool.label}</span>
            </button>
          ))}

          <button
            type="button"
            title="Highlight"
            onClick={() => execCommand('hiliteColor', 'rgba(255, 255, 0, 0.4)')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'}`}
          >
            H
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            title="Bullets"
            onClick={() => execCommand('insertUnorderedList')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'}`}
          >
            •
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() => execCommand('insertOrderedList')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'}`}
          >
            1.
          </button>
          
          <div className="flex-1" />

          {aiStatus && (
            <span className={`text-[9px] font-black uppercase tracking-widest animate-pulse px-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {aiStatus}
            </span>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div>
            <input 
              required
              disabled={isBanned}
              type="text" 
              placeholder="Give your story a title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className={`w-full p-2 text-2xl md:text-3xl font-serif font-bold bg-transparent outline-none border-b border-transparent focus:border-indigo-500/30 transition-all ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            />
          </div>

          <div 
            ref={editorRef}
            contentEditable={!isBanned}
            placeholder="Write something unforgettable..."
            className={`w-full min-h-[300px] outline-none text-sm md:text-base leading-relaxed rich-editor ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          />
        </div>

        <div className={`p-4 border-t flex flex-col sm:flex-row gap-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          {!isBanned && (
            <div className="flex gap-2 flex-1">
              <button
                type="button"
                onClick={handleFixGrammar}
                disabled={isAiLoading}
                className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center justify-center gap-2 ${
                  isDarkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-white'
                }`}
              >
                ✨ AI Fix
              </button>
              <button
                type="button"
                onClick={handleGetSuggestion}
                disabled={isAiLoading}
                className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center justify-center gap-2 ${
                  isDarkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-white'
                }`}
              >
                 🖋️ AI Extend
              </button>
            </div>
          )}
          <button 
            type="submit"
            disabled={isBanned}
            className="flex-[1.5] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xl transition-all active:scale-[0.98] text-xs uppercase tracking-widest disabled:bg-slate-400"
          >
            {isBanned ? 'Publication Suspended' : 'Publish to Universe'}
          </button>
        </div>
      </form>
      <style>{`
        .rich-editor:empty:before {
          content: attr(placeholder);
          color: #94a3b8;
          font-style: italic;
        }
        .rich-editor ul { list-style-type: disc; padding-left: 20px; }
        .rich-editor ol { list-style-type: decimal; padding-left: 20px; }
        .rich-content ul { list-style-type: disc; padding-left: 20px; margin: 10px 0; }
        .rich-content ol { list-style-type: decimal; padding-left: 20px; margin: 10px 0; }
      `}</style>
    </section>
  );
};
