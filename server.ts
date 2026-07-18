import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Simple file-based database path
const DB_FILE = path.join(process.cwd(), 'db.json');

// Initialize DB structure if not present
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], clients: {}, tasks: {} }, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to initialize db.json', e);
    }
  }
}

function readDB() {
  try {
    initDB();
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to read db.json', e);
  }
  return { users: [], clients: {}, tasks: {} };
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to write to db.json', e);
    return false;
  }
}

// API Routes
// Get all users (profiles)
app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users || []);
});

// Create/Update a user profile
app.post('/api/users', (req, res) => {
  const db = readDB();
  const user = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: 'Invalid user object' });
  }

  const index = db.users.findIndex((u: any) => u.id === user.id);
  if (index >= 0) {
    db.users[index] = { ...db.users[index], ...user };
  } else {
    db.users.push(user);
  }

  writeDB(db);
  res.json({ success: true, user });
});

// Delete a user profile
app.delete('/api/users/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;

  db.users = db.users.filter((u: any) => u.id !== id);
  if (db.clients[id]) delete db.clients[id];
  if (db.tasks[id]) delete db.tasks[id];

  writeDB(db);
  res.json({ success: true });
});

// Get clients & tasks for a specific user
app.get('/api/data/:userId', (req, res) => {
  const db = readDB();
  const { userId } = req.params;

  const userClients = db.clients[userId] || [];
  const userTasks = db.tasks[userId] || [];

  res.json({ clients: userClients, tasks: userTasks });
});

// Save clients & tasks for a specific user
app.post('/api/data/:userId', (req, res) => {
  const db = readDB();
  const { userId } = req.params;
  const { clients, tasks } = req.body;

  if (clients !== undefined) db.clients[userId] = clients;
  if (tasks !== undefined) db.tasks[userId] = tasks;

  writeDB(db);
  res.json({ success: true });
});

// Start Server
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
