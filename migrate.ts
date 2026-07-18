import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Load env variables from .env.local
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dbPath = path.join(process.cwd(), 'db.json');

async function runMigration() {
  if (!fs.existsSync(dbPath)) {
    console.log("No db.json file found to migrate.");
    return;
  }

  console.log("Reading db.json...");
  const rawData = fs.readFileSync(dbPath, 'utf8');
  const dbData = JSON.parse(rawData);

  // Migrate users
  if (Array.isArray(dbData.users)) {
    console.log(`Migrating ${dbData.users.length} users...`);
    for (const user of dbData.users) {
      await setDoc(doc(db, 'users', user.id), user);
      console.log(`Migrated user: ${user.name} (${user.id})`);
    }
  }

  // Migrate clients
  if (dbData.clients) {
    console.log("Migrating clients...");
    for (const userId of Object.keys(dbData.clients)) {
      const userClients = dbData.clients[userId];
      if (Array.isArray(userClients)) {
        for (const client of userClients) {
          client.userId = userId;
          await setDoc(doc(db, 'clients', client.id), client);
          console.log(`Migrated client: ${client.name} for user ${userId}`);
        }
      }
    }
  }

  // Migrate tasks
  if (dbData.tasks) {
    console.log("Migrating tasks...");
    for (const userId of Object.keys(dbData.tasks)) {
      const userTasks = dbData.tasks[userId];
      if (Array.isArray(userTasks)) {
        for (const task of userTasks) {
          task.userId = userId;
          await setDoc(doc(db, 'tasks', task.id), task);
          console.log(`Migrated task: ${task.title} for user ${userId}`);
        }
      }
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
