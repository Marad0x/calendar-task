import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';
import { 
  DollarSign, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Activity, 
  Layers 
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { tasks, clients } = useApp();

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'Completed');
  }, [tasks]);

  // Analytics Math Engine
  const analytics = useMemo(() => {
    if (completedTasks.length === 0) return null;

    const totalUsd = completedTasks.reduce((sum, t) => sum + t.usdRate, 0);
    const totalPhp = completedTasks.reduce((sum, t) => sum + t.phpAmount, 0);
    const totalTasksCount = completedTasks.length;

    // Unique days worked
    const uniqueDays = Array.from(new Set(completedTasks.map(t => t.date)));
    const avgEarningsPerDay = totalUsd / (uniqueDays.length || 1);
    const avgEarningsPerTask = totalUsd / totalTasksCount;
    const avgTasksPerDay = totalTasksCount / (uniqueDays.length || 1);

    // Most productive weekday
    const weekdayCounts: Record<string, number> = {};
    const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    completedTasks.forEach((t) => {
      const dayIndex = new Date(t.date).getDay();
      const label = weekdayLabels[dayIndex];
      weekdayCounts[label] = (weekdayCounts[label] || 0) + 1;
    });

    let bestWeekday = 'N/A';
    let maxWeekdayCount = 0;
    Object.entries(weekdayCounts).forEach(([day, count]) => {
      if (count > maxWeekdayCount) {
        maxWeekdayCount = count;
        bestWeekday = day;
      }
    });

    // Best Earning Day
    const dayEarnings: Record<string, number> = {};
    completedTasks.forEach((t) => {
      dayEarnings[t.date] = (dayEarnings[t.date] || 0) + t.usdRate;
    });

    let bestDayDate = 'N/A';
    let bestDayAmount = 0;
    Object.entries(dayEarnings).forEach(([date, amt]) => {
      if (amt > bestDayAmount) {
        bestDayAmount = amt;
        bestDayDate = date;
      }
    });

    // Most productive month
    const monthCounts: Record<string, number> = {};
    completedTasks.forEach((t) => {
      const monthStr = t.date.substring(0, 7); // YYYY-MM
      monthCounts[monthStr] = (monthCounts[monthStr] || 0) + 1;
    });

    let bestMonth = 'N/A';
    let maxMonthTasks = 0;
    Object.entries(monthCounts).forEach(([m, count]) => {
      if (count > maxMonthTasks) {
        maxMonthTasks = count;
        bestMonth = m;
      }
    });

    // Most active client
    const clientCounts: Record<string, number> = {};
    completedTasks.forEach((t) => {
      clientCounts[t.clientId] = (clientCounts[t.clientId] || 0) + 1;
    });

    let topClientId = '';
    let maxClientTasks = 0;
    Object.entries(clientCounts).forEach(([id, c]) => {
      if (c > maxClientTasks) {
        maxClientTasks = c;
        topClientId = id;
      }
    });
    const topClient = clients.find(c => c.id === topClientId);

    return {
      totalUsd,
      totalPhp,
      totalTasksCount,
      avgEarningsPerDay,
      avgEarningsPerTask,
      avgTasksPerDay,
      bestWeekday,
      bestDayDate,
      bestDayAmount,
      bestMonth,
      topClient: topClient?.name || 'Workspace'
    };
  }, [completedTasks, clients]);

  // CHART DATA BUILDER: Monthly Earnings and Tasks
  const monthlyChartData = useMemo(() => {
    const monthlyData: Record<string, { month: string; usd: number; tasks: number }> = {};
    
    // Sort all tasks chronologically
    const chronTasks = [...tasks].sort((a, b) => a.date.localeCompare(b.date));

    chronTasks.forEach((t) => {
      // e.g. "Jul 2026"
      const dateObj = new Date(t.date);
      const label = dateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      
      if (!monthlyData[label]) {
        monthlyData[label] = { month: label, usd: 0, tasks: 0 };
      }
      monthlyData[label].tasks += 1;
      if (t.status === 'Completed') {
        monthlyData[label].usd += t.usdRate;
      }
    });

    return Object.values(monthlyData);
  }, [tasks]);

  // CHART DATA BUILDER: Income and Tasks by Client
  const clientChartData = useMemo(() => {
    const clientData: Record<string, { name: string; usd: number; tasks: number; color: string }> = {};

    clients.forEach((c) => {
      clientData[c.id] = { name: c.name, usd: 0, tasks: 0, color: c.color };
    });

    tasks.forEach((t) => {
      const client = clientData[t.clientId] || { name: 'Workspace', usd: 0, tasks: 0, color: '#94a3b8' };
      client.tasks += 1;
      if (t.status === 'Completed') {
        client.usd += t.usdRate;
      }
      clientData[t.clientId] = client;
    });

    return Object.values(clientData).filter(c => c.tasks > 0);
  }, [tasks, clients]);

  // CHART DATA BUILDER: Weekly Productivity
  const weeklyProductivityData = useMemo(() => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = weekdays.map((day) => ({ day, count: 0 }));

    completedTasks.forEach((t) => {
      const dayIndex = new Date(t.date).getDay();
      data[dayIndex].count += 1;
    });

    return data;
  }, [completedTasks]);

  // CHART DATA BUILDER: Task Status Distribution
  const statusDistributionData = useMemo(() => {
    const statuses: Record<string, number> = { Completed: 0, Pending: 0, Revision: 0, Cancelled: 0 };
    tasks.forEach((t) => {
      statuses[t.status] = (statuses[t.status] || 0) + 1;
    });

    const colors: Record<string, string> = {
      Completed: '#10b981',
      Pending: '#f59e0b',
      Revision: '#3b82f6',
      Cancelled: '#ef4444'
    };

    return Object.entries(statuses)
      .map(([name, value]) => ({ name, value, color: colors[name] }))
      .filter((s) => s.value > 0);
  }, [tasks]);

  return (
    <div id="reports-page" className="space-y-6">
      {/* Empty State warning */}
      {completedTasks.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-2xl border border-dashed border-white/40 dark:border-white/10 shadow-xs">
          <Award className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Awaiting Productivity Data</h2>
          <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
            Log your daily completed tasks first. Once logged, real-time visual charts and financial analysis reports will populate here.
          </p>
        </div>
      ) : (
        <>
          {/* Bento-grid Statistics Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-card p-4 rounded-xl shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Total Earned</span>
              <span className="text-base font-bold text-emerald-600 mt-1 block font-mono">${analytics?.totalUsd.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400 mt-0.5 font-mono">₱{analytics?.totalPhp.toLocaleString()}</span>
            </div>

            <div className="glass-card p-4 rounded-xl shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Completed</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white mt-1 block font-mono">{analytics?.totalTasksCount} tasks</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Quality work logs</span>
            </div>

            <div className="glass-card p-4 rounded-xl shadow-xs col-span-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Best Earning Day</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block truncate font-mono">${analytics?.bestDayAmount.toFixed(0)} ({analytics?.bestDayDate})</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Single-day milestone</span>
            </div>

            <div className="glass-card p-4 rounded-xl shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Top Workspace</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block truncate">{analytics?.topClient}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Max logs frequency</span>
            </div>
          </div>

          {/* Visual Charts section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Earnings & Tasks Chart */}
            <div className="glass-card p-5 rounded-2xl shadow-xs">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Monthly Income & Tasks Volume
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChartData}>
                    <defs>
                      <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(v) => `$${v}`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontFamily: 'JetBrains Mono' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area yAxisId="left" type="monotone" dataKey="usd" name="USD Income" stroke="#10b981" fillOpacity={1} fill="url(#colorUsd)" strokeWidth={2} />
                    <Bar yAxisId="right" dataKey="tasks" name="Tasks Logged" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Income Contributions by Client */}
            <div className="glass-card p-5 rounded-2xl shadow-xs">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono">
                <Briefcase className="w-4 h-4 text-blue-500" /> Financial Contribution by Client
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6' }} />
                    <Bar dataKey="usd" name="Total USD Income" radius={[4, 4, 0, 0]}>
                      {clientChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Productivity Heat Map count */}
            <div className="glass-card p-5 rounded-2xl shadow-xs">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono">
                <Activity className="w-4 h-4 text-indigo-500" /> Tasks Output by Weekday
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyProductivityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6' }} />
                    <Bar dataKey="count" name="Tasks Done" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Status Distribution Pie chart */}
            <div className="glass-card p-5 rounded-2xl shadow-xs">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono">
                <Layers className="w-4 h-4 text-amber-500" /> Log Task Status Distribution
              </h3>
              <div className="h-72 flex flex-col sm:flex-row items-center justify-around">
                <div className="w-48 h-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mt-4 sm:mt-0">
                  {statusDistributionData.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {entry.name}: {entry.value} ({Math.round((entry.value / tasks.length) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
