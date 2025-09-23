// src/app/firebase.ts
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCRWqmuYtcTyAm-HcpQWguV2gaN7sMVm1g",
  authDomain: "resqalert-22692.firebaseapp.com",
  databaseURL: "https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "resqalert-22692",
  storageBucket: "resqalert-22692.firebasestorage.app",
  messagingSenderId: "240921344477",
  appId: "1:240921344477:web:9143b03af772602de5de34",
  measurementId: "G-M0Y0HQ1S7R"
};

// 👇 Initialize app only once
const app = initializeApp(firebaseConfig);

// 👇 Export database instance
export const db = getDatabase(app);
