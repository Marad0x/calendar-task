import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Client, Task, TaskStatus, TaskPriority } from '../types';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

function cleanObject<T extends object>(obj: T): T {
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    const value = (obj as any)[key];
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  return cleaned as T;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  clients: Client[];
  tasks: Task[];
  allTasks: Task[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  
  // User Actions
  selectUser: (id: string) => void;
  createUser: (name: string, exchangeRate?: number, defaultWorkspace?: string, password?: string) => void;
  updateUserSetting: (settings: Partial<User>) => void;
  deleteUser: (id: string) => void;
  
  // Client Actions
  createClient: (client: Omit<Client, 'id' | 'userId' | 'createdAt' | 'isArchived'>) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  archiveClient: (id: string, archive: boolean) => void;

  // Task Actions
  createTask: (task: Omit<Task, 'id' | 'userId' | 'phpAmount' | 'createdAt'> & { userId?: string }) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string, date?: string) => void;

  // Toast / Notification Utilities
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // API Exchange Rate Integration
  liveRate: number | null;
  fetchingRate: boolean;
  fetchLatestExchangeRate: () => Promise<number | null>;

  // Data Actions
  exportData: () => string;
  importData: (json: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem('freelancer_users');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse cached users', e);
      }
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const lastUserId = localStorage.getItem('freelancer_last_user_id');
    if (lastUserId) {
      const stored = localStorage.getItem('freelancer_users');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const user = parsed.find((u: any) => u.id === lastUserId);
          if (user) return user;
        } catch (e) {
          console.error('Failed to parse cached current user', e);
        }
      }
    }
    return null;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const lastUserId = localStorage.getItem('freelancer_last_user_id');
    if (lastUserId) {
      const stored = localStorage.getItem(`freelancer_clients_${lastUserId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse cached clients', e);
        }
      }
    }
    return [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const lastUserId = localStorage.getItem('freelancer_last_user_id');
    if (lastUserId) {
      const stored = localStorage.getItem(`freelancer_tasks_${lastUserId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse cached tasks', e);
        }
      }
    }
    return [];
  });

  const [allTasks, setAllTasks] = useState<Task[]>(() => {
    let loaded: Task[] = [];
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('freelancer_tasks_')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key)!);
          loaded = [...loaded, ...parsed];
        } catch (e) {}
      }
    }
    loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return loaded;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const lastUserId = localStorage.getItem('freelancer_last_user_id');
    if (lastUserId) {
      const stored = localStorage.getItem('freelancer_users');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const user = parsed.find((u: any) => u.id === lastUserId);
          if (user) return user.theme === 'dark';
        } catch (e) {}
      }
    }
    return true;
  });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const [fetchingRate, setFetchingRate] = useState<boolean>(false);
  const [liveRate, setLiveRate] = useState<number | null>(null);

  // Load basic users list and dark mode first
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const serverUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          serverUsers.push(doc.data() as User);
        });
        if (serverUsers.length > 0) {
          setUsers(serverUsers);
          localStorage.setItem('freelancer_users', JSON.stringify(serverUsers));
          
          // Re-authenticate last logged-in user if available
          const lastUserId = localStorage.getItem('freelancer_last_user_id');
          if (lastUserId) {
            const user = serverUsers.find((u: User) => u.id === lastUserId);
            if (user) {
              setCurrentUser(user);
              setDarkMode(user.theme === 'dark');
            }
          }
          return;
        }
      } catch (err) {
        console.error('Failed to fetch users from Firestore, falling back to local storage', err);
      }

      // Fallback to local storage
      const storedUsers = localStorage.getItem('freelancer_users');
      if (storedUsers) {
        try {
          const parsed = JSON.parse(storedUsers);
          setUsers(parsed);
          
          const lastUserId = localStorage.getItem('freelancer_last_user_id');
          if (lastUserId) {
            const user = parsed.find((u: User) => u.id === lastUserId);
            if (user) {
              setCurrentUser(user);
              setDarkMode(user.theme === 'dark');
            }
          }
        } catch (e) {
          console.error('Failed to parse users', e);
        }
      }
    };

    loadUsers();
  }, []);

  // Fetch exchange rate on app startup
  useEffect(() => {
    fetchLatestExchangeRate();
  }, []);

  // Listen to all tasks globally to keep leaderboard and recent tasks live
  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksList: Task[] = [];
      snapshot.forEach(doc => {
        tasksList.push(doc.data() as Task);
      });
      tasksList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setAllTasks(tasksList);
      
      // Keep local storage up to date
      const tasksByUser: Record<string, Task[]> = {};
      tasksList.forEach(t => {
        if (!tasksByUser[t.userId]) tasksByUser[t.userId] = [];
        tasksByUser[t.userId].push(t);
      });
      Object.entries(tasksByUser).forEach(([userId, userTasks]) => {
        localStorage.setItem(`freelancer_tasks_${userId}`, JSON.stringify(userTasks));
      });
      
      // Update current user's tasks state so it's live across devices
      setCurrentUser(prevUser => {
        if (prevUser) {
          setTasks(tasksByUser[prevUser.id] || []);
        }
        return prevUser;
      });
    }, (error) => {
      console.error("Error listening to all tasks: ", error);
    });
    
    return () => unsubscribe();
  }, []);

  // Load tasks and clients for the current user whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      const loadUserData = async () => {
        let loadedClients: Client[] = [];
        let loadedTasks: Task[] = [];
        let loadedFromServer = false;

        try {
          // Fetch clients from Firestore
          const clientsSnap = await getDocs(query(collection(db, 'clients'), where('userId', '==', currentUser.id)));
          clientsSnap.forEach((doc) => {
            loadedClients.push(doc.data() as Client);
          });

          // Fetch tasks from Firestore
          const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', currentUser.id)));
          tasksSnap.forEach((doc) => {
            loadedTasks.push(doc.data() as Task);
          });

          // Sort tasks by createdAt descending
          loadedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          loadedFromServer = true;
        } catch (err) {
          console.error('Failed to load user data from Firestore, falling back to local storage', err);
        }

        if (!loadedFromServer) {
          const storedClients = localStorage.getItem(`freelancer_clients_${currentUser.id}`);
          const storedTasks = localStorage.getItem(`freelancer_tasks_${currentUser.id}`);
          
          if (storedClients) {
            try {
              loadedClients = JSON.parse(storedClients);
            } catch (e) {
              console.error('Failed to parse clients', e);
            }
          }

          if (storedTasks) {
            try {
              loadedTasks = JSON.parse(storedTasks);
            } catch (e) {
              console.error('Failed to parse tasks', e);
            }
          }
        }

        // Check if "Living Core" workspace client exists, if not, automatically seed it
        const hasLivingCore = loadedClients.some(c => c.id === 'living-core');
        if (!hasLivingCore) {
          const livingCoreClient: Client = {
            id: 'living-core',
            userId: currentUser.id,
            name: 'Living Core',
            color: '#10b981', // green-500
            notes: 'Default primary workspace',
            defaultHourlyRate: 20,
            isArchived: false,
            createdAt: new Date().toISOString()
          };
          loadedClients.unshift(livingCoreClient);
          
          // Save locally
          localStorage.setItem(`freelancer_clients_${currentUser.id}`, JSON.stringify(loadedClients));
          // Save to Firestore
          try {
            await setDoc(doc(db, 'clients', 'living-core'), cleanObject(livingCoreClient));
          } catch (e) {
            console.error('Failed to seed Living Core to Firestore', e);
          }
        }

        setClients(loadedClients);
        setTasks(loadedTasks);
        
        // Update theme
        setDarkMode(currentUser.theme === 'dark');
        localStorage.setItem('freelancer_last_user_id', currentUser.id);
      };

      loadUserData();
    } else {
      setClients([]);
      setTasks([]);
    }
  }, [currentUser]);

  // Synchronize dark mode class on document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toast Management
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // User Actions
  const selectUser = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setCurrentUser(user);
      addToast(`Welcome back, ${user.name}!`, 'info');
    }
  };

  const createUser = async (name: string, exchangeRate: number = 58.5, defaultWorkspace: string = 'Living Core', password?: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      defaultExchangeRate: exchangeRate,
      defaultWorkspace,
      theme: 'dark',
      password,
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('freelancer_users', JSON.stringify(updatedUsers));
    
    // Save to Firestore
    try {
      await setDoc(doc(db, 'users', newUser.id), cleanObject(newUser));
    } catch (e) {
      console.error('Failed to sync new user to Firestore', e);
    }
    
    // Automatically login new user
    setCurrentUser(newUser);
    addToast(`Profile "${name}" created successfully!`, 'success');
  };

  const updateUserSetting = async (settings: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...settings };
    setCurrentUser(updatedUser);

    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    localStorage.setItem('freelancer_users', JSON.stringify(updatedUsers));

    // Save to Firestore
    try {
      await setDoc(doc(db, 'users', currentUser.id), cleanObject(updatedUser));
    } catch (e) {
      console.error('Failed to sync user settings to Firestore', e);
    }

    if (settings.theme !== undefined) {
      setDarkMode(settings.theme === 'dark');
    }

    addToast('Settings saved successfully!', 'success');
  };

  const deleteUser = async (id: string) => {
    const updatedUsers = users.filter((u) => u.id !== id);
    setUsers(updatedUsers);
    localStorage.setItem('freelancer_users', JSON.stringify(updatedUsers));

    // Clear user specific data
    localStorage.removeItem(`freelancer_clients_${id}`);
    localStorage.removeItem(`freelancer_tasks_${id}`);

    // Save to Firestore (delete user profile, clients, and tasks)
    try {
      await deleteDoc(doc(db, 'users', id));
      
      const clientsSnap = await getDocs(query(collection(db, 'clients'), where('userId', '==', id)));
      const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', id)));
      
      const batch = writeBatch(db);
      clientsSnap.forEach(d => batch.delete(d.ref));
      tasksSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.error('Failed to delete user on Firestore', e);
    }

    if (currentUser?.id === id) {
      setCurrentUser(null);
      localStorage.removeItem('freelancer_last_user_id');
    }
    addToast('Profile deleted.', 'info');
  };

  // Client Actions
  const createClient = (clientData: Omit<Client, 'id' | 'userId' | 'createdAt' | 'isArchived'>) => {
    if (!currentUser) throw new Error('No user selected');
    
    const newClient: Client = {
      ...clientData,
      id: 'client_' + Math.random().toString(36).substring(2, 9),
      userId: currentUser.id,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    localStorage.setItem(`freelancer_clients_${currentUser.id}`, JSON.stringify(updatedClients));
    
    // Save to Firestore
    setDoc(doc(db, 'clients', newClient.id), cleanObject(newClient)).catch((e) => {
      console.error('Failed to sync new client to Firestore', e);
    });

    addToast(`Client "${newClient.name}" added successfully!`);
    return newClient;
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    if (!currentUser) return;
    const targetClient = clients.find((c) => c.id === id);
    if (!targetClient) return;

    const mergedClient = { ...targetClient, ...clientData };

    const updatedClients = clients.map((c) => (c.id === id ? mergedClient : c));
    setClients(updatedClients);
    localStorage.setItem(`freelancer_clients_${currentUser.id}`, JSON.stringify(updatedClients));

    // Save to Firestore
    setDoc(doc(db, 'clients', id), cleanObject(mergedClient)).catch((e) => {
      console.error('Failed to sync updated client to Firestore', e);
    });

    addToast('Client updated successfully!');
  };

  const deleteClient = (id: string) => {
    if (!currentUser) return;
    if (id === 'living-core') {
      addToast('Cannot delete default workspace!', 'error');
      return;
    }
    const updatedClients = clients.filter((c) => c.id !== id);
    setClients(updatedClients);
    localStorage.setItem(`freelancer_clients_${currentUser.id}`, JSON.stringify(updatedClients));
    
    // Unassign deleted client from tasks (or move to default)
    const updatedTasks = tasks.map((t) => (t.clientId === id ? { ...t, clientId: 'living-core' } : t));
    setTasks(updatedTasks);
    localStorage.setItem(`freelancer_tasks_${currentUser.id}`, JSON.stringify(updatedTasks));

    // Save to Firestore in background
    const syncDelete = async (clientId: string, userId: string) => {
      await deleteDoc(doc(db, 'clients', clientId));
      
      const tasksSnap = await getDocs(query(
        collection(db, 'tasks'),
        where('userId', '==', userId),
        where('clientId', '==', clientId)
      ));
      
      const batch = writeBatch(db);
      tasksSnap.forEach((d) => {
        batch.update(d.ref, { clientId: 'living-core' });
      });
      await batch.commit();
    };

    syncDelete(id, currentUser.id).catch((e) => {
      console.error('Failed to sync client deletion to Firestore', e);
    });

    addToast('Client deleted and related tasks reassigned.');
  };

  const archiveClient = (id: string, archive: boolean) => {
    if (!currentUser) return;
    if (id === 'living-core') {
      addToast('Cannot archive default workspace!', 'error');
      return;
    }
    const targetClient = clients.find((c) => c.id === id);
    if (!targetClient) return;

    const mergedClient = { ...targetClient, isArchived: archive };

    const updatedClients = clients.map((c) => (c.id === id ? mergedClient : c));
    setClients(updatedClients);
    localStorage.setItem(`freelancer_clients_${currentUser.id}`, JSON.stringify(updatedClients));

    // Save to Firestore
    setDoc(doc(db, 'clients', id), cleanObject(mergedClient)).catch((e) => {
      console.error('Failed to sync archived client to Firestore', e);
    });

    addToast(archive ? 'Client archived.' : 'Client unarchived.');
  };

  // Task Actions
  const createTask = (taskData: Omit<Task, 'id' | 'userId' | 'phpAmount' | 'createdAt'> & { userId?: string }) => {
    if (!currentUser) return;
    const targetUserId = taskData.userId || currentUser.id;
    const phpAmount = Number((taskData.usdRate * taskData.exchangeRate).toFixed(2));
    const newTask: Task = {
      ...taskData,
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      userId: targetUserId,
      phpAmount,
      createdAt: new Date().toISOString()
    };

    if (targetUserId === currentUser.id) {
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
    }
    const targetStored = localStorage.getItem(`freelancer_tasks_${targetUserId}`);
    let parsedTarget: Task[] = [];
    if (targetStored) {
      try { parsedTarget = JSON.parse(targetStored); } catch (e) {}
    }
    const newTargetTasks = [newTask, ...parsedTarget];
    localStorage.setItem(`freelancer_tasks_${targetUserId}`, JSON.stringify(newTargetTasks));

    // Save to Firestore
    setDoc(doc(db, 'tasks', newTask.id), cleanObject(newTask)).catch((e) => {
      console.error('Failed to sync new task to Firestore', e);
    });

    const targetUser = users.find(u => u.id === targetUserId);
    const assignedName = targetUser ? targetUser.name : 'user';
    addToast(`Task "${newTask.title}" logged for ${assignedName}!`);
  };

  const updateTask = (id: string, taskData: Partial<Task>) => {
    if (!currentUser) return;
    
    const existingTask = allTasks.find(t => t.id === id) || tasks.find(t => t.id === id);
    if (!existingTask) return;

    const oldUserId = existingTask.userId;
    const newUserId = taskData.userId || oldUserId;

    const merged: Task = {
      ...existingTask,
      ...taskData,
      userId: newUserId
    };

    if (taskData.usdRate !== undefined || taskData.exchangeRate !== undefined) {
      merged.phpAmount = Number((merged.usdRate * merged.exchangeRate).toFixed(2));
    }

    if (oldUserId === currentUser.id || newUserId === currentUser.id) {
      if (newUserId === currentUser.id) {
        setTasks(prev => {
          const exists = prev.some(t => t.id === id);
          if (exists) return prev.map(t => t.id === id ? merged : t);
          return [merged, ...prev];
        });
      } else {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    }

    const targetStored = localStorage.getItem(`freelancer_tasks_${newUserId}`);
    let parsedTarget: Task[] = [];
    if (targetStored) {
      try { parsedTarget = JSON.parse(targetStored); } catch (e) {}
    }
    const newTargetTasks = parsedTarget.some(t => t.id === id)
      ? parsedTarget.map(t => t.id === id ? merged : t)
      : [merged, ...parsedTarget];
    localStorage.setItem(`freelancer_tasks_${newUserId}`, JSON.stringify(newTargetTasks));

    if (oldUserId !== newUserId) {
      const oldStored = localStorage.getItem(`freelancer_tasks_${oldUserId}`);
      if (oldStored) {
        try {
          const oldParsed: Task[] = JSON.parse(oldStored);
          localStorage.setItem(`freelancer_tasks_${oldUserId}`, JSON.stringify(oldParsed.filter(t => t.id !== id)));
        } catch (e) {}
      }
    }

    // Save to Firestore
    setDoc(doc(db, 'tasks', id), cleanObject(merged)).catch((e) => {
      console.error('Failed to sync updated task to Firestore', e);
    });

    addToast('Task updated successfully!');
  };

  const deleteTask = (id: string) => {
    if (!currentUser) return;
    const updatedTasks = tasks.filter((t) => t.id !== id);
    setTasks(updatedTasks);
    localStorage.setItem(`freelancer_tasks_${currentUser.id}`, JSON.stringify(updatedTasks));

    // Save to Firestore
    deleteDoc(doc(db, 'tasks', id)).catch((e) => {
      console.error('Failed to sync task deletion to Firestore', e);
    });

    addToast('Task deleted successfully!', 'info');
  };

  const duplicateTask = (id: string, date?: string) => {
    if (!currentUser) return;
    const sourceTask = tasks.find((t) => t.id === id);
    if (!sourceTask) return;

    const duplicated: Task = {
      ...sourceTask,
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      date: date || sourceTask.date,
      createdAt: new Date().toISOString()
    };

    const updatedTasks = [duplicated, ...tasks];
    setTasks(updatedTasks);
    localStorage.setItem(`freelancer_tasks_${currentUser.id}`, JSON.stringify(updatedTasks));

    // Save to Firestore
    setDoc(doc(db, 'tasks', duplicated.id), cleanObject(duplicated)).catch((e) => {
      console.error('Failed to sync duplicated task to Firestore', e);
    });

    addToast(`Duplicated "${sourceTask.title}" successfully!`);
  };

  // Fetch Exchange Rate from free public API
  const fetchLatestExchangeRate = async (): Promise<number | null> => {
    setFetchingRate(true);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch rates');
      const data = await response.json();
      const rate = data.rates?.PHP;
      if (rate) {
        const rateNum = Number(rate.toFixed(2));
        setLiveRate(rateNum);
        setFetchingRate(false);
        return rateNum;
      }
      throw new Error('PHP rate not found');
    } catch (e) {
      console.error(e);
      setFetchingRate(false);
      addToast('Failed to fetch latest exchange rate. Using manual value.', 'error');
      return null;
    }
  };

  // Backup Import/Export
  const exportData = (): string => {
    if (!currentUser) return '';
    const exportObject = {
      version: '1.0',
      user: currentUser,
      clients: clients,
      tasks: tasks
    };
    return JSON.stringify(exportObject, null, 2);
  };

  const importData = (json: string): boolean => {
    if (!currentUser) return false;
    try {
      const parsed = JSON.parse(json);
      if (!parsed.user || !Array.isArray(parsed.clients) || !Array.isArray(parsed.tasks)) {
        addToast('Invalid backup file structure', 'error');
        return false;
      }
      
      // Override data for current user
      const importedClients = parsed.clients.map((c: any) => ({
        ...c,
        userId: currentUser.id
      }));

      const importedTasks = parsed.tasks.map((t: any) => ({
        ...t,
        userId: currentUser.id
      }));

      // Make sure Living Core is there
      if (!importedClients.some((c: any) => c.id === 'living-core')) {
        importedClients.unshift({
          id: 'living-core',
          userId: currentUser.id,
          name: 'Living Core',
          color: '#10b981',
          notes: 'Default primary workspace',
          defaultHourlyRate: 20,
          isArchived: false,
          createdAt: new Date().toISOString()
        });
      }

      setClients(importedClients);
      setTasks(importedTasks);
      
      localStorage.setItem(`freelancer_clients_${currentUser.id}`, JSON.stringify(importedClients));
      localStorage.setItem(`freelancer_tasks_${currentUser.id}`, JSON.stringify(importedTasks));
      
      // Save to Firestore
      const syncImport = async (userId: string, clientsList: Client[], tasksList: Task[]) => {
        // Clear old ones
        const clientsSnap = await getDocs(query(collection(db, 'clients'), where('userId', '==', userId)));
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', userId)));
        
        let batch = writeBatch(db);
        clientsSnap.forEach((d) => batch.delete(d.ref));
        tasksSnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();

        // Write new ones
        const allItems = [
          ...clientsList.map((c) => ({ coll: 'clients', id: c.id, data: c })),
          ...tasksList.map((t) => ({ coll: 'tasks', id: t.id, data: t }))
        ];

        for (let i = 0; i < allItems.length; i += 400) {
          batch = writeBatch(db);
          const chunk = allItems.slice(i, i + 400);
          chunk.forEach((item) => {
            batch.set(doc(db, item.coll, item.id), cleanObject(item.data));
          });
          await batch.commit();
        }
      };

      syncImport(currentUser.id, importedClients, importedTasks).catch((e) => {
        console.error('Failed to sync imported data to Firestore', e);
      });

      addToast('Data restored successfully!', 'success');
      return true;
    } catch (e) {
      console.error(e);
      addToast('Failed to import backup file.', 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        clients,
        tasks,
        allTasks,
        activeTab,
        setActiveTab,
        darkMode,
        setDarkMode,
        selectUser,
        createUser,
        updateUserSetting,
        deleteUser,
        createClient,
        updateClient,
        deleteClient,
        archiveClient,
        createTask,
        updateTask,
        deleteTask,
        duplicateTask,
        toasts,
        addToast,
        removeToast,
        liveRate,
        fetchingRate,
        fetchLatestExchangeRate,
        exportData,
        importData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
