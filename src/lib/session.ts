import { useSyncExternalStore } from "react";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  inMemoryPersistence,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User as AuthUser,
} from "firebase/auth";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { addActivity, getUserById, initializeStorage, setUserProfile, updateUser } from "./db";
import { auth, COLLECTIONS, db, firebaseConfig } from "./firebase";
import type { Role, SessionUser } from "./types";

// Session = compte Firebase Auth + profil Firestore `fortico_users/{uid}` (rôle, approbation).
// Aucun mot de passe ne transite par Firestore.
// « Se souvenir de moi » : persistance locale (30 jours max), sinon persistance de l'onglet.

const REMEMBER_KEY = "jeffelec_remember_until";
const SESSION_DAYS = 30;

type State = { ready: boolean; user: SessionUser | null };
let state: State = { ready: false, user: null };
const listeners = new Set<() => void>();
function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** Un profil donne accès s'il est admin, ou technicien approuvé. */
const allowed = (p: SessionUser | null): p is SessionUser => !!p && (p.role === "admin" || (p.role === "user" && p.approved === true));

function rememberExpired() {
  try {
    const until = Number(localStorage.getItem(REMEMBER_KEY) || 0);
    return until > 0 && until < Date.now();
  } catch {
    return false;
  }
}
function setRemember(remember: boolean) {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, String(Date.now() + SESSION_DAYS * 864e5));
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* stockage indisponible (navigation privée) */
  }
}

// Profil suivi en temps réel : compte désapprouvé, rôle modifié ou profil supprimé => déconnexion.
let stopProfile: Unsubscribe | null = null;
function watchProfile(uid: string) {
  stopProfile?.();
  stopProfile = onSnapshot(
    doc(db, COLLECTIONS.USERS, uid),
    (snap) => {
      const profile = snap.exists() ? ({ id: snap.id, ...snap.data() } as SessionUser) : null;
      if (!allowed(profile)) {
        void logout();
        return;
      }
      setState({ user: profile });
    },
    (err) => console.warn("Suivi du profil interrompu :", err.message),
  );
}

async function loadProfile(authUser: AuthUser) {
  const profile = (await getUserById(authUser.uid)) as SessionUser | null;
  // email modifié via verifyBeforeUpdateEmail : on resynchronise le profil
  if (profile && authUser.email && profile.email !== authUser.email) {
    await updateUser(profile.id, { email: authUser.email }).catch(() => undefined);
    profile.email = authUser.email;
  }
  return profile;
}

onAuthStateChanged(auth, async (authUser) => {
  if (!authUser) {
    stopProfile?.();
    stopProfile = null;
    setState({ ready: true, user: null });
    return;
  }
  if (rememberExpired()) {
    setRemember(false);
    await signOut(auth);
    return;
  }
  try {
    const profile = await loadProfile(authUser);
    if (!allowed(profile)) {
      await signOut(auth);
      return;
    }
    setState({ ready: true, user: profile });
    watchProfile(authUser.uid);
    if (profile.role === "admin") void initializeStorage();
  } catch (e) {
    console.warn("Profil indisponible :", e);
    setState({ ready: true, user: null });
  }
});

export const getCurrentUser = () => state.user;

export function useCurrentUser() {
  return useSyncExternalStore(subscribe, () => state.user);
}

/** false tant que Firebase Auth n'a pas restauré la session au chargement de la page. */
export function useAuthReady() {
  return useSyncExternalStore(subscribe, () => state.ready);
}

/** Résout quand l'état d'authentification initial est connu. */
export function whenAuthReady() {
  if (state.ready) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const off = subscribe(() => {
      if (state.ready) {
        off();
        resolve();
      }
    });
  });
}

/** @deprecated la session est validée par Firebase Auth ; conservé pour compatibilité. */
export const validateRememberedSession = (_expectedRole?: Role) => whenAuthReady();

/** Met à jour l'affichage local (le profil Firestore est suivi en temps réel de toute façon). */
export function updateCurrentUser(changes: Partial<SessionUser>) {
  if (state.user) setState({ user: { ...state.user, ...changes } });
}

export async function logout() {
  stopProfile?.();
  stopProfile = null;
  setRemember(false);
  setState({ user: null });
  await signOut(auth).catch(() => undefined);
}

