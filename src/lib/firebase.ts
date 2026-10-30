import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

// Clé web Firebase : elle est publique par nature, la sécurité repose sur les règles Firestore.
const firebaseConfig = {
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

export const COLLECTIONS = {
  USERS: "fortico_users",
  MOTORS: "fortico_motors",
  ACTIVITIES: "fortico_activities",
  MOTOR_TYPES: "fortico_motor_types",
  REPORTS: "fortico_reports",
  WEB_REQUESTS: "fortico_web_requests",
  FAULT_TYPES: "fortico_fault_types",
} as const;
