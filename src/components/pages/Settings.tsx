import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getLocalDateString } from '../../types';
import { 
  Download, 
  Upload, 
  Trash2, 
  LogOut, 
  Sun, 
  Moon, 
  Save, 
  Sliders,
  Lock,
  KeyRound,
  ShieldAlert,
  Sparkles,
  User,
  RefreshCw
} from 'lucide-react';

const PRESET_AVATARS = [
  // Men
  { id: 'm1', name: 'James', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=James', category: 'Men' },
  { id: 'm2', name: 'Oliver', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver', category: 'Men' },
  { id: 'm3', name: 'Noah', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Noah', category: 'Men' },
  { id: 'm4', name: 'Ethan', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ethan', category: 'Men' },
  { id: 'm5', name: 'Liam', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Liam', category: 'Men' },
  { id: 'm6', name: 'Leo', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Leo', category: 'Men' },
  // Women
  { id: 'w1', name: 'Zoe', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe', category: 'Women' },
  { id: 'w2', name: 'Sophia', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophia', category: 'Women' },
  { id: 'w3', name: 'Emma', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Emma', category: 'Women' },
  { id: 'w4', name: 'Zaria', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zaria', category: 'Women' },
  { id: 'w5', name: 'Ava', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Ava', category: 'Women' },
  { id: 'w6', name: 'Maya', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Maya', category: 'Women' },
  // Artistic / Creative
  { id: 'c1', name: 'Felix', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', category: 'Artistic' },
  { id: 'c2', name: 'Ruby', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Ruby', category: 'Artistic' },
  { id: 'c3', name: 'Optimus', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Optimus', category: 'Artistic' },
  { id: 'c4', name: 'Matrix', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=Matrix', category: 'Artistic' }
];

export const Settings: React.FC = () => {
  const { 
    currentUser, 
    updateUserSetting, 
    deleteUser, 
    exportData, 
    importData,
    addToast
  } = useApp();

  // Settings states
  const [name, setName] = useState('');
  const [defaultExchangeRate, setDefaultExchangeRate] = useState('58.50');
  const [defaultWorkspace, setDefaultWorkspace] = useState('Living Core');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [avatar, setAvatar] = useState('');
  const [avatarCategory, setAvatarCategory] = useState<'All' | 'Men' | 'Women' | 'Artistic'>('All');
  const [customSeed, setCustomSeed] = useState('');

  // Change Password States
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  // Delete Account States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Logout verification states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState('');
  const [logoutError, setLogoutError] = useState('');

  // Load from context
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setDefaultExchangeRate(currentUser.defaultExchangeRate.toString());
      setDefaultWorkspace(currentUser.defaultWorkspace);
      setTheme(currentUser.theme);
      setAvatar(currentUser.avatar || '');
    }
  }, [currentUser]);

  // Handle Save settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateUserSetting({
      name: name.trim(),
      defaultExchangeRate: parseFloat(defaultExchangeRate) || 58.50,
      defaultWorkspace: defaultWorkspace.trim() || 'Living Core',
      theme,
      avatar
    });
  };

  // Switch dark mode directly
  const handleThemeChange = (selectedTheme: 'light' | 'dark') => {
    setTheme(selectedTheme);
    updateUserSetting({ theme: selectedTheme });
  };

  // Handle Backup File Upload
  const handleBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          importData(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Download Backup JSON
  const handleDownloadBackup = () => {
    const backupJson = exportData();
    if (!backupJson) return;

    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentUser?.name.replace(/\s+/g, '_')}_Backup_${getLocalDateString()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Backup JSON file downloaded successfully!', 'success');
  };

  // Handle Password Change
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Verify current password if user has one set
    if (currentUser.password && currentPasswordInput !== currentUser.password) {
      addToast('Incorrect current password.', 'error');
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      addToast('New password must be at least 4 characters.', 'error');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      addToast('New passwords do not match.', 'error');
      return;
    }

    updateUserSetting({ password: newPasswordInput.trim() });
    addToast('Password changed successfully!', 'success');
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  // Handle Account Deletion
  const handleDeleteAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (currentUser.password && deleteConfirmPassword.trim() !== currentUser.password) {
      setDeleteError('Incorrect password. Please try again.');
      return;
    }

    deleteUser(currentUser.id);
    setShowDeleteConfirm(false);
    setDeleteConfirmPassword('');
    setDeleteError('');
  };

  // Logout/Switch profile helper
  const handleLogout = () => {
    if (currentUser && currentUser.password) {
      setShowLogoutConfirm(true);
      setLogoutPassword('');
      setLogoutError('');
    } else {
      localStorage.removeItem('freelancer_last_user_id');
      window.location.reload();
    }
  };

  return (
    <div id="settings-page" className="max-w-3xl mx-auto space-y-6">
      
      {/* Profile & Default Settings Form */}
      <div className="glass-card rounded-2xl shadow-xs p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-500" /> Account & Default Settings
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          
          {/* Profile Avatar Selection Panel */}
          <div className="border-b border-gray-150 dark:border-white/5 pb-5 mb-5 space-y-4">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Select Profile Avatar / Icon
            </label>
            
            <div className="flex flex-col md:flex-row gap-5 items-start">
              {/* Active preview & seed generator */}
              <div className="flex sm:flex-row md:flex-col gap-4 items-center sm:items-start md:items-center shrink-0 w-full md:w-44 bg-gray-50/50 dark:bg-black/20 p-4 rounded-2xl border border-gray-150 dark:border-white/5 shadow-inner">
                <div className="relative group shrink-0">
                  <img
                    src={avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=default'}
                    alt="Current Avatar"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-black/40 border-2 border-emerald-500 shadow-md p-1 object-contain transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-emerald-550 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    Active
                  </span>
                </div>
                <div className="space-y-1.5 w-full text-left sm:text-left md:text-center min-w-0">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">
                    Custom Seed Creator
                  </h4>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    Type any name/word to render:
                  </p>
                  <input
                    type="text"
                    value={customSeed}
                    onChange={(e) => {
                      setCustomSeed(e.target.value);
                      if (e.target.value.trim()) {
                        setAvatar(`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(e.target.value.trim())}`);
                      }
                    }}
                    placeholder="e.g. Maria"
                    className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Presets and Category filter */}
              <div className="flex-1 space-y-3 w-full">
                {/* Category tabs */}
                <div className="flex gap-1 border-b border-gray-100 dark:border-white/5 pb-2">
                  {(['All', 'Men', 'Women', 'Artistic'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAvatarCategory(cat)}
                      className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                        avatarCategory === cat
                          ? 'bg-emerald-550 text-white shadow-sm'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Preset Avatars grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-40 overflow-y-auto pr-1">
                  {PRESET_AVATARS.filter(p => avatarCategory === 'All' || p.category === avatarCategory).map((preset) => {
                    const isSelected = avatar === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAvatar(preset.url);
                          setCustomSeed('');
                        }}
                        className={`relative p-1.5 rounded-xl bg-white dark:bg-black/30 border transition-all hover:scale-105 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 ring-2 ring-emerald-500/10'
                            : 'border-gray-150 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                        }`}
                        title={preset.name}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-10 h-10 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 bg-emerald-550 rounded-full w-3.5 h-3.5 flex items-center justify-center text-white shadow-xs">
                            <span className="text-[7px] font-black">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Profile Display Name
              </label>
              <input
                id="settings-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Default Workspace name
              </label>
              <input
                id="settings-workspace-input"
                type="text"
                required
                value={defaultWorkspace}
                onChange={(e) => setDefaultWorkspace(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none text-xs"
              />
            </div>

            {/* Theme switcher */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                UI Colour Theme
              </label>
              <div className="flex bg-white/20 dark:bg-white/5 p-1 rounded-xl border border-white/20 dark:border-white/5">
                <button
                  id="settings-theme-light"
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'light'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> Light Mode
                </button>
                <button
                  id="settings-theme-dark"
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-900 text-emerald-400 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> Dark Mode
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-white/20 dark:border-white/5">
            <button
              id="settings-save-btn"
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 transition-colors"
            >
              <Save className="w-4 h-4" /> Save Default Settings
            </button>
          </div>
        </form>
      </div>

      {/* Backup and Restore JSON Panel */}
      <div className="glass-card rounded-2xl shadow-xs p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
          Workspace Cloud Backup & JSON Migration
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 leading-relaxed">
          Export your entire workspace including clients, task histories, and earnings into a standard JSON file. You can restore this file on any other system later.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            id="download-backup-btn"
            onClick={handleDownloadBackup}
            className="p-5 border-2 border-dashed border-white/20 dark:border-white/10 hover:border-emerald-500/40 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 rounded-2xl bg-white/10 dark:bg-white/2 flex flex-col items-center gap-2.5 transition-all font-medium"
          >
            <Download className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <span className="text-xs font-bold block">Download Backup JSON</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block mt-0.5">Secure local save file</span>
            </div>
          </button>

          <label className="p-5 border-2 border-dashed border-white/20 dark:border-white/10 hover:border-emerald-500/40 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 rounded-2xl bg-white/10 dark:bg-white/2 flex flex-col items-center gap-2.5 cursor-pointer transition-all font-medium font-medium">
            <Upload className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <span className="text-xs font-bold block">Restore Backup JSON</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block mt-0.5">Upload .json save file</span>
            </div>
            <input
              id="upload-backup-file"
              type="file"
              accept=".json"
              onChange={handleBackupUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Security - Change Password */}
      <div className="glass-card rounded-2xl shadow-xs p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-emerald-500" /> Change Profile Password
        </h3>
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentUser?.password && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  id="settings-current-pwd-input"
                  type="password"
                  required
                  placeholder="Current Password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none text-xs font-mono"
                />
              </div>
            )}
            <div className={currentUser?.password ? "" : "sm:col-span-1"}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                id="settings-new-pwd-input"
                type="password"
                required
                placeholder="At least 4 chars"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none text-xs font-mono"
              />
            </div>
            <div className={currentUser?.password ? "" : "sm:col-span-1"}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                id="settings-confirm-pwd-input"
                type="password"
                required
                placeholder="Confirm password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end pt-3 border-t border-white/20 dark:border-white/5">
            <button
              id="settings-change-password-btn"
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 transition-colors"
            >
              <Lock className="w-4 h-4" /> Change Password
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="glass-card rounded-2xl shadow-xs p-6 border border-red-500/10 dark:border-red-500/5 bg-red-500/5">
        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> Danger Zone - Delete Account
        </h3>
        <p className="text-xs text-red-500/70 dark:text-red-400/60 mb-4 leading-relaxed">
          Permanently delete your profile, workspaces, clients, and all logged tasks. This action is irreversible and all your offline data will be wiped out instantly.
        </p>
        <div className="flex">
          <button
            id="settings-delete-account-btn"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeleteConfirmPassword('');
              setDeleteError('');
            }}
            className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shadow-red-500/10"
          >
            <Trash2 className="w-4 h-4" /> Delete My Profile Account
          </button>
        </div>
      </div>

      {/* Profiles & Actions */}
      <div className="glass-card rounded-2xl shadow-xs p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
          Session & Account Administration
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Exit your current active session securely. Your data remains fully saved locally.
        </p>

        <div className="flex gap-3">
          <button
            id="settings-logout-btn"
            onClick={handleLogout}
            className="w-full py-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
          >
            <LogOut className="w-4 h-4 text-gray-400" /> Switch Display Profile
          </button>
        </div>
      </div>

      {/* Settings Tab Logout Password Verification Modal */}
      {showLogoutConfirm && currentUser && (
        <div
          id="settings-logout-password-modal"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            id="settings-logout-password-content"
            className="glass-card w-full max-w-sm rounded-2xl shadow-xl p-6 bg-white dark:bg-gray-900"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-500" /> Confirm Profile Switch
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Please enter your password to switch profiles and exit <span className="font-bold text-emerald-600 dark:text-emerald-400">"{currentUser.name}"</span>.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!currentUser.password || currentUser.password === logoutPassword.trim()) {
                  localStorage.removeItem('freelancer_last_user_id');
                  window.location.reload();
                } else {
                  setLogoutError('Incorrect password. Please try again.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <input
                  id="settings-logout-pwd"
                  type="password"
                  required
                  autoFocus
                  placeholder="Profile Password"
                  value={logoutPassword}
                  onChange={(e) => {
                    setLogoutPassword(e.target.value);
                    setLogoutError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm font-mono"
                />
                {logoutError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5">{logoutError}</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  id="settings-cancel-logout"
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    setLogoutPassword('');
                    setLogoutError('');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="settings-confirm-logout"
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors shadow-sm shadow-rose-500/10"
                >
                  Verify & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Password Verification Modal */}
      {showDeleteConfirm && currentUser && (
        <div
          id="settings-delete-password-modal"
          className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            id="settings-delete-password-content"
            className="glass-card w-full max-w-sm rounded-2xl shadow-xl p-6 bg-white dark:bg-gray-900 border border-red-500/20"
          >
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Delete Profile permanently?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Please enter your password to permanently delete <span className="font-extrabold text-red-600">"{currentUser.name}"</span> and all logged data. This cannot be undone.
            </p>
            <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
              <div>
                <input
                  id="settings-delete-pwd-confirm"
                  type="password"
                  required
                  autoFocus
                  placeholder="Profile Password"
                  value={deleteConfirmPassword}
                  onChange={(e) => {
                    setDeleteConfirmPassword(e.target.value);
                    setDeleteError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-950/20 bg-red-500/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-mono"
                />
                {deleteError && (
                  <p className="text-xs text-red-500 font-semibold mt-1.5">{deleteError}</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  id="settings-cancel-delete"
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmPassword('');
                    setDeleteError('');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="settings-confirm-delete"
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-sm shadow-red-500/10"
                >
                  Delete Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