type AuthResult = { success: true; user: SessionUser } | { success: false; message: string };

function authMessage(code: string, role: Role) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return role === "admin" ? "Accès refusé" : "Identifiants invalides";
    case "auth/user-disabled":
      return "Compte désactivé";
    case "auth/too-many-requests":
      return "Trop de tentatives : réessayez dans quelques minutes";
    case "auth/network-request-failed":
      return "Pas de connexion réseau";
    default:
      return "Erreur de connexion";
  }
}
const codeOf = (e: unknown) => (e as { code?: string })?.code ?? "";

export async function authenticate(role: Role, email: string, password: string, remember: boolean): Promise<AuthResult> {
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    setRemember(remember); // avant la connexion : onAuthStateChanged vérifie l'échéance
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await loadProfile(cred.user);
    if (!profile || profile.role !== role) {
      await signOut(auth);
      return { success: false, message: role === "admin" ? "Accès refusé" : "Identifiants invalides" };
    }
    if (!allowed(profile)) {
      await signOut(auth);
      return { success: false, message: "Compte en attente d'approbation par l'administrateur" };
    }
    setState({ ready: true, user: profile });
    await addActivity(
      role === "admin"
        ? { type: "admin_login", userId: profile.id, description: "Admin connecté" }
        : { type: "login", userId: profile.id, description: `${profile.name} connecté` },
    ).catch(() => undefined);
    return { success: true, user: profile };
  } catch (e) {
    console.warn(e);
    return { success: false, message: authMessage(codeOf(e), role) };
  }
}

// === GESTION DES COMPTES (admin) ===

const ACCOUNT_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "Cet email est déjà utilisé",
  "auth/invalid-email": "Email invalide",
  "auth/weak-password": "Mot de passe trop faible (6 caractères minimum)",
  "auth/wrong-password": "Mot de passe actuel incorrect",
  "auth/invalid-credential": "Mot de passe actuel incorrect",
  "auth/too-many-requests": "Trop de tentatives : réessayez plus tard",
  "auth/requires-recent-login": "Reconnectez-vous puis réessayez",
  "auth/network-request-failed": "Pas de connexion réseau",
};
/** Message français pour une erreur Firebase Auth. */
export const accountErrorMessage = (e: unknown, fallback = "Opération impossible") => ACCOUNT_ERRORS[codeOf(e)] ?? (e instanceof Error && !codeOf(e) ? e.message : fallback);

/**
 * Crée un compte technicien (Auth + profil) sans déconnecter l'admin :
 * le compte est créé via une instance Firebase secondaire, en mémoire.
 */
export async function createTechnician(input: { name: string; email: string; password: string; approved: boolean; company?: string }) {
  let secondary: FirebaseApp | null = null;
  try {
    secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = initializeAuth(secondary, { persistence: inMemoryPersistence });
    const cred = await createUserWithEmailAndPassword(secondaryAuth, input.email.trim(), input.password);
    await signOut(secondaryAuth);
    // le profil est écrit par l'admin (instance principale) : seuls les admins peuvent créer des profils
    return await setUserProfile(cred.user.uid, {
      name: input.name.trim(),
      email: input.email.trim(),
      company: input.company,
      role: "user",
      approved: input.approved,
    });
  } finally {
    if (secondary) await deleteApp(secondary).catch(() => undefined);
  }
}

/** Envoie l'email Firebase de réinitialisation du mot de passe. */
export const sendPasswordReset = (email: string) => sendPasswordResetEmail(auth, email.trim());

/** Change le mot de passe du compte connecté (réauthentification exigée par Firebase). */
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const u = auth.currentUser;
  if (!u?.email) throw new Error("Session expirée, reconnectez-vous");
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, currentPassword));
  await updatePassword(u, newPassword);
}

/**
 * Change l'email de connexion du compte connecté : Firebase envoie un lien de confirmation
 * à la nouvelle adresse ; le profil est resynchronisé à la connexion suivante.
 */
export async function changeOwnEmail(currentPassword: string, newEmail: string) {
  const u = auth.currentUser;
  if (!u?.email) throw new Error("Session expirée, reconnectez-vous");
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, currentPassword));
  await verifyBeforeUpdateEmail(u, newEmail.trim());
}
