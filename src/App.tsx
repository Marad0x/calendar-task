import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { UserSelection } from './components/UserSelection';
import { Dashboard } from './components/pages/Dashboard';
import { CalendarView } from './components/pages/CalendarView';
import { TaskLogs } from './components/pages/TaskLogs';
import { Clients } from './components/pages/Clients';
import { Reports } from './components/pages/Reports';
import { InvoiceView } from './components/pages/InvoiceView';
import { Settings } from './components/pages/Settings';
import { TaskModal } from './components/pages/TaskModal';
import { ToastContainer } from './components/ToastContainer';
import { Task } from './types';

const MainAppContent: React.FC = () => {
  const { currentUser, activeTab, duplicateTask } = useApp();

  // Task Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  if (!currentUser) {
    return <UserSelection />;
  }

  // Trigger handlers
  const handleQuickAdd = (dateString?: string) => {
    setTaskToEdit(null);
    setDefaultDate(dateString);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setDefaultDate(undefined);
    setIsTaskModalOpen(true);
  };

  const handleDuplicateTask = (id: string, date?: string) => {
    duplicateTask(id, date);
  };

  return (
    <Layout onQuickAdd={() => handleQuickAdd()}>
      {/* Dynamic Tab Switcher */}
      {activeTab === 'dashboard' && (
        <Dashboard 
          onQuickAdd={handleQuickAdd} 
          onViewTask={handleEditTask} 
        />
      )}
      
      {activeTab === 'calendar' && (
        <CalendarView 
          onQuickAdd={handleQuickAdd} 
          onEditTask={handleEditTask} 
          onDuplicateTask={handleDuplicateTask}
        />
      )}
      
      {activeTab === 'tasks' && (
        <TaskLogs 
          onEditTask={handleEditTask} 
        />
      )}
      
      {activeTab === 'clients' && <Clients />}
      
      {activeTab === 'reports' && <Reports />}
      
      {activeTab === 'invoice' && <InvoiceView />}
      
      {activeTab === 'settings' && <Settings />}

      {/* Global Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        defaultDate={defaultDate}
      />
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
      <ToastContainer />
    </AppProvider>
  );
}
