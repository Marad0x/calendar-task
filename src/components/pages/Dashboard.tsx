import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  Calendar,
  Briefcase,
  Clock,
  CheckCircle2,
  Flame,
  ArrowUpRight,
  User as UserIcon,
  Plus,
  Link,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Task, Client, getLocalDateString } from '../../types';

interface DashboardProps {
  onQuickAdd: (dateString?: string) => void;
  onViewTask: (task: Task) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onQuickAdd, onViewTask }) => {
  const { currentUser, users, tasks, allTasks, clients, setActiveTab } = useApp();

  // Selected profile user for stats view
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);

  // Compute profile statistics dynamically when requested
  const selectedProfileDetails = useMemo(() => {
    if (!selectedProfileUserId) return null;

    const u = users.find(user => user.id === selectedProfileUserId);
    if (!u) return null;

    let userTasks: Task[] = [];
    if (u.id === currentUser?.id) {
      userTasks = tasks;
    } else {
      userTasks = allTasks?.filter(t => t.userId === u.id) || [];
    }

    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Start of week (Sunday)
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    const weekStartStr = getLocalDateString(sunday);

    // Start of month
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Today's tasks (all logged today)
    const todayTasks = userTasks.filter(t => t.date === todayStr);

    // Today's completed tasks
    const completedToday = todayTasks.filter(t => t.status === 'Completed');

    // Week's completed tasks
    const completedThisWeek = userTasks.filter(t => t.date >= weekStartStr && t.status === 'Completed');

    // Month's completed tasks
    const completedThisMonth = userTasks.filter(t => t.date >= monthStartStr && t.status === 'Completed');

    // All-time completed tasks
    const completedAllTime = userTasks.filter(t => t.status === 'Completed');

    // Earnings calculations
    const earnedTodayUsd = completedToday.reduce((sum, t) => sum + t.usdRate, 0);
    const earnedTodayPhp = completedToday.reduce((sum, t) => sum + t.phpAmount, 0);

    const earnedWeekUsd = completedThisWeek.reduce((sum, t) => sum + t.usdRate, 0);
    const earnedWeekPhp = completedThisWeek.reduce((sum, t) => sum + t.phpAmount, 0);

    const earnedMonthUsd = completedThisMonth.reduce((sum, t) => sum + t.usdRate, 0);
    const earnedMonthPhp = completedThisMonth.reduce((sum, t) => sum + t.phpAmount, 0);

    return {
      user: u,
      tasksTodayCount: todayTasks.length,
      tasksCompletedTodayCount: completedToday.length,
      tasksCompletedAllTimeCount: completedAllTime.length,
      earnedTodayUsd,
      earnedTodayPhp,
      earnedWeekUsd,
      earnedWeekPhp,
      earnedMonthUsd,
      earnedMonthPhp
    };
  }, [selectedProfileUserId, users, currentUser, tasks, allTasks]);

  // Get current greeting based on time of day
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    let greet = 'Good Morning';
    if (hours >= 12 && hours < 17) {
      greet = 'Good Afternoon';
    } else if (hours >= 17) {
      greet = 'Good Evening';
    }
    return currentUser ? `${greet}, ${currentUser.name}` : `${greet}!`;
  }, [currentUser]);

  // Selected period for freelancer leaderboard
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('this-month');

  // Generate dynamic dropdown options for leaderboard
  const leaderboardPeriodOptions = useMemo(() => {
    const options = [
      { value: 'this-week', label: 'This Week' },
      { value: 'this-month', label: 'This Month' },
      { value: 'all-time', label: 'All Time' },
    ];

    // Add past 5 months
    const now = new Date();
    for (let i = 1; i <= 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${year}-${month}`;
      const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      options.push({ value: val, label });
    }
    return options;
  }, []);

  // Earnings comparisons with real profiles (users list)
  const comparisons = useMemo(() => {
    const filterTasksByPeriod = (taskList: Task[], period: string) => {
      const now = new Date();
      if (period === 'all-time') {
        return taskList;
      }
      if (period === 'this-week') {
        const sunday = new Date(now);
        sunday.setDate(now.getDate() - now.getDay());
        sunday.setHours(0, 0, 0, 0);
        const sundayStr = getLocalDateString(sunday);
        return taskList.filter(t => t.date >= sundayStr);
      }
      if (period === 'this-month') {
        const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        return taskList.filter(t => t.date >= startOfMonthStr);
      }
      // For YYYY-MM
      return taskList.filter(t => t.date.startsWith(period));
    };

    const userList = users.map(u => {
      let totalUsd = 0;
      let totalPhp = 0;
      let pendingUsd = 0;
      let pendingPhp = 0;
      if (u.id === currentUser?.id) {
        const filtered = filterTasksByPeriod(tasks, leaderboardPeriod);
        totalUsd = filtered.reduce((sum, t) => sum + (t.status === 'Completed' ? t.usdRate : 0), 0);
        totalPhp = filtered.reduce((sum, t) => sum + (t.status === 'Completed' ? t.phpAmount : 0), 0);
        pendingUsd = filtered.reduce((sum, t) => sum + (t.status === 'Pending' ? t.usdRate : 0), 0);
        pendingPhp = filtered.reduce((sum, t) => sum + (t.status === 'Pending' ? t.phpAmount : 0), 0);
      } else {
        const otherTasks = allTasks?.filter(t => t.userId === u.id) || [];
        const filtered = filterTasksByPeriod(otherTasks, leaderboardPeriod);
        totalUsd = filtered.reduce((sum: number, t: any) => sum + (t.status === 'Completed' ? t.usdRate : 0), 0);
        totalPhp = filtered.reduce((sum: number, t: any) => sum + (t.status === 'Completed' ? t.phpAmount : 0), 0);
        pendingUsd = filtered.reduce((sum: number, t: any) => sum + (t.status === 'Pending' ? t.usdRate : 0), 0);
        pendingPhp = filtered.reduce((sum: number, t: any) => sum + (t.status === 'Pending' ? t.phpAmount : 0), 0);
      }
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.name)}`,
        totalUsd,
        totalPhp,
        pendingUsd,
        pendingPhp,
        isCurrent: u.id === currentUser?.id,
        isBot: false
      };
    });

    return userList.sort((a, b) => b.totalUsd - a.totalUsd);
  }, [users, currentUser, tasks, leaderboardPeriod, allTasks]);

  // Statistics calculations
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Start of week (Sunday)
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    const weekStartStr = getLocalDateString(sunday);

    // Start of month
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const todayTasks = tasks.filter(t => t.date === todayStr);
    const completedToday = todayTasks.filter(t => t.status === 'Completed');

    const weekTasks = tasks.filter(t => t.date >= weekStartStr);
    const completedThisWeek = weekTasks.filter(t => t.status === 'Completed');

    const monthTasks = tasks.filter(t => t.date >= monthStartStr);
    const completedThisMonth = monthTasks.filter(t => t.status === 'Completed');

    // Earnings calculators
    const todayUsd = todayTasks.reduce((sum, t) => sum + (t.status === 'Completed' ? t.usdRate : 0), 0);
    const todayPhp = todayTasks.reduce((sum, t) => sum + (t.status === 'Completed' ? t.phpAmount : 0), 0);

    const weekUsd = weekTasks.reduce((sum, t) => sum + (t.status === 'Completed' ? t.usdRate : 0), 0);
    const weekPhp = weekTasks.reduce((sum, t) => sum + (t.status === 'Completed' ? t.phpAmount : 0), 0);

    const monthUsd = monthTasks.reduce((sum, t) => sum + (t.status === 'Completed' ? t.usdRate : 0), 0);
    const monthPhp = monthTasks.reduce((sum, t) => sum + (t.status === 'Completed' ? t.phpAmount : 0), 0);

    // Streaks calculation
    const uniqueDates = Array.from(new Set(tasks.map(t => t.date))).sort((a: string, b: string) => b.localeCompare(a));
    let streak = 0;
    if (uniqueDates.length > 0) {
      let checkDate = new Date();
      let hasWorkToday = uniqueDates.includes(getLocalDateString(checkDate));
      let yesterday = new Date();
      yesterday.setDate(checkDate.getDate() - 1);
      let hasWorkYesterday = uniqueDates.includes(getLocalDateString(yesterday));

      if (hasWorkToday || hasWorkYesterday) {
        let currentDate = hasWorkToday ? checkDate : yesterday;
        while (true) {
          const dateStr = getLocalDateString(currentDate);
          if (uniqueDates.includes(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Client contribution
    const clientEarnings: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.status === 'Completed') {
        clientEarnings[t.clientId] = (clientEarnings[t.clientId] || 0) + t.usdRate;
      }
    });

    let topClientId = '';
    let maxEarned = 0;
    Object.entries(clientEarnings).forEach(([id, amt]) => {
      if (amt > maxEarned) {
        maxEarned = amt;
        topClientId = id;
      }
    });

    const topClient = clients.find(c => c.id === topClientId);

    const allTimeUsd = tasks.reduce((sum, t) => sum + (t.status === 'Completed' ? t.usdRate : 0), 0);
    const allTimePhp = tasks.reduce((sum, t) => sum + (t.status === 'Completed' ? t.phpAmount : 0), 0);

    let allPending: any[] = [];
    let localAllTasks: any[] = [];
    users.forEach(u => {
      let userTasks: Task[] = [];
      if (u.id === currentUser?.id) {
        userTasks = tasks;
      } else {
        userTasks = allTasks?.filter(t => t.userId === u.id) || [];
      }
      userTasks.forEach(t => {
        localAllTasks.push({ ...t, userName: u.name });
      });
      const pending = userTasks.filter(t => t.status === 'Pending');
      pending.forEach(t => {
        allPending.push({ ...t, userName: u.name });
      });
    });
    allPending.sort((a, b) => a.date.localeCompare(b.date));
    localAllTasks.sort((a, b) => b.date.localeCompare(a.date));

    return {
      todayUsd,
      todayPhp,
      weekUsd,
      weekPhp,
      monthUsd,
      monthPhp,
      allTimeUsd,
      allTimePhp,
      streak,
      topClient,
      completedThisWeekCount: completedThisWeek.length,
      recentTasks: localAllTasks.slice(0, 5),
      upcomingTasks: allPending.slice(0, 5)
    };
  }, [tasks, clients, users, currentUser, allTasks]);

  const [activityDate, setActivityDate] = useState(() => new Date());

  // Month-by-month calendar heatmap contribution data
  const activityHeatmapData = useMemo(() => {
    const year = activityDate.getFullYear();
    const month = activityDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Preceding month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i);
      const dateStr = getLocalDateString(d);
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        dayNum: d.getDate()
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = getLocalDateString(d);
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: true,
        dayNum: i
      });
    }

    // Next month trailing days to complete a standard 42-day (6-week) layout
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = getLocalDateString(d);
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        dayNum: i
      });
    }

    // Enrich days with count and earnings
    return days.map(day => {
      const dateStr = day.dateStr;
      const dayTasks = tasks.filter(t => t.date === dateStr);
      const completedTasks = dayTasks.filter(t => t.status === 'Completed');
      const count = dayTasks.length;
      const earnings = completedTasks.reduce((sum, t) => sum + t.usdRate, 0);
      const phpEarnings = completedTasks.reduce((sum, t) => sum + t.phpAmount, 0);

      let level = 0;
      if (count > 0) {
        if (earnings >= 100 || count >= 5) level = 4;
        else if (earnings >= 50 || count >= 3) level = 3;
        else if (earnings >= 15 || count >= 2) level = 2;
        else level = 1;
      }

      return {
        ...day,
        count,
        earnings,
        phpEarnings,
        level
      };
    });
  }, [tasks, activityDate]);

  return (
    <div id="dashboard-page" className="space-y-6">
      {/* Main Grid Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Earnings Card */}
        <div id="widget-today-earnings" className="glass-card glass-card-hover p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Earnings</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${stats.todayUsd.toFixed(2)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">₱{stats.todayPhp.toLocaleString()}</p>
          </div>
        </div>

        {/* This Month's Earnings Card */}
        <div id="widget-month-earnings" className="glass-card glass-card-hover p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">This Month's Earnings</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${stats.monthUsd.toFixed(2)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">₱{stats.monthPhp.toLocaleString()}</p>
          </div>
        </div>

        {/* This Week's Earnings Card */}
        <div id="widget-week-earnings" className="glass-card glass-card-hover p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">This Week's Earnings</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <ArrowUpRight className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${stats.weekUsd.toFixed(2)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">₱{stats.weekPhp.toLocaleString()}</p>
          </div>
        </div>

        {/* Weekly Completed Tasks Card */}
        <div id="widget-completed-tasks" className="glass-card glass-card-hover p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed This Week</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-amber-500 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.completedThisWeekCount} {stats.completedThisWeekCount === 1 ? 'Task' : 'Tasks'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keep pushing forward! 🚀</p>
          </div>
        </div>
      </div>

      {/* Main Panel split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Recent Tasks and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Tasks Widget */}
          <div className="glass-card rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Recent Tasks
              </h3>
              <button
                id="dash-add-task-btn"
                onClick={() => onQuickAdd()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-2.5 py-1.5 rounded-lg transition-colors border border-emerald-500/10"
              >
                <Plus className="w-3.5 h-3.5" /> Log Task
              </button>
            </div>

            {stats.recentTasks.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                <p className="text-sm text-gray-400">No tasks logged recently.</p>
                <button
                  onClick={() => onQuickAdd()}
                  className="mt-2 text-xs font-semibold text-emerald-500 hover:underline"
                >
                  Log your first task
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {stats.recentTasks.map((task) => {
                  const client = clients.find(c => c.id === task.clientId);
                  return (
                    <div
                      key={task.id}
                      id={`dash-task-${task.id}`}
                      onClick={() => onViewTask(task)}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/10 px-2 -mx-2 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: task.status === 'Completed' ? '#10b981' :
                              task.status === 'Pending' ? '#f59e0b' :
                                task.status === 'Revision' ? '#3b82f6' :
                                  '#f43f5e'
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {task.title}
                          </p>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-400 mt-1">
                            {task.userName && (
                              <>
                                <span className="font-semibold text-amber-500/80">{task.userName}</span>
                                <span>•</span>
                              </>
                            )}
                            
                            <div className="inline-flex items-center gap-1 shrink-0" title={task.status}>
                              <div className="p-0.5 rounded-md border transition-all flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: task.status === 'Completed' ? 'rgba(16, 185, 129, 0.08)' :
                                    task.status === 'Pending' ? 'rgba(245, 158, 11, 0.08)' :
                                      task.status === 'Revision' ? 'rgba(59, 130, 246, 0.08)' :
                                        'rgba(244, 63, 94, 0.08)',
                                  borderColor: task.status === 'Completed' ? 'rgba(16, 185, 129, 0.2)' :
                                    task.status === 'Pending' ? 'rgba(245, 158, 11, 0.2)' :
                                      task.status === 'Revision' ? 'rgba(59, 130, 246, 0.2)' :
                                        'rgba(244, 63, 94, 0.2)',
                                  color: task.status === 'Completed' ? '#10b981' :
                                    task.status === 'Pending' ? '#f59e0b' :
                                      task.status === 'Revision' ? '#3b82f6' :
                                        '#f43f5e'
                                }}
                              >
                                {task.status === 'Completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                {task.status === 'Pending' && <Clock className="w-2.5 h-2.5" />}
                                {task.status === 'Revision' && <AlertCircle className="w-2.5 h-2.5" />}
                                {task.status === 'Cancelled' && <XCircle className="w-2.5 h-2.5" />}
                              </div>
                              <span className="text-[9px] font-bold tracking-wide uppercase"
                                style={{
                                  color: task.status === 'Completed' ? '#10b981' :
                                    task.status === 'Pending' ? '#f59e0b' :
                                      task.status === 'Revision' ? '#3b82f6' :
                                        '#f43f5e'
                                }}
                              >
                                {task.status === 'Pending' ? 'TO DO' : task.status}
                              </span>
                            </div>

                            <span className="hidden sm:inline text-gray-500">•</span>
                            <span className="hidden sm:inline font-mono">
                              {(() => {
                                if (!task.date) return '';
                                const [y, m, d] = task.date.split('-');
                                return `${m}/${d}/${y}`;
                              })()}
                            </span>

                            {task.projectLink && (
                              <>
                                <span className="hidden sm:inline text-gray-500">•</span>
                                <span className="hidden sm:inline-flex shrink-0 items-center gap-1 bg-emerald-500/5 px-1.5 py-0.5 rounded text-[10px] text-emerald-500">
                                  <Link className="w-2.5 h-2.5" /> Google Drive / Link
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          ${task.usdRate.toFixed(2)}
                        </p>
                        {task.clientId === 'living-core' && task.imageCount !== undefined && task.imageCount > 0 && (
                          <p className="text-[9px] text-emerald-500 font-bold leading-none mt-0.5">
                            {task.imageCount} imgs @ ${task.ratePerImage || 1.5}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          ₱{task.phpAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Calendar Heatmap and Work Habits */}
          <div className="glass-card rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" /> Workspace Activity Grid (Last 15 Weeks)
              </h3>

              {/* Navigation Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  id="activity-prev-month"
                  onClick={() => {
                    const d = new Date(activityDate);
                    d.setMonth(d.getMonth() - 1);
                    setActivityDate(d);
                  }}
                  className="p-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-all cursor-pointer active:scale-95"
                  title="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  id="activity-today-month"
                  onClick={() => setActivityDate(new Date())}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-bold font-mono transition-all cursor-pointer active:scale-95 min-w-[70px] text-center"
                  title="Jump to today's month"
                >
                  {activityDate.toLocaleDateString(undefined, { month: 'long' })}
                </button>

                <button
                  id="activity-next-month"
                  onClick={() => {
                    const d = new Date(activityDate);
                    d.setMonth(d.getMonth() + 1);
                    setActivityDate(d);
                  }}
                  className="p-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-all cursor-pointer active:scale-95"
                  title="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin flex justify-center">
              <div className="flex flex-col items-center py-1">
                {/* Column Headers - Small Single Letters */}
                <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] text-gray-400 font-bold font-mono uppercase tracking-wider select-none w-fit">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">S</span>
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">M</span>
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">T</span>
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">W</span>
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">T</span>
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">F</span>
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">S</span>
                </div>

                {/* Grid - Small cells */}
                <div className="grid grid-cols-7 gap-1 w-fit">
                  {activityHeatmapData.map((day, idx) => (
                    <div
                      key={idx}
                      id={`heatmap-cell-${day.dateStr}`}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md transition-all border border-black/5 dark:border-white/5 relative group cursor-pointer flex items-center justify-center hover:scale-110 ${!day.isCurrentMonth ? 'opacity-30' : ''
                        } ${day.level === 0
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                          : day.level === 1
                            ? 'bg-emerald-100/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                            : day.level === 2
                              ? 'bg-emerald-200 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-300/80 dark:hover:bg-emerald-900/60'
                              : day.level === 3
                                ? 'bg-emerald-400 dark:bg-emerald-700 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-500 dark:hover:bg-emerald-600'
                                : 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-400'
                        }`}
                    >
                      {/* Day Number */}
                      <span className="text-[9px] sm:text-[10px] font-bold font-mono select-none">
                        {day.dayNum}
                      </span>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block bg-gray-950 text-white text-[10px] py-2 px-3 rounded-xl whitespace-nowrap z-20 shadow-2xl border border-white/10 font-mono text-center leading-normal">
                        <div className="font-bold text-gray-200">{day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-emerald-400 mt-0.5 font-bold">{day.count} tasks logged</div>
                        <div className="text-gray-300 font-semibold mt-0.5">${day.earnings.toFixed(2)} (₱{day.phpEarnings.toLocaleString()})</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
              <span className="italic text-center sm:text-left">Grid levels based on task volume and completed earnings</span>
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-xl border border-black/5 dark:border-white/5">
                <span>Less</span>
                <div className="w-2.5 h-2.5 rounded-[3px] bg-gray-100 dark:bg-gray-800 border border-black/5" />
                <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-100/70 dark:bg-emerald-950/30 border border-black/5" />
                <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-200 dark:bg-emerald-900/40 border border-black/5" />
                <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-400 dark:bg-emerald-700 border border-black/5" />
                <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-600 dark:bg-emerald-500 border border-black/5" />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Column Widgets */}
        <div className="space-y-6">
          {/* Top Client Widget */}
          <div id="widget-top-client" className="glass-card p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Top Client / Workspace
            </h3>
            {stats.topClient ? (
              <div className="flex items-center gap-3">
                {stats.topClient.id === 'living-core' ? (
                  <img src="/LIVINGCORE-LOGO.png" alt="Living Core" className="w-10 h-10 rounded-xl object-contain bg-white shrink-0" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                    style={{ backgroundColor: stats.topClient.color }}
                  >
                    {stats.topClient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                    {stats.topClient.name}
                  </h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Highest income source this period
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-400">No client earnings yet.</p>
              </div>
            )}
          </div>

          {/* Freelancer Earnings Leaderboard */}
          <div className="glass-card rounded-2xl shadow-sm p-6 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-purple-500" /> Leaderboard
              </h3>
              <select
                id="leaderboard-period-select"
                value={leaderboardPeriod}
                onChange={(e) => setLeaderboardPeriod(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all max-w-[130px] sm:max-w-none truncate"
              >
                {leaderboardPeriodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans font-medium">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3.5">
              {comparisons.map((item, idx) => {
                const rankColors = [
                  'bg-amber-400 text-amber-950', // 1st
                  'bg-slate-300 text-slate-800',  // 2nd
                  'bg-amber-600 text-amber-50',   // 3rd
                ];
                const rankBadge = idx < 3
                  ? <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${rankColors[idx]}`}>{idx + 1}</span>
                  : <span className="w-5 h-5 flex items-center justify-center font-semibold text-[10px] text-gray-400">{idx + 1}</span>;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedProfileUserId(item.id)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${item.isCurrent
                        ? 'bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-500/5 hover:bg-emerald-500/15'
                        : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/20 border border-transparent hover:border-gray-150 dark:hover:border-white/5 shadow-xs'
                      }`}
                    title={`Click to view ${item.name}'s statistics`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {rankBadge}
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0 object-cover border border-gray-200 dark:border-white/5"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${item.isCurrent ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-gray-900 dark:text-white'}`}>
                          {item.name} {item.isCurrent && '👤'}
                        </p>
                        <p className="text-[9px] text-gray-400 truncate">
                          {item.isCurrent ? 'Active Profile' : 'Freelancer Profile'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed:</span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            ${item.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono text-right mt-0.5">
                          ₱{item.totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      {(item.pendingUsd > 0 || item.pendingPhp > 0) && (
                        <div className="flex flex-col items-end pt-2 mt-1 border-t border-black/10 dark:border-white/10 w-full">
                          <div className="flex items-center gap-2 justify-end">
                            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">To Do:</span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 font-mono">
                              ${item.pendingUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono text-right mt-0.5">
                            ₱{item.pendingPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming / Pending Tasks */}
          <div className="glass-card rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> TO DO Tasks
            </h3>

            {stats.upcomingTasks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No tasks on your TO DO list. You are all cleared!</p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingTasks.map((task) => {
                  const client = clients.find(c => c.id === task.clientId);
                  return (
                    <div
                      key={task.id}
                      onClick={() => onViewTask(task)}
                      className="p-3 bg-white/30 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/5 hover:border-amber-300 dark:hover:border-amber-900/50 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{task.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${task.priority === 'High'
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-100 dark:border-rose-900/30'
                            : task.priority === 'Medium'
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-100 dark:border-amber-900/30'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2">
                        <span>{client?.name || 'Workspace'}</span>
                        <div className="flex items-center gap-2">
                          {task.userName && <span className="font-semibold text-amber-500/80">{task.userName}</span>}
                          <span>{task.date}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details Modal */}
      {selectedProfileDetails && (
        <div
          id="profile-details-modal"
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedProfileUserId(null)}
        >
          <div
            className="glass-card rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/15 dark:border-white/5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Avatar info banner */}
            <div className="relative bg-gradient-to-r from-emerald-500/20 to-purple-500/20 p-6 pb-5 border-b border-white/20 dark:border-white/5">
              <button
                type="button"
                onClick={() => setSelectedProfileUserId(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mt-2">
                <img
                  src={selectedProfileDetails.user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(selectedProfileDetails.user.name)}`}
                  alt={selectedProfileDetails.user.name}
                  className="w-16 h-16 rounded-2xl bg-white dark:bg-black/40 border-2 border-emerald-500 shadow-md p-1 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest ${selectedProfileDetails.user.id === currentUser?.id
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                    }`}>
                    {selectedProfileDetails.user.id === currentUser?.id ? 'Active User' : 'Freelancer'}
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1 truncate">
                    {selectedProfileDetails.user.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    Member since {new Date(selectedProfileDetails.user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Area - Clean grid of requested profile metrics */}
            <div className="p-6 space-y-5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest block font-mono">Performance Stats</h4>

              <div className="grid grid-cols-2 gap-4">
                {/* 1. Logged Today */}
                <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-150 dark:border-white/5 p-4 rounded-2xl">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-mono">Logged Today</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white mt-1.5 block font-mono">
                    {selectedProfileDetails.tasksTodayCount} {selectedProfileDetails.tasksTodayCount === 1 ? 'task' : 'tasks'}
                  </span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">All today's logs</span>
                </div>

                {/* 2. Completed Today */}
                <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-2xl">
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-mono">Completed Today</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block font-mono">
                    {selectedProfileDetails.tasksCompletedTodayCount} {selectedProfileDetails.tasksCompletedTodayCount === 1 ? 'task' : 'tasks'}
                  </span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Approved items</span>
                </div>

                {/* 3. Earned Today */}
                <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-150 dark:border-white/5 p-4 rounded-2xl col-span-2">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-mono">Earned Today</span>
                  <div className="flex justify-between items-baseline mt-1.5">
                    <span className="text-xl font-extrabold text-gray-900 dark:text-white font-mono">
                      ${selectedProfileDetails.earnedTodayUsd.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      ₱{selectedProfileDetails.earnedTodayPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* 4. Earned This Week */}
                <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-150 dark:border-white/5 p-4 rounded-2xl">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-mono">Earned This Week</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white mt-1.5 block font-mono">
                    ${selectedProfileDetails.earnedWeekUsd.toFixed(0)}
                  </span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">
                    ₱{selectedProfileDetails.earnedWeekPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* 5. Earned This Month */}
                <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-150 dark:border-white/5 p-4 rounded-2xl">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-mono">Earned This Month</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white mt-1.5 block font-mono">
                    ${selectedProfileDetails.earnedMonthUsd.toFixed(0)}
                  </span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">
                    ₱{selectedProfileDetails.earnedMonthPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* 6. All-Time Completed Tasks */}
                <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-2xl col-span-2">
                  <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block font-mono">All-Time Completed</span>
                  <span className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1.5 block font-mono">
                    {selectedProfileDetails.tasksCompletedAllTimeCount} {selectedProfileDetails.tasksCompletedAllTimeCount === 1 ? 'Task Log' : 'Task Logs'}
                  </span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Total approved history value</span>
                </div>
              </div>
            </div>

            {/* Footer with a close action */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-black/10 border-t border-white/20 dark:border-white/5 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedProfileUserId(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
