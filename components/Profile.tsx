
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Post } from '../types';
import { BadgeIcon } from './BadgeIcon';
import { db } from '../services/db';
import { ReportModal } from './ReportModal';

interface ProfileProps {
  user: User;
  currentUser: User | null;
  posts: Post[];
  isDarkMode: boolean;
  onAccountDeleted: () => void;
  onLogout: () => void;
  onUserUpdate: (updatedUser: User) => void;
  onBlockToggle?: (targetUserId: string) => void;
  onFollowToggle?: (targetUserId: string) => void;
  onUserClick?: (userId: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ 
  user, 
  currentUser, 
  posts, 
  isDarkMode, 
  onAccountDeleted, 
  onLogout,
  onUserUpdate,
  onBlockToggle,
  onFollowToggle,
  onUserClick
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [editBio, setEditBio] = useState(user.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [isImportingLink, setIsImportingLink] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  const [showReportModal, setShowReportModal] = useState(false);
  const [hasReportedUser, setHasReportedUser] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedDetails, setBlockedDetails] = useState<User[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  const [settings, setSettings] = useState(user.settings || { showReportCount: true, showStats: true });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Connection Lists
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [followingList, setFollowingList] = useState<User[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');

  const isOwnProfile = currentUser?.id === user.id;
  const userPosts = posts.filter(p => p.userId === user.id);
  const totalReceivedLikes = userPosts.reduce((acc, post) => acc + post.likes, 0);

  const isBlocked = useMemo(() => currentUser?.blockedUsers?.includes(user.id) || false, [currentUser, user.id]);

  useEffect(() => {
    if (!isEditingProfile) {
      setEditUsername(user.username);
      setEditAvatar(user.avatar);
      setEditBio(user.bio || '');
      setSettings(user.settings || { showReportCount: true, showStats: true });
      setEditError('');
      setIsImportingLink(false);
      setLinkInput('');
    }
    
    const checkReportStatus = async () => {
      if (currentUser && !isOwnProfile) {
        const reported = await db.hasAlreadyReported(currentUser.id, 'user', user.id);
        setHasReportedUser(reported);
        const following = await db.isFollowing(currentUser.id, user.id);
        setIsFollowing(following);
      }
    };
    checkReportStatus();

    const fetchConnections = async () => {
      setIsLoadingConnections(true);
      const [followers, following] = await Promise.all([
        db.getFollowers(user.id),
        db.getFollowingList(user.id)
      ]);
      setFollowersList(followers);
      setFollowingList(following);
      setIsLoadingConnections(false);
    };
    fetchConnections();
  }, [user.bio, user.username, user.avatar, user.settings, currentUser, isOwnProfile, user.id, isEditingProfile]);

  useEffect(() => {
    if (showBlockedModal && currentUser?.blockedUsers) {
      const fetchBlockedUsers = async () => {
        setIsLoadingBlocks(true);
        const details = await Promise.all(
          currentUser.blockedUsers.map(id => db.getUserById(id))
        );
        setBlockedDetails(details.filter((u): u is User => u !== null));
        setIsLoadingBlocks(false);
      };
      fetchBlockedUsers();
    }
  }, [showBlockedModal, currentUser?.blockedUsers]);

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      const result = await db.deleteAccount(user.id);
      if (result.success) {
        onAccountDeleted();
      } else {
        setDeleteError(result.error || 'Identity purge failed. Please try again later.');
        setIsDeleting(false);
        setShowConfirmDelete(false);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Account deletion failed.');
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleShuffleAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setEditAvatar(`https://picsum.photos/seed/${randomSeed}/400`);
    setIsImportingLink(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
        setIsImportingLink(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyLink = () => {
    if (linkInput.trim()) {
      setEditAvatar(linkInput.trim());
      setIsImportingLink(false);
      setLinkInput('');
    }
  };

  const handleBlockToggleAction = async (targetId?: string) => {
    const idToToggle = targetId || user.id;
    if (!currentUser || (idToToggle === currentUser.id && !targetId) || isBlockLoading) return;
    setIsBlockLoading(true);
    const isTargetBlocked = currentUser.blockedUsers?.includes(idToToggle);
    let updated = isTargetBlocked ? await db.unblockUser(currentUser.id, idToToggle) : await db.blockUser(currentUser.id, idToToggle);
    if (updated) {
      onUserUpdate(updated);
      if (onBlockToggle) onBlockToggle(idToToggle);
      if (isTargetBlocked) setBlockedDetails(prev => prev.filter(u => u.id !== idToToggle));
    }
    setIsBlockLoading(false);
  };

  const handleFollowClick = async () => {
    if (!currentUser || !onFollowToggle || isFollowLoading) return;
    setIsFollowLoading(true);
    await onFollowToggle(user.id);
    setIsFollowing(!isFollowing);
    setIsFollowLoading(false);
    // Refresh connections
    const updatedFollowers = await db.getFollowers(user.id);
    setFollowersList(updatedFollowers);
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) { setEditError("Username required"); return; }
    setIsSaving(true);
    const updated = await db.updateUserProfile(user.id, { username: editUsername, avatar: editAvatar, bio: editBio });
    if (updated) { 
      onUserUpdate(updated); 
      setIsEditingProfile(false); 
    } else {
      setEditError("Username taken or update failed.");
    }
    setIsSaving(false);
  };

  const handleToggleSetting = async (key: 'showReportCount' | 'showStats') => {
    if (!isOwnProfile) return;
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    setIsSavingSettings(true);
    const updated = await db.updateUserSettings(user.id, newSettings);
    if (updated) onUserUpdate(updated);
    setIsSavingSettings(false);
  };

  const ConnectionList = ({ users }: { users: User[] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {users.length === 0 ? (
        <p className="col-span-full text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-8">No narrative connections yet.</p>
      ) : (
        users.map(u => (
          <div 
            key={u.id} 
            onClick={() => onUserClick?.(u.id)}
            className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer hover:scale-[1.02] transition-all ${
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <img src={u.avatar} className="w-9 h-9 rounded-xl object-cover shadow-sm" />
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-[11px] font-bold leading-none truncate">@{u.username}</span>
              <div className="mt-1 transform scale-75 origin-left">
                <BadgeIcon tier={u.badge} />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-8 pb-20">
      <div className={`p-8 md:p-12 rounded-[2.5rem] border transition-all relative text-center flex flex-col items-center ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 shadow-xl text-slate-900'
      }`}>
        {isOwnProfile && (
          <button onClick={onLogout} className="absolute top-8 right-8 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">Logout</button>
        )}

        {isEditingProfile ? (
          <div className="w-full space-y-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-serif font-bold italic">Identity Refining</h2>
            
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img src={editAvatar} className="w-32 h-32 rounded-[2.5rem] object-cover shadow-2xl ring-4 ring-indigo-500/10" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-[2.5rem] flex items-center justify-center transition-all">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Upload Photo</span>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-indigo-600'}`}>Select Photo</button>
                  <button type="button" onClick={handleShuffleAvatar} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-indigo-600'}`}>Shuffle Random</button>
                  <button type="button" onClick={() => setIsImportingLink(!isImportingLink)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isImportingLink ? 'bg-indigo-600 border-indigo-600 text-white' : (isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-indigo-600')}`}>Import Link</button>
                </div>

                {isImportingLink && (
                  <div className="w-full max-w-sm mt-2">
                    <div className="flex gap-2">
                      <input type="url" placeholder="Paste image URL..." value={linkInput} onChange={(e) => setLinkInput(e.target.value)} className={`flex-1 p-3 text-xs rounded-xl border outline-none focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                      <button onClick={handleApplyLink} className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Apply</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full max-w-sm space-y-4 text-left">
                {editError && <p className="text-[10px] font-bold text-red-500 uppercase text-center">{editError}</p>}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Username</label>
                  <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} className={`w-full p-4 text-sm rounded-2xl border outline-none focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Bio</label>
                  <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} maxLength={160} rows={3} className={`w-full p-4 text-sm rounded-2xl border resize-none outline-none focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 max-w-sm mx-auto">
              <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl disabled:opacity-50">Save Profile</button>
              <button onClick={() => setIsEditingProfile(false)} className={`flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="relative group mb-8">
              <img src={user.avatar} className={`w-32 h-32 md:w-40 md:h-40 rounded-[3rem] object-cover shadow-2xl ring-4 ${isDarkMode ? 'ring-slate-800' : 'ring-indigo-50'}`} alt={user.username} />
              {isOwnProfile && (
                <button onClick={() => setIsEditingProfile(true)} className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border dark:border-slate-700 hover:scale-110 transition-all">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              )}
            </div>
            
            <h1 className="text-3xl font-serif font-bold mb-3">@{user.username}</h1>
            <div className="mb-6">
              <BadgeIcon tier={user.badge} size="md" />
            </div>

            {currentUser && !isOwnProfile && (
              <div className="mb-10 flex gap-4">
                <button 
                  onClick={handleFollowClick}
                  disabled={isFollowLoading}
                  className={`px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                    isFollowing 
                      ? (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500') 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isFollowLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
                </button>
                <button 
                  onClick={() => handleBlockToggleAction()}
                  disabled={isBlockLoading}
                  className={`px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                    isBlocked ? 'bg-red-500 border-red-500 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500'
                  }`}
                >
                  {isBlocked ? 'Blocked' : 'Block'}
                </button>
              </div>
            )}

            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-10 leading-relaxed font-medium">
              {user.bio || (isOwnProfile ? "You haven't told your story yet." : "This verse is waiting for a narrative.")}
            </p>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-8" />
            
            <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
              <div className="text-center px-2">
                <p className="text-3xl font-bold tabular-nums">{userPosts.length}</p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Stories</p>
              </div>
              <div className="text-center px-2 border-x dark:border-slate-800">
                <p className="text-3xl font-bold tabular-nums">{totalReceivedLikes}</p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Likes</p>
              </div>
              <div className="text-center px-2">
                <p className="text-3xl font-bold tabular-nums">{user.followerCount}</p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Followers</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Lists Section */}
      <div className={`p-8 md:p-10 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-bold italic mb-4">The Collective Network</h2>
          <div className="flex justify-center gap-6">
            <button 
              onClick={() => setActiveTab('followers')}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'followers' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Followers ({followersList.length})
            </button>
            <button 
              onClick={() => setActiveTab('following')}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'following' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Following ({followingList.length})
            </button>
          </div>
        </div>

        {isLoadingConnections ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <ConnectionList users={activeTab === 'followers' ? followersList : followingList} />
        )}
      </div>

      {isOwnProfile && (
        <div className={`p-8 md:p-10 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
          <h2 className="font-serif text-2xl font-bold mb-8 italic">Account Preferences</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between group cursor-pointer" onClick={() => handleToggleSetting('showStats')}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1">Public Statistics</p>
                <p className="text-[10px] text-slate-400 font-medium">Show stories, likes, and follower counts.</p>
              </div>
              <button className={`w-12 h-6 rounded-full relative transition-all shadow-inner ${settings.showStats ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${settings.showStats ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between group cursor-pointer pt-6 border-t dark:border-slate-800" onClick={() => setShowBlockedModal(true)}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1">Blocked Accounts</p>
                <p className="text-[10px] text-slate-400 font-medium">Manage restricted users in your feed.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {currentUser?.blockedUsers?.length || 0}
                </span>
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>

            <div className="pt-10 flex flex-col items-center">
              {deleteError && <p className="text-[10px] font-bold text-red-500 uppercase mb-4 animate-in fade-in">{deleteError}</p>}
              {!showConfirmDelete ? (
                <button onClick={() => setShowConfirmDelete(true)} className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-600 transition-colors">Terminate Account</button>
              ) : (
                <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-2 duration-300">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-tight">Confirm permanent identity purge?</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={handleDeleteAccount} 
                      disabled={isDeleting} 
                      className="px-6 py-2.5 bg-red-600 text-white rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-xl disabled:opacity-50"
                    >
                      {isDeleting ? 'Purging...' : 'Purge Identity'}
                    </button>
                    <button 
                      onClick={() => { setShowConfirmDelete(false); setDeleteError(''); }} 
                      disabled={isDeleting} 
                      className={`px-6 py-2.5 border rounded-2xl text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBlockedModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md bg-black/50 animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl font-bold">Blocked Accounts</h3>
              </div>
              <button onClick={() => setShowBlockedModal(false)} className="p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto p-6 space-y-4">
              {blockedDetails.length === 0 ? (
                <p className="text-center text-xs text-slate-400 italic py-8">No blocked users.</p>
              ) : (
                blockedDetails.map(blockedUser => (
                  <div key={blockedUser.id} className={`flex items-center justify-between p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <img src={blockedUser.avatar} className="w-10 h-10 rounded-2xl object-cover" />
                      <p className="text-xs font-bold">@{blockedUser.username}</p>
                    </div>
                    <button onClick={() => handleBlockToggleAction(blockedUser.id)} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-[9px] font-black uppercase border">Unblock</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showReportModal && <ReportModal targetType="user" targetId={user.id} onClose={() => setShowReportModal(false)} onSubmit={() => setHasReportedUser(true)} isDarkMode={isDarkMode} />}
    </div>
  );
};
