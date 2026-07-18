import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Copy, 
  Calendar, 
  DollarSign, 
  Filter, 
  Tag, 
  Briefcase,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Task, Client, TaskStatus, getLocalDateString } from '../../types';

interface CalendarViewProps {
  onQuickAdd: (dateString: string) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (id: string, date?: string) => void;
}

const statusColorMap: Record<TaskStatus, string> = {
  Completed: '#10b981', // emerald-500
  Pending: '#f59e0b',   // amber-500
  Revision: '#3b82f6',  // blue-500
  Cancelled: '#f43f5e'  // rose-500
};

export const CalendarView: React.FC<CalendarViewProps> = ({ onQuickAdd, onEditTask, onDuplicateTask }) => {
  const { tasks, clients, updateTask, addToast } = useApp();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDateTasks, setSelectedDateTasks] = useState<{
    dateStr: string;
    label: string;
    tasks: Task[];
  } | null>(null);

  // Filters State
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Keyboard shortcut listener: N for new task, F for search, ESC is handled inside modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when focused on input fields
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onQuickAdd(getLocalDateString());
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('calendar-search-input');
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onQuickAdd]);

  // Filtering Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesClient = filterClient === 'all' || task.clientId === filterClient;
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (task.projectLink && task.projectLink.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesClient && matchesStatus && matchesSearch;
    });
  }, [tasks, filterClient, filterStatus, searchTerm]);

  // Month navigation
  const prevPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      updateTask(taskId, { date: dateStr });
      addToast('Task rescheduled successfully!', 'success');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Generate Month summary automatically at the end of every month
  const monthlySummary = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const monthTasks = tasks.filter(t => t.date.startsWith(monthStr));
    const activeTasks = monthTasks.filter(t => t.status !== 'Cancelled');

    if (activeTasks.length === 0) return null;

    const totalUsd = activeTasks.reduce((sum, t) => sum + t.usdRate, 0);
    const totalPhp = activeTasks.reduce((sum, t) => sum + t.phpAmount, 0);

    // Most active client calculation
    const clientCount: Record<string, number> = {};
    activeTasks.forEach(t => {
      clientCount[t.clientId] = (clientCount[t.clientId] || 0) + 1;
    });
    let topClientId = '';
    let maxCount = 0;
    Object.entries(clientCount).forEach(([id, c]) => {
      if (c > maxCount) {
        maxCount = c;
        topClientId = id;
      }
    });
    const topClient = clients.find(c => c.id === topClientId);

    // Most productive day
    const dayEarnings: Record<string, number> = {};
    activeTasks.forEach(t => {
      dayEarnings[t.date] = (dayEarnings[t.date] || 0) + t.usdRate;
    });
    let topDay = '';
    let maxDayEarnings = 0;
    Object.entries(dayEarnings).forEach(([day, earnings]) => {
      if (earnings > maxDayEarnings) {
        maxDayEarnings = earnings;
        topDay = day;
      }
    });

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return {
      totalTasks: activeTasks.length,
      totalUsd,
      totalPhp,
      topClient: topClient?.name || 'Workspace',
      mostProductiveDay: topDay || 'N/A',
      avgDailyEarnings: totalUsd / daysInMonth,
      avgTasksPerDay: activeTasks.length / daysInMonth
    };
  }, [tasks, clients, currentDate]);

  // MONTH VIEW CALCULATION
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Preceding month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthTotalDays - i);
      const dateStr = getLocalDateString(date);
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        dayNum: date.getDate()
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const dateStr = getLocalDateString(date);
      days.push({
        date,
        dateStr,
        isCurrentMonth: true,
        dayNum: i
      });
    }

    // Next month trailing days to complete a perfect 6-week layout
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = getLocalDateString(date);
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        dayNum: i
      });
    }

    return days;
  }, [currentDate]);

  // WEEK VIEW CALCULATION
  const weekDays = useMemo(() => {
    const days = [];
    const tempDate = new Date(currentDate);
    // Move to Sunday of current week
    tempDate.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(tempDate);
      const dateStr = getLocalDateString(d);
      days.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        dayLabel: d.toLocaleDateString(undefined, { weekday: 'short' })
      });
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  // DAY VIEW CALCULATION
  const dayStr = useMemo(() => {
    return getLocalDateString(currentDate);
  }, [currentDate]);

  return (
    <div id="calendar-page" className="space-y-6">
      {/* Top Header & Navigation & Views switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-50 dark:bg-gray-950 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
            <button
              id="calendar-prev-btn"
              onClick={prevPeriod}
              className="p-2 hover:bg-white dark:hover:bg-gray-900 rounded-lg transition-all text-gray-600 dark:text-gray-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="calendar-next-btn"
              onClick={nextPeriod}
              className="p-2 hover:bg-white dark:hover:bg-gray-900 rounded-lg transition-all text-gray-600 dark:text-gray-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            id="calendar-today-btn"
            onClick={goToToday}
            className="px-3.5 py-2 text-xs font-semibold bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl border border-gray-100 dark:border-gray-800 transition-colors"
          >
            Today
          </button>
          <h2 id="calendar-header-title" className="text-lg font-bold text-gray-900 dark:text-white pl-1 font-mono tracking-tight">
            {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto self-end">
          {/* Jump to Date Input */}
          <input
            id="calendar-jump-date"
            type="date"
            value={getLocalDateString(currentDate)}
            onChange={(e) => {
              if (e.target.value) setCurrentDate(new Date(e.target.value));
            }}
            className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />

          {/* View Mode Toggle */}
          <div className="flex bg-gray-50 dark:bg-gray-950 p-1 rounded-xl border border-gray-100 dark:border-gray-800 self-stretch shrink-0">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                id={`calendar-view-btn-${mode}`}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls & Search Filter Section */}
      <div className="glass-card p-4 rounded-2xl shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5">
        <div className="flex-1 max-w-sm">
          <input
            id="calendar-search-input"
            type="text"
            placeholder="Search tasks, tags, descriptions (F)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Client Filter */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-950 px-2 py-1 rounded-xl border border-gray-100 dark:border-gray-800">
            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
            <select
              id="calendar-client-filter"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none py-1 pr-4"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-950 px-2 py-1 rounded-xl border border-gray-100 dark:border-gray-800">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              id="calendar-status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none py-1 pr-4"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Revision">Revision</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* RENDER CALENDAR CORE VIEWS */}
      {viewMode === 'month' && (
        <div id="calendar-grid-month" className="glass-card rounded-2xl overflow-hidden shadow-xs">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-white/20 dark:border-white/5 bg-white/20 dark:bg-white/5 text-center py-2.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="text-xs font-semibold text-gray-400 tracking-wider font-mono">
                {d}
              </span>
            ))}
          </div>

          {/* Month grid days */}
          <div className="grid grid-cols-7 divide-x divide-y divide-white/20 dark:divide-white/5 border-t border-white/20 dark:divide-white/5">
            {monthDays.map((day) => {
              const dayTasks = filteredTasks.filter((t) => t.date === day.dateStr);
              const activeDayTasks = dayTasks.filter((t) => t.status !== 'Cancelled');
              
              const dayUsd = activeDayTasks.reduce((sum, t) => sum + t.usdRate, 0);
              const dayPhp = activeDayTasks.reduce((sum, t) => sum + t.phpAmount, 0);

              const isToday = getLocalDateString() === day.dateStr;

              return (
                <div
                  key={day.dateStr}
                  onDrop={(e) => handleDrop(e, day.dateStr)}
                  onDragOver={handleDragOver}
                  className={`min-h-36 p-2 flex flex-col group relative transition-colors ${
                    day.isCurrentMonth
                      ? 'bg-white/10 dark:bg-white/2'
                      : 'bg-white/2 dark:bg-white/0.5 text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {/* Cell Header */}
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-lg ${
                        isToday
                          ? 'bg-emerald-500 text-white'
                          : day.isCurrentMonth
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {/* Quick Add icon */}
                    <button
                      id={`calendar-quick-add-${day.dateStr}`}
                      onClick={() => onQuickAdd(day.dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-emerald-500 transition-all shrink-0"
                      title="Add Task for this date"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tasks list vertical container */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-24 pr-0.5 no-scrollbar">
                    {dayTasks.slice(0, 3).map((task) => {
                      const client = clients.find(c => c.id === task.clientId);
                      return (
                        <div
                          key={task.id}
                          id={`calendar-task-${task.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => onEditTask(task)}
                          className={`px-2 py-1 text-[10px] font-medium rounded-md border text-left cursor-pointer hover:shadow-xs truncate flex items-center justify-between group/task transition-all ${
                            task.status === 'Completed'
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:border-emerald-500/50'
                              : task.status === 'Pending'
                              ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-500/20 dark:border-amber-500/10 text-amber-700 dark:text-amber-400 hover:border-amber-500/50'
                              : task.status === 'Revision'
                              ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-500/20 dark:border-blue-500/10 text-blue-700 dark:text-blue-400 hover:border-blue-500/50'
                              : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-500/20 dark:border-rose-500/10 text-rose-700 dark:text-rose-400 hover:border-rose-500/50'
                          }`}
                          title={`${task.title} ($${task.usdRate})`}
                        >
                          <span className="truncate flex-1 font-semibold pr-1 flex items-center gap-1.5">
                            <span 
                              className="w-1.5 h-1.5 rounded-full shrink-0" 
                              style={{ backgroundColor: statusColorMap[task.status] || '#cbd5e1' }} 
                            />
                            <span className="truncate">{task.title}</span>
                          </span>
                          <span className="shrink-0 font-extrabold font-mono text-[9px] bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-1 py-0.2 rounded mr-1 border border-gray-200 dark:border-gray-700">
                            ${task.usdRate.toFixed(1)}
                          </span>
                          <button
                            id={`duplicate-task-btn-${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateTask(task.id);
                            }}
                            className="opacity-0 group-hover/task:opacity-100 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded ml-1 text-current shrink-0"
                            title="Duplicate previous task"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const dateLabel = new Date(day.dateStr).toLocaleDateString(undefined, { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          });
                          setSelectedDateTasks({
                            dateStr: day.dateStr,
                            label: dateLabel,
                            tasks: dayTasks
                          });
                        }}
                        className="text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:underline pl-1 cursor-pointer block text-left mt-0.5"
                      >
                        + {dayTasks.length - 3} more
                      </button>
                    )}
                  </div>

                  {/* Day Earnings summary footer if exists */}
                  {dayUsd > 0 && (
                    <div className="mt-auto pt-1.5 border-t border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <span>{dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}</span>
                      <span>${dayUsd.toFixed(0)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div id="calendar-grid-week" className="glass-card rounded-2xl shadow-xs p-6">
          <div className="grid grid-cols-7 divide-x divide-white/20 dark:divide-white/5">
            {weekDays.map((day) => {
              const dayTasks = filteredTasks.filter(t => t.date === day.dateStr);
              const isToday = getLocalDateString() === day.dateStr;

              return (
                <div
                  key={day.dateStr}
                  onDrop={(e) => handleDrop(e, day.dateStr)}
                  onDragOver={handleDragOver}
                  className="px-2 min-h-[400px] flex flex-col group"
                >
                  {/* Day Heading */}
                  <div className="text-center pb-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">
                      {day.dayLabel}
                    </span>
                    <span className={`text-lg font-bold font-mono inline-block mt-1 w-8 h-8 leading-8 rounded-full ${
                      isToday ? 'bg-emerald-500 text-white' : 'text-gray-900 dark:text-white'
                    }`}>
                      {day.dayNum}
                    </span>
                  </div>

                  {/* Tasks Container */}
                  <div className="flex-1 space-y-2 mt-4 overflow-y-auto no-scrollbar">
                    {dayTasks.map((task) => {
                      const client = clients.find(c => c.id === task.clientId);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => onEditTask(task)}
                          className={`p-2.5 rounded-xl border cursor-pointer hover:shadow-md transition-all text-left flex flex-col justify-between h-28 ${
                            task.status === 'Completed'
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:border-emerald-500/50'
                              : task.status === 'Pending'
                              ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-500/20 text-amber-700 dark:text-amber-400 hover:border-amber-500/50'
                              : task.status === 'Revision'
                              ? 'bg-blue-50/30 dark:bg-blue-950/10 border-blue-500/20 text-blue-700 dark:text-blue-400 hover:border-blue-500/50'
                              : 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-500/20 text-rose-700 dark:text-rose-400 hover:border-rose-500/50'
                          }`}
                        >
                          <div>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1"
                              style={{
                                backgroundColor: (client?.color ? `${client.color}20` : '#64748b20'),
                                color: client?.color || '#475569'
                              }}
                            >
                              {client?.name || 'Workspace'}
                            </span>
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate line-clamp-2 flex-1">
                                {task.title}
                              </h4>
                              <span className="shrink-0 font-extrabold font-mono text-[9px] bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                ${task.usdRate.toFixed(1)}
                              </span>
                            </div>
                          </div>

                           <div className="flex justify-between items-center text-[9px] text-gray-400 mt-2 border-t border-black/5 dark:border-white/5 pt-1.5 font-mono">
                            <div className="flex items-center gap-1.5" title={task.status}>
                              <div className="p-0.5 rounded-full border transition-all flex items-center justify-center shrink-0"
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
                              <span className="text-[9px] font-bold uppercase tracking-wider"
                                style={{
                                  color: task.status === 'Completed' ? '#10b981' :
                                         task.status === 'Pending' ? '#f59e0b' :
                                         task.status === 'Revision' ? '#3b82f6' :
                                         '#f43f5e'
                                }}
                              >
                                {task.status}
                              </span>
                            </div>
                            <span className="font-extrabold text-black dark:text-white">${task.usdRate}</span>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      id={`week-add-btn-${day.dateStr}`}
                      onClick={() => onQuickAdd(day.dateStr)}
                      className="w-full py-3.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 hover:text-emerald-500 flex items-center justify-center text-gray-400 transition-all text-xs font-semibold"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Log task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'day' && (
        <div id="calendar-grid-day" className="glass-card rounded-2xl shadow-xs p-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center pb-4 border-b border-white/20 dark:border-white/5 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Tasks for {currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            <button
              id={`day-add-btn-${dayStr}`}
              onClick={() => onQuickAdd(dayStr)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Log task
            </button>
          </div>

          {filteredTasks.filter(t => t.date === dayStr).length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <p className="text-gray-400 text-sm">No tasks logged for this day yet.</p>
              <button
                onClick={() => onQuickAdd(dayStr)}
                className="mt-3 px-3.5 py-1.5 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 rounded-xl transition-colors"
              >
                Log a task now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.filter(t => t.date === dayStr).map((task) => {
                const client = clients.find(c => c.id === task.clientId);
                return (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="p-4 bg-white/20 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5 hover:border-emerald-500/40 hover:shadow-xs transition-all cursor-pointer flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{
                          backgroundColor: task.status === 'Completed' ? '#10b981' :
                                           task.status === 'Pending' ? '#f59e0b' :
                                           task.status === 'Revision' ? '#3b82f6' :
                                           '#f43f5e'
                        }}
                      />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="font-semibold text-gray-500 dark:text-gray-400">{client?.name || 'Workspace'}</span>
                          <span>•</span>
                          <div className="inline-flex items-center gap-1.5" title={task.status}>
                            <div className="p-0.5 rounded-full border transition-all flex items-center justify-center shrink-0"
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
                            <span className="text-[9px] font-bold uppercase tracking-wider"
                              style={{
                                color: task.status === 'Completed' ? '#10b981' :
                                       task.status === 'Pending' ? '#f59e0b' :
                                       task.status === 'Revision' ? '#3b82f6' :
                                       '#f43f5e'
                              }}
                            >
                              {task.status}
                            </span>
                          </div>
                          {task.projectLink && (
                            <>
                              <span>•</span>
                              <a
                                href={task.projectLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-500 hover:underline inline-flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Project
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-gray-900 dark:text-white block">${task.usdRate.toFixed(2)}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">₱{task.phpAmount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AUTOMATIC MONTH SUMMARY DISPLAY */}
      {monthlySummary && (
        <div id="monthly-summary-panel" className="bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/10 p-6">
          <div className="flex items-center gap-2 mb-4 text-emerald-800 dark:text-emerald-400">
            <FileSpreadsheet className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-sm tracking-tight">
              {currentDate.toLocaleDateString(undefined, { month: 'long' })} Summary Report
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-3 bg-white/30 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Tasks</span>
              <span className="text-base font-bold text-gray-900 dark:text-white mt-1 block">{monthlySummary.totalTasks}</span>
            </div>
            <div className="p-3 bg-white/30 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total USD</span>
              <span className="text-base font-bold text-gray-900 dark:text-white mt-1 block">${monthlySummary.totalUsd.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-white/30 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total PHP</span>
              <span className="text-base font-bold text-gray-900 dark:text-white mt-1 block">₱{monthlySummary.totalPhp.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-white/30 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Top Client</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white mt-1.5 block truncate">{monthlySummary.topClient}</span>
            </div>
            <div className="p-3 bg-white/30 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Active Day</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white mt-1.5 block truncate font-mono">{monthlySummary.mostProductiveDay}</span>
            </div>
            <div className="p-3 bg-white/30 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Daily Income</span>
              <span className="text-base font-bold text-gray-900 dark:text-white mt-1 block">${monthlySummary.avgDailyEarnings.toFixed(0)}/d</span>
            </div>
          </div>
        </div>
      )}

      {/* Daily Tasks Modal Overlay */}
      {selectedDateTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-card rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/10 dark:border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/5">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Tasks for {selectedDateTasks.label}
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-semibold">
                  {selectedDateTasks.tasks.length} tasks scheduled
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateTasks(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-950 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-4 max-h-72 overflow-y-auto space-y-2 no-scrollbar bg-white/10 dark:bg-black/10">
              {selectedDateTasks.tasks.map((task) => {
                const client = clients.find(c => c.id === task.clientId);
                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      onEditTask(task);
                      setSelectedDateTasks(null);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all flex items-center justify-between ${
                      task.status === 'Completed'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:border-emerald-500/50'
                        : task.status === 'Pending'
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-500/20 dark:border-amber-500/10 text-amber-700 dark:text-amber-400 hover:border-amber-500/50'
                        : task.status === 'Revision'
                        ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-500/20 dark:border-blue-500/10 text-blue-700 dark:text-blue-400 hover:border-blue-500/50'
                        : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-500/20 dark:border-rose-500/10 text-rose-700 dark:text-rose-400 hover:border-rose-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: statusColorMap[task.status] || '#cbd5e1' }} 
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs block truncate text-gray-900 dark:text-white">{task.title}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate block">
                          {client?.name || 'Workspace'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="font-extrabold font-mono text-xs text-gray-900 dark:text-white">
                          ${task.usdRate.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 font-mono">
                          ₱{task.phpAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                      </div>
                      <div className="p-1 rounded-xl border transition-all flex items-center justify-center shrink-0"
                        title={task.status}
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
                        {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {task.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                        {task.status === 'Revision' && <AlertCircle className="w-3.5 h-3.5" />}
                        {task.status === 'Cancelled' && <XCircle className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with a quick add button */}
            <div className="p-3 bg-white/20 dark:bg-white/5 border-t border-gray-100 dark:border-gray-800 flex justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedDateTasks(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-150 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickAdd(selectedDateTasks.dateStr);
                  setSelectedDateTasks(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1 shadow-xs shadow-emerald-500/15 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
