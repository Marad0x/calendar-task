export interface User {
  id: string;
  name: string;
  avatar: string;
  defaultExchangeRate: number;
  defaultWorkspace: string;
  theme: 'light' | 'dark';
  password?: string;
  createdAt: string;
}

export type TaskStatus = 'Completed' | 'Pending' | 'Revision' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  clientId: string; // "living-core" for default workspace or client id
  usdRate: number; // task price / project price
  exchangeRate: number;
  phpAmount: number; // calculated: usdRate * exchangeRate
  status: TaskStatus;
  priority: TaskPriority;
  projectLink?: string;
  imageAttachment?: string; // base64 or object URL or placeholder
  imageCount?: number;
  ratePerImage?: number;
  createdAt: string;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  color: string; // Tailwind hex or class color
  logo?: string; // Optional logo initials or base64
  notes: string;
  defaultHourlyRate?: number;
  isArchived: boolean;
  createdAt: string;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalTasks: number;
  totalUsd: number;
  totalPhp: number;
  topClientId: string;
  topClientName: string;
  mostProductiveDay: string; // YYYY-MM-DD
  avgDailyEarningsUsd: number;
  avgTasksPerDay: number;
}
