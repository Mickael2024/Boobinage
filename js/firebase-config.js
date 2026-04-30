// ==========================================
// CONFIGURATION FIREBASE - FORTICO REWIND
// ==========================================

// Import Firebase modules (CDN)
import {
  initializeApp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBP5qlIhgbVIY-0p57Oc7YOLk5EJGEf6SQ",
    authDomain: "jeff-elec.firebaseapp.com",
    projectId: "jeff-elec",
    storageBucket: "jeff-elec.firebasestorage.app",
    messagingSenderId: "990314301369",
    appId: "1:990314301369:web:095f42977469a49020d868",
    measurementId: "G-KZMEPBDDV1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Références des collections
const COLLECTIONS = {
    USERS: 'users',
    MOTORS: 'motors',
    ACTIVITIES: 'activities',
    MOTOR_TYPES: 'motor_types',
    REPORTS: 'reports',
    WEB_REQUESTS: 'web_requests'
};

console.log('🔥 Firebase initialisé - Projet:', firebaseConfig.projectId);