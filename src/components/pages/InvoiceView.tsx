import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Printer, 
  Download, 
  CreditCard, 
  Briefcase, 
  Calendar, 
  Sliders, 
  Check, 
  FileCheck, 
  FileText,
  AlertCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Task, Client } from '../../types';

export const InvoiceView: React.FC = () => {
  const { tasks, clients, currentUser, addToast } = useApp();

  const [isIframe, setIsIframe] = useState<boolean>(false);
  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Selected client and month
  const [selectedClientId, setSelectedClientId] = useState<string>('living-core');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  // Custom metadata
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [invoicePeriod, setInvoicePeriod] = useState<string>('');
  const [invoiceHeader, setInvoiceHeader] = useState<string>('');

  // Wise Details
  const [paymentMethod, setPaymentMethod] = useState<string>('WISE');
  const [wiseUsername, setWiseUsername] = useState<string>('markchristianestradan');
  const [wiseEmail, setWiseEmail] = useState<string>('nicermarkchristian1@gmail.com');

  // Selected tasks (checkboxes)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Record<string, boolean>>({});

  // Populate metadata defaults when client or month changes
  useEffect(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthStr = monthNames[selectedMonth];
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    // Default invoice period: e.g., "July 01 - 31, 2026"
    setInvoicePeriod(`${monthStr} 01 - ${lastDay}, ${selectedYear}`);
    
    // Default invoice date: first of the following month (e.g., "8/1/2026")
    const nextMonthDate = new Date(selectedYear, selectedMonth + 1, 1);
    setInvoiceDate(`${nextMonthDate.getMonth() + 1}/${nextMonthDate.getDate()}/${nextMonthDate.getFullYear()}`);
    
    // Default invoice number: e.g., "INV-2026-0009"
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    setInvoiceNumber(`INV-${selectedYear}-${randomNum}`);

    // Default header
    const currentClient = clients.find(c => c.id === selectedClientId);
    if (currentClient) {
      setInvoiceHeader(currentClient.name.toUpperCase().replace(/\s+/g, ''));
    } else if (selectedClientId === 'living-core') {
      setInvoiceHeader('LIVINGCORE');
    }
  }, [selectedClientId, selectedYear, selectedMonth, clients]);

  // Load Wise info from localStorage on mount
  useEffect(() => {
    if (currentUser) {
      const stored = localStorage.getItem(`invoice_settings_${currentUser.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
          if (parsed.wiseUsername) setWiseUsername(parsed.wiseUsername);
          if (parsed.wiseEmail) setWiseEmail(parsed.wiseEmail);
        } catch (e) {
          console.error('Error loading stored invoice settings', e);
        }
      }
    }
  }, [currentUser]);

  // Save Wise info to localStorage when changed
  const saveWiseSettings = () => {
    if (currentUser) {
      const settings = { paymentMethod, wiseUsername, wiseEmail };
      localStorage.setItem(`invoice_settings_${currentUser.id}`, JSON.stringify(settings));
      addToast('Payment info saved as default!', 'success');
    }
  };

  // Filter tasks based on client and selected month
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filter by client/workspace
      if (task.clientId !== selectedClientId) return false;
      
      // Filter by date
      const taskDate = new Date(task.date);
      if (isNaN(taskDate.getTime())) return false;
      
      return taskDate.getFullYear() === selectedYear && taskDate.getMonth() === selectedMonth;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [tasks, selectedClientId, selectedYear, selectedMonth]);

  // Default select all tasks on filter change
  useEffect(() => {
    const initialSelected: Record<string, boolean> = {};
    filteredTasks.forEach(task => {
      // Filter out cancelled tasks by default, keep Completed/Pending/Revision
      initialSelected[task.id] = task.status !== 'Cancelled';
    });
    setSelectedTaskIds(initialSelected);
  }, [filteredTasks]);

  // Toggle single task inclusion
  const handleToggleTask = (id: string) => {
    setSelectedTaskIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle all tasks
  const handleToggleAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    filteredTasks.forEach(t => {
      updated[t.id] = checked;
    });
    setSelectedTaskIds(updated);
  };

  // Get tasks that are checked and included in the invoice
  const activeInvoiceTasks = useMemo(() => {
    return filteredTasks.filter(t => !!selectedTaskIds[t.id]);
  }, [filteredTasks, selectedTaskIds]);

  // Group active invoice tasks by date if they are on the same day
  const groupedInvoiceTasks = useMemo(() => {
    const groups: Record<string, {
      date: string;
      titles: string[];
      imageCount: number;
      rates: number[];
      usdRate: number;
    }> = {};

    activeInvoiceTasks.forEach(task => {
      const d = new Date(task.date);
      const dateStr = !isNaN(d.getTime()) 
        ? `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}` 
        : task.date;

      if (!groups[dateStr]) {
        groups[dateStr] = {
          date: dateStr,
          titles: [],
          imageCount: 0,
          rates: [],
          usdRate: 0
        };
      }

      // Append title
      groups[dateStr].titles.push(task.title);
      if (task.imageCount !== undefined) {
        groups[dateStr].imageCount += task.imageCount;
      }
      if (task.ratePerImage !== undefined) {
        groups[dateStr].rates.push(task.ratePerImage);
      }
      groups[dateStr].usdRate += task.usdRate;
    });

    return Object.values(groups).map((group, idx) => {
      const joinedTitles = group.titles.join(', ');
      
      // Determine the rate to show. If all rates are identical, show it.
      // Otherwise, calculate the weighted rate if image count is > 0
      let rateToDisplay = group.rates.length > 0 ? group.rates[0] : undefined;
      const allSameRate = group.rates.every(r => r === group.rates[0]);
      if (!allSameRate && group.imageCount > 0) {
        rateToDisplay = group.usdRate / group.imageCount;
      }

      return {
        id: `grouped-${group.date}-${idx}`,
        date: group.date,
        title: joinedTitles,
        imageCount: group.imageCount,
        ratePerImage: rateToDisplay,
        usdRate: group.usdRate
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activeInvoiceTasks]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalImages = 0;
    let totalUsd = 0;
    
    activeInvoiceTasks.forEach(t => {
      totalImages += t.imageCount || 0;
      totalUsd += t.usdRate || 0;
    });

    return {
      totalImages,
      totalUsd: Number(totalUsd.toFixed(2))
    };
  }, [activeInvoiceTasks]);

  // Handle triggering native browser print
  const handlePrint = () => {
    if (activeInvoiceTasks.length === 0) {
      addToast('No tasks selected for invoice!', 'error');
      return;
    }
    window.print();
  };

  // List of last 5 years for dropdown
  const years = useMemo(() => {
    const currentY = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentY - i);
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none print:space-y-0 print:my-0 select-none">
      
      {/* Sandbox/Iframe warning banner - Hidden on print */}
      {isIframe && (
        <div className="print:hidden bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
                Browser Print/PDF is blocked inside the code editor preview iframe
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-500/90 mt-0.5 leading-relaxed">
                Browsers block standard print dialogs inside editor embeds. Please click <strong>Open App in New Tab</strong> to print or save your invoice perfectly!
              </p>
            </div>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shrink-0 whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open App in New Tab
          </a>
        </div>
      )}

      {/* Configuration Header Area - Hidden on print */}
      <div className="print:hidden bg-white/70 dark:bg-black/30 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Invoice Converter
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select a month and client, customize your Wise payment details, and export a clean PDF invoice.
            </p>
          </div>
          <button
            onClick={handlePrint}
            disabled={activeInvoiceTasks.length === 0}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
          >
            <Printer className="w-4 h-4" /> Download PDF / Print
          </button>
        </div>

        {/* Filters and Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-gray-150 dark:border-white/5">
          {/* Client select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Client / Workspace
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="living-core">Living Core (Default)</option>
              {clients.filter(c => c.id !== 'living-core').map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Billing Month
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice ID/No */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="INV-2026-0001"
            />
          </div>

          {/* Invoice Header Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Invoice Logo/Header
            </label>
            <input
              type="text"
              value={invoiceHeader}
              onChange={(e) => setInvoiceHeader(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="LIVINGCORE"
            />
          </div>
        </div>

        {/* Invoice Period & Dates + Wise details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          {/* Billing Period & Invoice Date */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Billing Period text
              </label>
              <input
                type="text"
                value={invoicePeriod}
                onChange={(e) => setInvoicePeriod(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-hidden"
                placeholder="July 01 - 31, 2026"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Invoice Issue Date
              </label>
              <input
                type="text"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-hidden"
                placeholder="8/1/2026"
              />
            </div>
          </div>

          {/* Wise details */}
          <div className="md:col-span-2 space-y-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl p-4 border border-gray-150 dark:border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-gray-800 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Payment Credentials (Wise)
              </h3>
              <button
                type="button"
                onClick={saveWiseSettings}
                className="text-[10px] bg-emerald-550 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg transition-colors shadow-xs"
              >
                Set as Default
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Payment Method Name
                </label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value.toUpperCase())}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  placeholder="WISE"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Wise Username (@)
                </label>
                <input
                  type="text"
                  value={wiseUsername}
                  onChange={(e) => setWiseUsername(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  placeholder="username"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Wise Gmail Address
                </label>
                <input
                  type="text"
                  value={wiseEmail}
                  onChange={(e) => setWiseEmail(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  placeholder="name@email.com"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Selector Checklist Panel - Hidden on print */}
      {filteredTasks.length > 0 && (
        <div className="print:hidden bg-white/70 dark:bg-black/30 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold text-gray-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
              <FileCheck className="w-4 h-4 text-blue-500" />
              Tasks found ({filteredTasks.length})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleToggleAll(true)}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => handleToggleAll(false)}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mb-4">
            Uncheck any tasks you don't want to include in this invoice generation. Cancelled tasks are deselected by default.
          </p>
          <div className="max-h-48 overflow-y-auto border border-gray-150 dark:border-white/5 rounded-xl divide-y divide-gray-100 dark:divide-white/5 bg-white/20 dark:bg-black/10">
            {filteredTasks.map(task => (
              <div 
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className="flex items-center justify-between p-3 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                    selectedTaskIds[task.id] 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300 dark:border-white/20 text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate">
                      {task.title}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                      {task.date} &bull; {task.imageCount ? `${task.imageCount} imgs @ $${task.ratePerImage}` : 'Flat Rate'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                    task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                    task.status === 'Revision' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                    task.status === 'Pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-gray-400'
                  }`}>
                    {task.status}
                  </span>
                  <span className="text-xs font-extrabold text-gray-900 dark:text-white font-mono">
                    ${task.usdRate.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State warning inside configure panel - Hidden on print */}
      {filteredTasks.length === 0 && (
        <div className="print:hidden bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400">
              No tasks found for this Client and Month
            </h4>
            <p className="text-[11px] text-amber-700 dark:text-amber-500/90 mt-1 leading-relaxed">
              We couldn't find any tasks logged under the selected workspace in <strong>{months[selectedMonth]} {selectedYear}</strong>. 
              Please add daily tasks first, or choose another billing month / workspace client above.
            </p>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* HIGH FIDELITY INVOICE PREVIEW / PRINT SHEET */}
      {/* ========================================== */}
      <div className="bg-white text-gray-900 rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-[800px] mx-auto print:shadow-none print:border-none print:rounded-none print:p-0 print:my-0 print:mx-0 print:max-w-full print:w-full select-text">
        
        {/* Print Header: Full-width blue bar */}
        <div className="bg-blue-600 print:bg-[#0b57d0] text-white px-8 py-6 flex items-center justify-between shadow-xs">
          <h1 className="text-2xl font-black tracking-wider uppercase font-sans">
            {invoiceHeader || 'LIVINGCORE'}
          </h1>
          <div className="text-right">
            <h2 className="text-xl font-bold tracking-widest uppercase font-sans">
              INVOICE
            </h2>
          </div>
        </div>

        {/* Invoice Metadata Section */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div>
            {/* Period Indicator */}
            <p className="text-gray-600 font-sans font-semibold text-[13px] tracking-wide mt-1">
              {invoicePeriod}
            </p>
          </div>
          <div className="text-right font-sans">
            <p className="text-gray-900 font-bold text-[13px] font-mono tracking-tight">
              {invoiceNumber}
            </p>
            <p className="text-gray-500 text-[11px] font-bold mt-2.5 uppercase tracking-wider">
              DATE <span className="text-gray-900 font-bold ml-1 font-mono">{invoiceDate}</span>
            </p>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="px-8 py-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 font-bold text-gray-800 text-[11px] tracking-wider uppercase">
                <th className="py-2.5 w-24">DATE</th>
                <th className="py-2.5">PROJECT TITLE</th>
                <th className="py-2.5 text-right w-20">IMAGES</th>
                <th className="py-2.5 text-right w-24">RATE</th>
                <th className="py-2.5 text-right w-28">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[12px] text-gray-800">
              {groupedInvoiceTasks.length > 0 ? (
                groupedInvoiceTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50/50 print:hover:bg-transparent">
                    <td className="py-3 font-mono text-gray-600">
                      {task.date}
                    </td>
                    <td className="py-3 pr-4 font-medium leading-relaxed text-gray-900">
                      {task.title}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-gray-700">
                      {task.imageCount !== undefined && task.imageCount > 0 ? task.imageCount : '-'}
                    </td>
                    <td className="py-3 text-right font-mono text-gray-600">
                      {task.ratePerImage !== undefined && task.ratePerImage > 0 ? `$${task.ratePerImage.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-gray-900">
                      ${task.usdRate.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 italic font-sans">
                    No items selected for this invoice. Use the panel above to choose items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Print Footer: Full-width blue block */}
        <div className="bg-blue-600 print:bg-[#0b57d0] text-white px-8 py-8 mt-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-inner">
          <div className="space-y-1 font-sans">
            <h4 className="text-[12px] font-black tracking-wider uppercase text-white/90">
              PAYMENT: {paymentMethod || 'WISE'}
            </h4>
            <p className="text-[13px] font-medium text-white">
              {paymentMethod === 'WISE' ? 'Wise @:' : 'Account @:'} <span className="font-semibold">{wiseUsername || 'markchristianestradan'}</span>
            </p>
            <p className="text-[12px] text-white/80">
              {paymentMethod === 'WISE' ? 'Wise gmail:' : 'Email:'} <span className="underline select-all">{wiseEmail || 'nicermarkchristian1@gmail.com'}</span>
            </p>
          </div>
          
          <div className="text-right sm:text-right font-sans shrink-0">
            <h3 className="text-[11px] font-bold tracking-widest text-white/80 uppercase">
              TOTAL
            </h3>
            <p className="text-3xl font-black mt-1 font-sans">
              ${totals.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

      </div>

      {/* Printing guidelines for browser - Hidden on print */}
      <div className="print:hidden max-w-[800px] mx-auto bg-gray-100 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
          <p className="font-bold text-gray-700 dark:text-gray-300">
            💡 Pro-Tip for Perfect PDFs:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>When the print dialog opens, set the Destination to <strong>Save as PDF</strong>.</li>
            <li>In More Settings, make sure to <strong>check Background Graphics</strong> so the beautiful blue header/footer background colors render perfectly!</li>
            <li>Uncheck headers and footers to remove browser margin labels (URL and page numbers).</li>
          </ul>
        </div>
      </div>

    </div>
  );
};
