import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Client } from '../../types';
import { Plus, Archive, Trash2, Edit2, AlertCircle, Sparkles, Check } from 'lucide-react';

export const Clients: React.FC = () => {
  const { clients, tasks, createClient, updateClient, deleteClient, archiveClient } = useApp();

  // Selected client for editing
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');
  const [notes, setNotes] = useState('');
  const [defaultHourlyRate, setDefaultHourlyRate] = useState('20');
  
  // View archives toggle
  const [showArchived, setShowArchived] = useState(false);

  // Deleting client confirmation state
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  // Auto-calculate client statistics (tasks count, total earnings) dynamically from tasks
  const clientStats = useMemo(() => {
    const stats: Record<string, { totalTasks: number; totalUsd: number; totalPhp: number }> = {};
    
    // Seed all clients
    clients.forEach(c => {
      stats[c.id] = { totalTasks: 0, totalUsd: 0, totalPhp: 0 };
    });

    tasks.forEach(t => {
      if (stats[t.clientId] && t.status === 'Completed') {
        stats[t.clientId].totalTasks += 1;
        stats[t.clientId].totalUsd += t.usdRate;
        stats[t.clientId].totalPhp += t.phpAmount;
      }
    });

    return stats;
  }, [tasks, clients]);

  // Handle Create / Edit save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const rateNum = parseFloat(defaultHourlyRate) || 20;

    if (editingClient) {
      updateClient(editingClient.id, {
        name: name.trim(),
        color,
        notes: notes.trim(),
        defaultHourlyRate: rateNum
      });
    } else {
      createClient({
        name: name.trim(),
        color,
        notes: notes.trim(),
        defaultHourlyRate: rateNum
      });
    }

    // Reset Form
    setName('');
    setColor('#10b981');
    setNotes('');
    setDefaultHourlyRate('20');
    setEditingClient(null);
    setIsFormOpen(false);
  };

  const handleEditTrigger = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setColor(client.color);
    setNotes(client.notes || '');
    setDefaultHourlyRate(client.defaultHourlyRate?.toString() || '20');
    setIsFormOpen(true);
  };

  const handleDeleteTrigger = (id: string) => {
    if (id === 'living-core') {
      alert('Cannot delete default workspace!');
      return;
    }
    setDeletingClientId(id);
  };

  // Filter clients to display
  const displayedClients = useMemo(() => {
    return clients.filter(c => c.isArchived === showArchived);
  }, [clients, showArchived]);

  return (
    <div id="clients-page" className="space-y-6">
      {/* Page Header and Add Trigger */}
      <div className="flex justify-between items-center glass-card p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Workspace Clients ({displayedClients.length})
          </h2>
          <button
            id="toggle-archives-btn"
            onClick={() => setShowArchived(!showArchived)}
            className="text-[10px] font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white uppercase tracking-wider flex items-center gap-1 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 py-1.5 px-3 rounded-xl ml-2 transition-all"
          >
            <Archive className="w-3 h-3" /> {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
        </div>

        {!isFormOpen && (
          <button
            id="add-client-page-btn"
            onClick={() => {
              setEditingClient(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Client
          </button>
        )}
      </div>

      {/* Inline Creation / Edit Form */}
      {isFormOpen && (
        <div id="client-form-container" className="glass-card p-6 rounded-2xl shadow-md">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
            {editingClient ? `Edit "${editingClient.name}"` : 'Create New Client / Workspace'}
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Client / Project Name
                </label>
                <input
                  id="client-name-input"
                  type="text"
                  required
                  placeholder="e.g. Acme Corp, Vertex Labs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Default Hourly Rate (USD)
                </label>
                <input
                  id="client-rate-input"
                  type="number"
                  placeholder="20"
                  value={defaultHourlyRate}
                  onChange={(e) => setDefaultHourlyRate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Private Workspace Notes
                </label>
                <input
                  id="client-notes-input"
                  type="text"
                  placeholder="Contacts, Slack links, specifications..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs transition-all"
                />
              </div>

              <div className="flex items-center gap-3 self-end">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-2 shrink-0">
                  Label Tag Color:
                </label>
                <input
                  id="client-color-picker"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 p-0 border-0 rounded-lg cursor-pointer shrink-0"
                />
                <span className="text-[10px] font-mono text-gray-400 select-none uppercase">{color}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                id="cancel-save-client"
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                id="submit-save-client"
                type="submit"
                className="px-4.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                {editingClient ? 'Save Client' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedClients.length === 0 ? (
          <div className="col-span-full text-center py-20 glass-card rounded-2xl border border-dashed border-white/40 dark:border-white/10">
            <p className="text-gray-400 text-sm">No clients found in this tab.</p>
            {!showArchived && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="mt-3 text-xs font-semibold text-emerald-500 hover:underline"
              >
                Create your first client workspace
              </button>
            )}
          </div>
        ) : (
          displayedClients.map((client) => {
            const stats = clientStats[client.id] || { totalTasks: 0, totalUsd: 0, totalPhp: 0 };
            const initials = client.name.split(' ').map(n => n[0]).join('').substring(0, 2);

            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                className="glass-card glass-card-hover rounded-2xl shadow-xs p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top line with branding badge and color */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 select-none"
                        style={{ backgroundColor: client.color }}
                      >
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[130px]">
                          {client.name}
                        </h4>
                        <span className="text-[10px] font-mono text-gray-400">Rate: ${client.defaultHourlyRate}/hr</span>
                      </div>
                    </div>

                    {deletingClientId === client.id ? (
                      <div className="flex items-center gap-1.5 animate-fade-in bg-rose-500/10 dark:bg-rose-950/25 px-2 py-1 rounded-xl border border-rose-500/20">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Delete?</span>
                        <button
                          id={`confirm-delete-client-${client.id}`}
                          onClick={() => {
                            deleteClient(client.id);
                            setDeletingClientId(null);
                          }}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[9px] font-bold transition-colors cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          id={`cancel-delete-client-${client.id}`}
                          onClick={() => setDeletingClientId(null)}
                          className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-[9px] font-bold hover:bg-gray-300 transition-colors cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          id={`edit-client-btn-${client.id}`}
                          onClick={() => handleEditTrigger(client)}
                          className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                          title="Edit client details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`archive-client-btn-${client.id}`}
                          onClick={() => archiveClient(client.id, !client.isArchived)}
                          className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-amber-500 transition-all cursor-pointer"
                          title={client.isArchived ? 'Unarchive client' : 'Archive client'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-client-btn-${client.id}`}
                          onClick={() => handleDeleteTrigger(client.id)}
                          className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-rose-500 transition-all cursor-pointer"
                          title="Delete client"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Client Notes if they exist */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 line-clamp-2 bg-white/30 dark:bg-white/5 p-2.5 rounded-xl border border-white/20 dark:border-white/5">
                    {client.notes || 'No notes added for this workspace.'}
                  </p>
                </div>

                {/* Client Earnings Statistics dynamically calculated */}
                <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/20 dark:border-white/5 shrink-0">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Tasks Done</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block font-mono">{stats.totalTasks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Total Earned</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">${stats.totalUsd}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
