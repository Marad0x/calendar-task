import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, Client, TaskStatus, TaskPriority, getLocalDateString } from '../../types';
import { X, Plus, Image as ImageIcon, Link, Trash2, Calendar, Clock, DollarSign, User as UserIcon } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultDate?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit, defaultDate }) => {
  const { clients, createTask, updateTask, deleteTask, createClient, currentUser, users, fetchLatestExchangeRate, liveRate } = useApp();

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('living-core');
  const [usdRate, setUsdRate] = useState('0');
  const [exchangeRate, setExchangeRate] = useState('58.50');
  const [status, setStatus] = useState<TaskStatus>('Completed');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [projectLink, setProjectLink] = useState('');
  const [imageAttachment, setImageAttachment] = useState<string | undefined>(undefined);

  // Living Core Image Count and Rate states
  const [imageCount, setImageCount] = useState('0');
  const [ratePerImage, setRatePerImage] = useState('1.5');

  // Quick Client Creation inside modal State
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientColor, setNewClientColor] = useState('#10b981');
  const [newClientRate, setNewClientRate] = useState('20');

  // Deletion Confirmation State
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Initialize form fields based on whether editing or creating
  useEffect(() => {
    setIsConfirmingDelete(false);
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setTargetUserId(taskToEdit.userId || currentUser?.id || '');
      setDate(taskToEdit.date);
      setClientId(taskToEdit.clientId);
      setUsdRate(taskToEdit.usdRate.toString());
      setExchangeRate(taskToEdit.exchangeRate.toString());
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      setProjectLink(taskToEdit.projectLink || '');
      setImageAttachment(taskToEdit.imageAttachment);

      if (taskToEdit.clientId === 'living-core') {
        const count = taskToEdit.imageCount !== undefined ? taskToEdit.imageCount : 0;
        const rate = taskToEdit.ratePerImage !== undefined ? taskToEdit.ratePerImage : 1.5;
        setImageCount(count.toString());
        setRatePerImage(rate.toString());
      } else {
        setImageCount('0');
        setRatePerImage('1.5');
      }
    } else {
      // Create Mode
      setTitle('');
      setDescription('');
      setTargetUserId(currentUser?.id || '');
      setDate(defaultDate || getLocalDateString());
      setClientId('living-core');
      setImageCount('0');
      setRatePerImage('1.5');
      setUsdRate('0');
      
      setExchangeRate(liveRate?.toString() || currentUser?.defaultExchangeRate?.toString() || '58.50');
      setStatus('Completed');
      setPriority('Medium');
      setProjectLink('');
      setImageAttachment(undefined);
    }
  }, [taskToEdit, defaultDate, clients, currentUser, isOpen]);



  // Recalculate usdRate dynamically for living-core whenever imageCount or ratePerImage change
  useEffect(() => {
    if (clientId === 'living-core') {
      const count = parseFloat(imageCount) || 0;
      const rate = parseFloat(ratePerImage) || 0;
      setUsdRate((count * rate).toString());
    }
  }, [imageCount, ratePerImage, clientId]);

  // Sync rate when client changes
  const handleClientChange = (cId: string) => {
    setClientId(cId);
    if (cId === 'living-core') {
      const count = parseFloat(imageCount) || 0;
      const rate = parseFloat(ratePerImage) || 1.5;
      setUsdRate((count * rate).toString());
    } else {
      const selectedClient = clients.find(c => c.id === cId);
      if (selectedClient && selectedClient.defaultHourlyRate) {
        setUsdRate(selectedClient.defaultHourlyRate.toString());
      }
    }
  };

  // Handle Image upload and convert to base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Client submission inline
  const handleCreateClientInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    
    const addedClient = createClient({
      name: newClientName.trim(),
      color: newClientColor,
      notes: 'Quick-created from Task logger',
      defaultHourlyRate: parseFloat(newClientRate) || 20
    });

    setClientId(addedClient.id);
    setUsdRate(addedClient.defaultHourlyRate?.toString() || '20');
    setNewClientName('');
    setShowAddClient(false);
  };

  // Handle form submit
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const rateNum = parseFloat(usdRate) || 0;
    const exRateNum = parseFloat(exchangeRate) || 58.50;

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      date,
      clientId,
      usdRate: rateNum,
      exchangeRate: exRateNum,
      status,
      priority,
      projectLink: projectLink.trim(),
      imageAttachment,
      imageCount: clientId === 'living-core' ? parseFloat(imageCount) || 0 : undefined,
      ratePerImage: clientId === 'living-core' ? parseFloat(ratePerImage) || 0 : undefined,
      userId: targetUserId || currentUser?.id
    };

    if (taskToEdit) {
      updateTask(taskToEdit.id, taskData);
    } else {
      createTask(taskData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (taskToEdit) {
      deleteTask(taskToEdit.id);
      onClose();
    }
  };

  // Automatically calculated PHP amount
  const calculatedPhp = (parseFloat(usdRate) || 0) * (parseFloat(exchangeRate) || 58.5);

  if (!isOpen) return null;

  return (
    <div id="task-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-card rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/20 dark:border-white/5 shrink-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {taskToEdit ? 'Edit Task Log' : 'Log Daily Task'}
          </h3>
          <button
            id="close-task-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Create Client Inline Section */}
          {showAddClient && (
            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 mb-2">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-3">Add Client Workspace</h4>
              <form onSubmit={handleCreateClientInline} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      id="inline-client-name"
                      type="text"
                      required
                      placeholder="Client or Project Name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      id="inline-client-rate"
                      type="number"
                      placeholder="Hourly USD Rate"
                      value={newClientRate}
                      onChange={(e) => setNewClientRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Client Tag Color:</span>
                    <input
                      id="inline-client-color"
                      type="color"
                      value={newClientColor}
                      onChange={(e) => setNewClientColor(e.target.value)}
                      className="w-6 h-6 p-0 border-0 rounded-md cursor-pointer shrink-0"
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAddClient(false)}
                      className="px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      id="submit-inline-client"
                      type="submit"
                      className="px-3 py-1.5 text-[10px] font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      Add Client
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Main Task Form */}
          <form id="task-modal-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Task Title
              </label>
              <input
                id="task-title-input"
                type="text"
                required
                placeholder="What did you work on?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Short Description
              </label>
              <input
                id="task-desc-input"
                type="text"
                placeholder="Describe your progress, challenges, deliverables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs transition-all"
              />
            </div>

            {/* Assignee & Date row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-purple-500" /> Assign To / Log For Profile
                </label>
                <select
                  id="task-assignee-select"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none font-semibold"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.id === currentUser?.id ? '(Active Profile / You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" /> Date
                </label>
                <input
                  id="task-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Client / Workspace dropdown + Quick Create client button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>Client / Workspace</span>
                  <button
                    id="add-client-inline-trigger"
                    type="button"
                    onClick={() => setShowAddClient(true)}
                    className="text-[10px] font-bold text-emerald-500 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Client
                  </button>
                </label>
                <select
                  id="task-client-select"
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none text-xs font-medium"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isArchived ? '(Archived)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  id="task-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none text-xs font-medium"
                >
                  <option value="Completed">Completed</option>
                  <option value="Pending">TO DO</option>
                  <option value="Revision">Revision</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Earnings - Rates & Conversion */}
            <div className="bg-white/20 dark:bg-white/5 p-4 rounded-2xl border border-white/20 dark:border-white/5 space-y-4">
              {clientId === 'living-core' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-gray-400" /> Images Done
                    </label>
                    <input
                      id="task-image-count"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="6"
                      value={imageCount}
                      onChange={(e) => setImageCount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-gray-400" /> Rate per Image
                    </label>
                    <input
                      id="task-rate-per-image"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="1.50"
                      value={ratePerImage}
                      onChange={(e) => setRatePerImage(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex justify-between items-center">
                      <span>Exchange Rate</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (liveRate) {
                            setExchangeRate(liveRate.toString());
                          } else {
                            const rate = await fetchLatestExchangeRate();
                            if (rate) setExchangeRate(rate.toString());
                          }
                        }}
                        className="text-[10px] font-bold text-emerald-500 hover:underline cursor-pointer"
                      >
                        Fetch Live
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        id="task-exchange-rate"
                        type="number"
                        step="0.01"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none pr-8 font-mono"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">PHP</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-gray-400" /> How Much? (USD)
                    </label>
                    <input
                      id="task-usd-rate"
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      value={usdRate}
                      onChange={(e) => setUsdRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex justify-between items-center">
                      <span>Exchange Rate</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (liveRate) {
                            setExchangeRate(liveRate.toString());
                          } else {
                            const rate = await fetchLatestExchangeRate();
                            if (rate) setExchangeRate(rate.toString());
                          }
                        }}
                        className="text-[10px] font-bold text-emerald-500 hover:underline cursor-pointer"
                      >
                        Fetch Live
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        id="task-exchange-rate"
                        type="number"
                        step="0.01"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none pr-8 font-mono"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">PHP</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Totals Row */}
              <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-black/5 dark:border-white/5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 font-mono">
                    USD Earnings
                  </label>
                  <div className="px-3 py-2 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/40 text-gray-900 dark:text-white text-xs font-bold font-mono rounded-xl">
                    ${(parseFloat(usdRate) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 font-mono">
                    PHP Earnings
                  </label>
                  <div className="px-3 py-2.5 bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono rounded-xl">
                    ₱{calculatedPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Project Link */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-gray-400" /> Project Link
              </label>
              <input
                id="task-project-link"
                type="url"
                placeholder="e.g. https://drive.google.com/drive/folders/..."
                value={projectLink}
                onChange={(e) => setProjectLink(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs transition-all font-mono"
              />
            </div>

            {/* Image Attachment Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-gray-400" /> Work Proof Screenshot
              </label>
              
              <div className="flex items-center gap-4">
                <label className="px-4 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 hover:border-gray-300 dark:hover:bg-gray-900 rounded-xl cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-all">
                  <ImageIcon className="w-4 h-4 text-gray-500" /> Upload Image
                  <input
                    id="task-screenshot-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                
                {imageAttachment && (
                  <button
                    id="remove-screenshot-btn"
                    type="button"
                    onClick={() => setImageAttachment(undefined)}
                    className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Work Proof
                  </button>
                )}
              </div>

              {imageAttachment && (
                <div className="mt-3 relative rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-48 flex justify-center bg-gray-50 dark:bg-gray-950 p-2">
                  <img
                    src={imageAttachment}
                    alt="Work proof reference screenshot"
                    className="object-contain max-h-44 rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>



            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-white/20 dark:border-white/5 shrink-0">
              <div>
                {taskToEdit && (
                  isConfirmingDelete ? (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Sure?</span>
                      <button
                        id="confirm-delete-task-btn"
                        type="button"
                        onClick={handleDelete}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        id="cancel-delete-task-btn"
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      id="delete-task-btn"
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Task Log
                    </button>
                  )
                )}
              </div>
              <div className="flex gap-2.5">
                <button
                  id="cancel-save-task"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-save-task"
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors shadow-sm shadow-emerald-500/10"
                >
                  {taskToEdit ? 'Save Changes' : 'Log Daily Task'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
