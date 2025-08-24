
import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";


const firebaseConfig = {
  projectId: 'picvote-h2ow0',
  appId: '1:264559552753:web:e3296393a7b755d59da150',
  storageBucket: 'picvote-h2ow0.firebasestorage.app',
  apiKey: 'AIzaSyD9PJNtR7WLhjCbDbhdCgK0Zn3Y4_d8l3E',
  authDomain: 'picvote-h2ow0.firebaseapp.com',
  messagingSenderId: '264559552753',
  databaseURL: 'https://picvote-h2ow0-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export { app, db, rtdb, storage, auth, analytics };
