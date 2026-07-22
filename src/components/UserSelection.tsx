import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User as UserIcon, Plus, ArrowRight, Lock } from 'lucide-react';
import { User } from '../types';
import { motion } from 'motion/react';

export const UserSelection: React.FC = () => {
  const { users, selectUser, createUser } = useApp();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [defaultExchangeRate] = useState('58.50');
  const [defaultWorkspace, setDefaultWorkspace] = useState('Living Core');
  
  // Unlock profile states
  const [unlockUser, setUnlockUser] = useState<User | null>(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPassword.trim()) return;
    createUser(
      newUserName.trim(),
      parseFloat(defaultExchangeRate) || 58.50,
      defaultWorkspace.trim() || 'Living Core',
      newUserPassword.trim()
    );
    setNewUserName('');
    setNewUserPassword('');
    setShowCreateForm(false);
  };

  const handleSelectUserClick = (user: User) => {
    if (user.password) {
      setUnlockUser(user);
      setUnlockPassword('');
      setUnlockError('');
    } else {
      // Fallback for users without a password set
      selectUser(user.id);
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockUser) return;
    
    if (unlockUser.password === unlockPassword.trim()) {
      selectUser(unlockUser.id);
      setUnlockUser(null);
      setUnlockPassword('');
    } else {
      setUnlockError('Incorrect password. Please try again.');
    }
  };

  return (
    <div id="user-selection-screen" className="min-h-screen flex items-center justify-center glass-container p-6 transition-colors duration-200">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 mb-4 shadow-sm border border-emerald-500/10">
            <UserIcon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            GYATLENDAR
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Choose a profile or create a new one to log your tasks and earnings.
          </p>
        </div>

        {/* Create Profile Form */}
        {showCreateForm ? (
          <motion.div
            id="create-profile-box"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl shadow-xl p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Profile
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Your Name
                </label>
                <input
                  id="profile-name-input"
                  type="text"
                  required
                  placeholder="e.g. Mark Christian"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Profile Password
                </label>
                <input
                  id="profile-password-input"
                  type="password"
                  required
                  placeholder="Enter secure password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Default Workspace
                </label>
                <input
                  id="profile-workspace-input"
                  type="text"
                  placeholder="Living Core"
                  value={defaultWorkspace}
                  onChange={(e) => setDefaultWorkspace(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  id="cancel-create-profile"
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-create-profile"
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors shadow-sm shadow-emerald-500/10"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Profiles Container */}
            <div className="glass-card rounded-2xl shadow-md p-6">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Select Profile ({users.length} / 2)
              </h2>

              {users.length === 0 ? (
                <div id="no-profiles" className="text-center py-8">
                  <p className="text-sm text-gray-400 dark:text-gray-600">No profiles created yet.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Click the button below to get started.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      id={`profile-card-${user.id}`}
                      className="group flex items-center justify-between p-3 rounded-xl border border-gray-200/50 dark:border-white/5 bg-white/60 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/10 transition-all cursor-pointer shadow-xs"
                      onClick={() => handleSelectUserClick(user)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            {user.name}
                            {user.password && <Lock className="w-3 h-3 text-gray-400" />}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Workspace: {user.defaultWorkspace}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Profile / Limit Display */}
            {users.length >= 2 ? (
              <div id="profile-limit-notice" className="text-center p-4 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-semibold">
                Profile Limit Reached (Max 2 Profiles Allowed)
              </div>
            ) : (
              <button
                id="show-create-profile-btn"
                onClick={() => setShowCreateForm(true)}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-emerald-500/40 text-gray-700 dark:text-gray-400 dark:hover:text-emerald-400 flex items-center justify-center gap-2 font-medium text-sm transition-all bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10"
              >
                <Plus className="w-4 h-4" /> Create New Profile
              </button>
            )}
          </div>
        )}

        {/* Password Verification Modal to login / switch */}
        {unlockUser && (
          <motion.div
            id="unlock-password-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              id="unlock-password-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="glass-card w-full max-w-sm rounded-2xl shadow-xl p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Enter Profile Password
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Please enter the password to unlock profile <span className="font-bold text-emerald-600 dark:text-emerald-400">"{unlockUser.name}"</span>.
              </p>
              <form onSubmit={handleUnlockSubmit} className="space-y-4">
                <div>
                  <input
                    id="unlock-password-input"
                    type="password"
                    required
                    autoFocus
                    placeholder="Profile Password"
                    value={unlockPassword}
                    onChange={(e) => {
                      setUnlockPassword(e.target.value);
                      setUnlockError('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-mono"
                  />
                  {unlockError && (
                    <p className="text-xs text-rose-500 font-semibold mt-1.5">{unlockError}</p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    id="cancel-unlock-btn"
                    type="button"
                    onClick={() => {
                      setUnlockUser(null);
                      setUnlockPassword('');
                      setUnlockError('');
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-unlock-btn"
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors shadow-sm shadow-emerald-500/10"
                  >
                    Unlock Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
