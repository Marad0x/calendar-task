import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  LayoutDashboard, 
  Calendar, 
  History, 
  Briefcase, 
  BarChart3, 
  Settings, 
  Sun, 
  Moon, 
  Bell, 
  Search, 
  Menu, 
  X, 
  User as UserIcon,
  LogOut,
  DollarSign,
  Plus,
  TrendingUp,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  onQuickAdd?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onQuickAdd }) => {
  const { 
    currentUser, 
    activeTab, 
    setActiveTab, 
    darkMode, 
    setDarkMode, 
    users,
    liveRate,
    fetchingRate: fetchingLiveRate,
    fetchLatestExchangeRate: fetchLiveRate
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Logout verification states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState('');
  const [logoutError, setLogoutError] = useState('');

  // Real-time workspace notifications from other users
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string }>>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(30));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const otherTasks: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId !== currentUser.id) {
          otherTasks.push({ id: doc.id, ...data });
        }
      });

      // Map tasks to notification format
      const formattedNotifs = otherTasks.slice(0, 5).map((task) => {
        const creator = users.find(u => u.id === task.userId);
        const creatorName = creator ? creator.name : 'Another user';
        
        let timeStr = 'Just now';
        if (task.createdAt) {
          const diffMs = new Date().getTime() - new Date(task.createdAt).getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          if (diffMins < 1) {
            timeStr = 'Just now';
          } else if (diffMins < 60) {
            timeStr = `${diffMins}m ago`;
          } else if (diffHours < 24) {
            timeStr = `${diffHours}h ago`;
          } else {
            timeStr = new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          }
        }

        return {
          id: task.id,
          text: `${creatorName} logged task: "${task.title}"`,
          time: timeStr
        };
      });

      setNotifications(formattedNotifs);
    }, (error) => {
      console.error('Failed to listen to tasks for notifications', error);
    });

    return () => unsubscribe();
  }, [currentUser, users]);

  if (!currentUser) return <>{children}</>;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'tasks', label: 'Task History', icon: History },
    { id: 'clients', label: 'Clients', icon: Briefcase },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'invoice', label: 'Invoice', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleLogout = () => {
    if (currentUser.password) {
      setShowLogoutConfirm(true);
      setLogoutPassword('');
      setLogoutError('');
    } else {
      localStorage.removeItem('freelancer_last_user_id');
      window.location.reload();
    }
  };

  return (
    <div id="app-workspace-layout" className="min-h-screen glass-container flex transition-colors duration-200">
      
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 glass-sidebar border-r border-white/20 dark:border-white/5 shrink-0 select-none">
        {/* Sidebar Header / Brand */}
        <div className="h-16 flex items-center px-6 border-b border-white/20 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/10 shrink-0">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight text-sm font-sans">
              GYATLENDAR
            </span>
          </div>
        </div>

        {/* User Info / Profile Switcher */}
        <div className="p-4 border-b border-white/20 dark:border-white/5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-850 border border-gray-50 dark:border-gray-800 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-xs truncate">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  Display Profile
                </p>
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg shrink-0 transition-colors"
              title="Logout Profile"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white/60 dark:bg-white/12 text-indigo-700 dark:text-indigo-300 border border-white/70 dark:border-white/10 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Widget */}
        <div className="p-4 border-t border-white/20 dark:border-white/5">
          <div className="p-4 rounded-2xl bg-indigo-900/90 dark:bg-indigo-950/60 text-white shadow-lg space-y-2">
            <p className="text-[9px] text-indigo-200 uppercase font-bold tracking-widest font-mono">Active Workspace</p>
            <img src="/LIVINGCORE-LOGO.png" alt="Living Core" className="h-6 w-auto object-contain" />
            <div className="flex justify-between items-center text-[10px] mt-4 opacity-90 font-medium">
              <span>Syncing Active</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden"
          >
            <motion.div
              id="mobile-drawer-box"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-64 max-w-[80vw] h-full bg-white dark:bg-gray-900 flex flex-col border-r border-gray-100 dark:border-gray-800"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800">
                <span className="font-bold text-gray-900 dark:text-white text-sm">GYATLENDAR</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-gray-400 hover:text-gray-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">Active profile</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Logout Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area Wrapper (Right) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-16 glass-header border-b px-4 sm:px-6 flex items-center justify-between shrink-0 select-none relative z-10">
          
          {/* Mobile Menu burger / Search */}
          <div className="flex items-center gap-3">
            <button
              id="mobile-burger-btn"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 hover:bg-white/40 dark:hover:bg-white/5 text-gray-500 hover:text-gray-950 dark:hover:text-white rounded-xl md:hidden shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
 
            {/* Quick search display indicator */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 bg-white/40 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-xl max-w-xs w-64 text-gray-400">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 select-none">Press 'F' to search anywhere</span>
            </div>
          </div>

          {/* Right Controls: Dark Mode, Notifications, User details */}
          <div className="flex items-center gap-3">
            {/* Live Exchange Rate Indicator */}
            <div
              id="live-exchange-rate-badge"
              onClick={fetchLiveRate}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-semibold font-mono shadow-xs cursor-pointer transition-all active:scale-95 group select-none shrink-0"
              title="Click to refresh live exchange rate"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${fetchingLiveRate ? 'animate-ping' : ''}`}></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <TrendingUp className={`w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform ${fetchingLiveRate ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-gray-500 dark:text-gray-400">WISE: USD/PHP:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {liveRate ? `₱${liveRate.toFixed(2)}` : fetchingLiveRate ? '...' : `₱${currentUser?.defaultExchangeRate?.toFixed(2) || '58.50'}`}
              </span>
            </div>

            {/* Quick Access Add Task Button */}
            {onQuickAdd && (
              <button
                id="global-header-quick-add"
                onClick={onQuickAdd}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs transition-all shadow-xs shadow-emerald-500/10 cursor-pointer shrink-0"
                title="Log new task instantly"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Log Task</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              id="theme-dark-mode-toggle"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-gray-50 dark:hover:bg-gray-850 rounded-xl text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all shrink-0"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative shrink-0">
              <button
                id="navbar-bell-btn"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 hover:bg-gray-50 dark:hover:bg-gray-850 rounded-xl text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 relative transition-all"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-gray-900 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      id="notifications-box"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-4 z-20 space-y-3"
                    >
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                        <span>Workspace Activity</span>
                        <span className="text-[9px] text-emerald-500 uppercase tracking-widest font-mono">Real-time</span>
                      </h4>
                      <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
                        {notifications.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                            No recent activity from other users
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div key={notif.id} className="py-2.5 first:pt-0 last:pb-0">
                              <p className="text-xs text-gray-700 dark:text-gray-300 leading-normal">{notif.text}</p>
                              <span className="text-[9px] font-mono text-gray-400 mt-1 block">{notif.time}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar click leads to Settings */}
            <button
              id="navbar-profile-avatar"
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-950 border border-gray-50 dark:border-gray-800 hover:border-emerald-500/20 rounded-xl transition-all"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-6 h-6 rounded-lg bg-gray-100"
                referrerPolicy="no-referrer"
              />
              <span className="hidden sm:inline text-[10px] font-bold text-gray-600 dark:text-gray-300 font-mono tracking-tight shrink-0 max-w-[80px] truncate">
                {currentUser.name}
              </span>
            </button>
          </div>
        </header>

        {/* Dynamic page container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Logout Password Verification Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            id="logout-password-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              id="logout-password-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card w-full max-w-sm rounded-2xl shadow-xl p-6 bg-white dark:bg-gray-900"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <LogOut className="w-5 h-5 text-rose-500" /> Confirm Sign-Out
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                You are signing out of <span className="font-bold text-emerald-600 dark:text-emerald-400">"{currentUser.name}"</span>. Please enter your profile password to continue.
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
                    id="logout-password-input"
                    type="password"
                    required
                    autoFocus
                    placeholder="Your Profile Password"
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
                    id="cancel-logout-btn"
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
                    id="submit-logout-btn"
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors shadow-sm shadow-rose-500/10"
                  >
                    Confirm Logout
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
