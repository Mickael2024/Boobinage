import { useSyncExternalStore } from "react";
import { addActivity, getUserByEmail } from "./db";
import type { Role, SessionUser, User } from "./types";

// Session : jamais de mot de passe stocké. "Se souvenir de moi" => localStorage pendant 30 jours,
// sinon sessionStorage (fin de session à la fermeture de l'onglet).
const KEY = "currentUser";
const SESSION_DAYS = 30;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(): SessionUser | null {
  try {
    const sess = sessionStorage.getItem(KEY);
    if (sess) return JSON.parse(sess);
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { user, exp } = JSON.parse(raw);
    if (!user || !exp || exp < Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

// cache : useSyncExternalStore exige une référence stable entre deux lectures
let current = read();

function isRemembered() {
  try {
    return !sessionStorage.getItem(KEY) && !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function setCurrentUser(user: User | SessionUser, remember = false) {
  const { password: _password, ...safe } = user as User;
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
    if (remember) localStorage.setItem(KEY, JSON.stringify({ user: safe, exp: Date.now() + SESSION_DAYS * 864e5 }));
    else sessionStorage.setItem(KEY, JSON.stringify(safe));
  } catch {
    /* stockage indisponible (navigation privée) : la session vit en mémoire */
  }
  current = safe;
  emit();
}

/** Met à jour les champs modifiés en gardant le même mode de session. */
export function updateCurrentUser(changes: Partial<SessionUser>) {
  if (current) setCurrentUser({ ...current, ...changes }, isRemembered());
}

export function logout() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  current = null;
  emit();
}

export const getCurrentUser = () => current;

export function useCurrentUser() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

/** Session mémorisée : vérifie que le compte existe toujours et est toujours autorisé. */
export async function validateRememberedSession(expectedRole: Role) {
  if (!isRemembered() || !current) return;
  try {
    const fresh = await getUserByEmail(current.email);
    if (!fresh || fresh.role !== expectedRole || (expectedRole === "user" && !fresh.approved)) logout();
    else setCurrentUser(fresh, true);
  } catch {
    /* hors-ligne : on garde la session */
  }
}

type AuthResult = { success: true; user: SessionUser } | { success: false; message: string };

export async function authenticate(role: Role, email: string, password: string, remember: boolean): Promise<AuthResult> {
  try {
    const u = await getUserByEmail(email.trim());
    const ok = u && u.role === role && u.password === password && (role === "admin" || u.approved);
    if (!ok) return { success: false, message: role === "admin" ? "Accès refusé" : "Identifiants invalides" };
    setCurrentUser(u, remember);
    await addActivity(
      role === "admin"
        ? { type: "admin_login", userId: u.id, description: "Admin connecté" }
        : { type: "login", userId: u.id, description: `${u.name} connecté` },
    );
    return { success: true, user: u };
  } catch {
    return { success: false, message: "Erreur de connexion" };
  }
}
