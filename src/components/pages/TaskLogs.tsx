import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { 
  Search, 
  ArrowUpDown, 
  Download, 
  Trash2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  Calendar,
  Link,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface TaskLogsProps {
  onEditTask: (task: Task) => void;
}

export const TaskLogs: React.FC<TaskLogsProps> = ({ onEditTask }) => {
  const { tasks, clients, deleteTask, addToast } = useApp();

  // Search, filter and sorting state
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof Task>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Deletion Confirmation State
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const handleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const client = clients.find(c => c.id === t.clientId);
      const clientName = client?.name || '';
      
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                            t.description.toLowerCase().includes(search.toLowerCase()) ||
                            clientName.toLowerCase().includes(search.toLowerCase()) ||
                            (t.projectLink && t.projectLink.toLowerCase().includes(search.toLowerCase()));

      const matchesClient = clientFilter === 'all' || t.clientId === clientFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

      return matchesSearch && matchesClient && matchesStatus;
    });
  }, [tasks, clients, search, clientFilter, statusFilter]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    sorted.sort((a, b) => {
      let valA: any = a[sortField as keyof Task];
      let valB: any = b[sortField as keyof Task];

      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
    });
    return sorted;
  }, [filteredTasks, sortField, sortDirection]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTasks.slice(start, start + itemsPerPage);
  }, [sortedTasks, currentPage]);

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage) || 1;

  // Real client-side CSV export
  const exportToCSV = () => {
    if (sortedTasks.length === 0) {
      addToast('No tasks available to export.', 'error');
      return;
    }

    const headers = ['Date', 'Title', 'Description', 'Client', 'Status', 'USD Earnings', 'PHP Earnings', 'Project Link'];
    const rows = sortedTasks.map((t) => {
      const client = clients.find(c => c.id === t.clientId);
      return [
        t.date,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${client?.name || 'Workspace'}"`,
        t.status,
        t.usdRate,
        t.phpAmount,
        `"${(t.projectLink || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CalendarProMax_Task_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Task History exported as CSV successfully!', 'success');
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    addToast('Task log deleted successfully!', 'success');
  };

  return (
    <div id="task-logs-page" className="space-y-6">
      {/* Search and Filters Card */}
      <div className="glass-card p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Task History Log ({filteredTasks.length})
          </h2>
          <button
            id="export-csv-btn"
            onClick={exportToCSV}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-500/10 transition-colors self-end sm:self-auto"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Search input and Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="logs-search-input"
              type="text"
              placeholder="Search task details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>

          <div>
            <select
              id="logs-client-filter"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              id="logs-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none"
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

      {/* Task Logs Table Card */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-gray-500 dark:text-gray-400">
            <thead className="bg-white/20 dark:bg-white/5 text-gray-400 font-semibold uppercase font-mono tracking-wider border-b border-white/20 dark:border-white/5">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1.5">Date <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1.5">Task Title <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('usdRate')}>
                  <div className="flex items-center gap-1.5">USD Earning <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('phpAmount')}>
                  <div className="flex items-center gap-1.5">PHP Earning <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="py-3 px-4">Project Link</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60 font-medium">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No task logs match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const client = clients.find(c => c.id === task.clientId);
                  return (
                    <tr key={task.id} id={`log-row-${task.id}`} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {task.date}
                      </td>
                      <td className="py-3.5 px-4 text-gray-900 dark:text-white max-w-xs truncate" title={task.title}>
                        {task.title}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                          style={{
                            backgroundColor: (client?.color ? `${client.color}20` : '#64748b20'),
                            color: client?.color || '#cbd5e1'
                          }}
                        >
                          {client?.name || 'Workspace'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2" title={task.status}>
                          <div className="p-1.5 rounded-xl border transition-all flex items-center justify-center shrink-0"
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
                          <span className="text-[10px] font-bold tracking-wide uppercase"
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
                      </td>
                      <td className="py-3.5 px-4 text-gray-900 dark:text-white font-mono whitespace-nowrap">
                        <div>
                          ${task.usdRate.toFixed(2)}
                        </div>
                        {task.clientId === 'living-core' && task.imageCount !== undefined && task.imageCount > 0 && (
                          <div className="text-[9px] text-emerald-500 font-bold leading-none mt-0.5">
                            {task.imageCount} imgs @ ${task.ratePerImage || 1.5}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-900 dark:text-white font-mono whitespace-nowrap">
                        ₱{task.phpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.projectLink ? (
                          <a
                            href={task.projectLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline hover:text-emerald-500 font-medium text-[11px] bg-emerald-500/5 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/10"
                          >
                            <Link className="w-3.5 h-3.5 text-emerald-500" /> View Project
                          </a>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {deletingTaskId === task.id ? (
                          <div className="flex justify-end gap-1.5 items-center animate-fade-in">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Sure?</span>
                            <button
                              id={`confirm-delete-${task.id}`}
                              onClick={() => {
                                handleDelete(task.id);
                                setDeletingTaskId(null);
                              }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              id={`cancel-delete-${task.id}`}
                              onClick={() => setDeletingTaskId(null)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              id={`edit-task-log-${task.id}`}
                              onClick={() => onEditTask(task)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-emerald-500 transition-all shrink-0 cursor-pointer"
                              title="Edit task log"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-task-log-${task.id}`}
                              onClick={() => setDeletingTaskId(task.id)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-rose-500 transition-all shrink-0 cursor-pointer"
                              title="Delete task log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedTasks.length > 0 && (
          <div className="flex justify-between items-center px-6 py-4 bg-white/20 dark:bg-white/5 border-t border-white/20 dark:border-white/5">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedTasks.length)} of {sortedTasks.length} tasks
            </span>

            <div className="flex items-center gap-2">
              <button
                id="pagination-prev"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                id="pagination-next"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
