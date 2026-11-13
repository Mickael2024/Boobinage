import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Clé web Firebase : elle est publique par nature, la sécurité repose sur Firebase Auth
// et les règles firestore.rules / storage.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyBP5qlIhgbVIY-0p57Oc7YOLk5EJGEf6SQ",
  authDomain: "jeff-elec.firebaseapp.com",
  projectId: "jeff-elec",
  storageBucket: "jeff-elec.firebasestorage.app",
  messagingSenderId: "990314301369",
  appId: "1:990314301369:web:095f42977469a49020d868",
};

export const app = initializeApp(firebaseConfig);
// les champs optionnels non renseignés (undefined) sont ignorés au lieu de faire échouer l'écriture
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const auth = getAuth(app);
auth.languageCode = "fr";
export const storage = getStorage(app);
// sans bucket (forfait gratuit) l'envoi échoue vite au lieu de réessayer 10 min : repli data-URL
storage.maxUploadRetryTime = 20_000;
storage.maxOperationRetryTime = 20_000;

export const COLLECTIONS = {
  // collections historiques : noms conservés (données en production)
  USERS: "fortico_users",
  MOTORS: "fortico_motors",
  ACTIVITIES: "fortico_activities",
  MOTOR_TYPES: "fortico_motor_types",
  REPORTS: "fortico_reports",
  WEB_REQUESTS: "fortico_web_requests",
  FAULT_TYPES: "fortico_fault_types",
  // gestion commerciale
  CLIENTS: "clients",
  QUOTES: "quotes",
  INVOICES: "invoices",
  PAYMENTS: "payments",
  CATALOG: "catalog",
  SETTINGS: "settings",
  COUNTERS: "counters",
} as const;
