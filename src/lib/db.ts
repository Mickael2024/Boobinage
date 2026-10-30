import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { COLLECTIONS, db } from "./firebase";
import { DEFAULT_MOTOR_TYPES, getDefaultSteps } from "./defaults";
import type {
  Activity,
  FaultType,
  MessageStatus,
  Motor,
  MotorStep,
  MotorType,
  Report,
  StepTemplate,
  User,
  WebRequest,
} from "./types";

type Col = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
type New<T> = Omit<T, "id">;

const now = () => new Date().toISOString();
const rows = <T>(snap: QuerySnapshot<DocumentData>) => snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

async function getById<T>(col: Col, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}
async function create<T extends object>(col: Col, data: T): Promise<T & { id: string }> {
  const ref = await addDoc(collection(db, col), data);
  return { id: ref.id, ...data };
}
async function patch<T extends object>(col: Col, id: string, updates: T) {
  const data = { ...updates, updatedAt: now() };
  await updateDoc(doc(db, col, id), data);
  return { id, ...data };
}
const remove = (col: Col, id: string) => deleteDoc(doc(db, col, id));

// === TYPES DE MOTEURS (modèles prédéfinis) ===
export async function getMotorTypes() {
  return rows<MotorType>(await getDocs(collection(db, COLLECTIONS.MOTOR_TYPES)));
}
export const getMotorTypeById = (id: string) => getById<MotorType>(COLLECTIONS.MOTOR_TYPES, id);

export async function saveMotorType(motorType: New<MotorType>) {
  const customSteps = motorType.customSteps?.length
    ? motorType.customSteps
    : getDefaultSteps(motorType.motorType).map((s) => ({ ...s, id: uid("s") }));
  return create(COLLECTIONS.MOTOR_TYPES, { ...motorType, customSteps, createdAt: now() });
}
export const updateMotorType = (id: string, updates: Partial<New<MotorType>>) => patch(COLLECTIONS.MOTOR_TYPES, id, updates);
export const deleteMotorType = (id: string) => remove(COLLECTIONS.MOTOR_TYPES, id);

export async function addStepToMotorType(typeId: string, step: StepTemplate) {
  const type = await getMotorTypeById(typeId);
  if (!type) return null;
  const ns = { id: uid("s"), name: step.name, substeps: step.substeps || [] };
  await updateMotorType(typeId, { customSteps: [...(type.customSteps || []), ns] });
  return ns;
}
export async function updateStepInMotorType(typeId: string, stepId: string, updates: Partial<StepTemplate>) {
  const type = await getMotorTypeById(typeId);
  if (!type?.customSteps) return null;
  const customSteps = type.customSteps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
  await updateMotorType(typeId, { customSteps });
  return customSteps.find((s) => s.id === stepId) ?? null;
}
export async function deleteStepFromMotorType(typeId: string, stepId: string) {
  const type = await getMotorTypeById(typeId);
  if (!type?.customSteps) return false;
  await updateMotorType(typeId, { customSteps: type.customSteps.filter((s) => s.id !== stepId) });
  return true;
}

// === TYPES DE PANNE + DIAGNOSTIC ===
export async function getFaultTypes() {
  const list = rows<FaultType>(await getDocs(collection(db, COLLECTIONS.FAULT_TYPES)));
  return list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
}
export const saveFaultType = (ft: New<FaultType>) => create(COLLECTIONS.FAULT_TYPES, { ...ft, createdAt: now() });
export const updateFaultType = (id: string, updates: Partial<New<FaultType>>) => patch(COLLECTIONS.FAULT_TYPES, id, updates);
export const deleteFaultType = (id: string) => remove(COLLECTIONS.FAULT_TYPES, id);

// === UTILISATEURS ===
export async function getUsers() {
  return rows<User>(await getDocs(collection(db, COLLECTIONS.USERS)));
}
export async function getUserByEmail(email: string) {
  const snap = await getDocs(query(collection(db, COLLECTIONS.USERS), where("email", "==", email)));
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as User);
}
export const saveUser = (user: New<User>) => create(COLLECTIONS.USERS, { ...user, createdAt: now() });
export const updateUser = (id: string, updates: Partial<New<User>>) => patch(COLLECTIONS.USERS, id, updates);
export const deleteUser = (id: string) => remove(COLLECTIONS.USERS, id);

// === MOTEURS ===
export async function getMotors() {
  return rows<Motor>(await getDocs(query(collection(db, COLLECTIONS.MOTORS), orderBy("createdAt", "desc"))));
}
export const getMotorById = (id: string) => getById<Motor>(COLLECTIONS.MOTORS, id);

export async function saveMotor(motor: Omit<New<Motor>, "steps" | "status" | "createdAt">) {
  const template = motor.templateId ? await getMotorTypeById(motor.templateId) : null;
  const source: StepTemplate[] = template?.customSteps || getDefaultSteps(motor.motorType);
  const steps: MotorStep[] = source.map((s) => ({
    ...s,
    id: s.id || uid("s"),
    completed: false,
    validated: false,
    completedAt: null,
    validatedAt: null,
    validatedBy: null,
    substepsCompleted: new Array(s.substeps.length).fill(false),
  }));
  const saved = await create(COLLECTIONS.MOTORS, { ...motor, steps, status: "pending" as const, createdAt: now() });
  await addActivity({ type: "motor_created", userId: motor.userId, motorId: saved.id, description: `Moteur ${motor.clientName || ""} enregistré` });
  return saved;
}
export const updateMotor = (id: string, updates: Partial<New<Motor>>) => patch(COLLECTIONS.MOTORS, id, updates);

function motorStatus(steps: MotorStep[]): Motor["status"] {
  if (steps.every((s) => s.validated)) return "completed";
  return steps.some((s) => s.completed) ? "in_progress" : "pending";
}

export async function updateMotorSubstep(motorId: string, stepId: string, substepIndex: number, completed: boolean) {
  const motor = await getMotorById(motorId);
  const step = motor?.steps.find((s) => s.id === stepId);
  if (!motor || !step) return null;
  if (!step.substepsCompleted) step.substepsCompleted = new Array(step.substeps.length).fill(false);
  step.substepsCompleted[substepIndex] = completed;
  const allDone = step.substepsCompleted.every(Boolean);
  step.completed = allDone;
  step.completedAt = allDone ? now() : null;
  if (!allDone) Object.assign(step, { validated: false, validatedAt: null, validatedBy: null });
  motor.status = motorStatus(motor.steps);
  await updateMotor(motorId, { steps: motor.steps, status: motor.status });
  return motor;
}

export async function validateMotorStep(motorId: string, stepId: string, adminId: string) {
  const motor = await getMotorById(motorId);
  const step = motor?.steps.find((s) => s.id === stepId);
  if (!motor || !step) return null;
  Object.assign(step, { validated: true, validatedAt: now(), validatedBy: adminId });
  motor.status = motor.steps.every((s) => s.validated) ? "completed" : "in_progress";
  await updateMotor(motorId, { steps: motor.steps, status: motor.status });
  await addActivity({ type: "step_validated", userId: adminId, motorId, description: "Étape validée" });
  return motor;
}

// === ACTIVITÉ ===
export async function addActivity(activity: Omit<Activity, "id" | "timestamp">) {
  await addDoc(collection(db, COLLECTIONS.ACTIVITIES), { ...activity, timestamp: now() });
}
export async function getActivities(limitCount = 20) {
  return rows<Activity>(await getDocs(query(collection(db, COLLECTIONS.ACTIVITIES), orderBy("timestamp", "desc"), limit(limitCount))));
}

// === RAPPORTS ===
export async function getReports() {
  return rows<Report>(await getDocs(query(collection(db, COLLECTIONS.REPORTS), orderBy("createdAt", "desc"))));
}
export const getReportById = (id: string) => getById<Report>(COLLECTIONS.REPORTS, id);
export async function getReportsByMotor(motorId: string) {
  const list = rows<Report>(await getDocs(query(collection(db, COLLECTIONS.REPORTS), where("motorId", "==", motorId))));
  // tri côté client : évite d'exiger un index composite Firestore
  return list.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}
export async function saveReport(report: Omit<New<Report>, "status" | "createdAt">) {
  const saved = await create(COLLECTIONS.REPORTS, { ...report, status: "unread" as const, createdAt: now() });
  await addActivity({ type: "report_created", userId: report.userId, motorId: report.motorId, description: "Rapport envoyé" });
  return saved;
}
export const updateReport = (id: string, updates: Partial<New<Report>>) => patch(COLLECTIONS.REPORTS, id, updates);
export const deleteReport = (id: string) => remove(COLLECTIONS.REPORTS, id);

/** Nombre de rapports non lus, en temps réel. Renvoie la fonction de désabonnement. */
export function watchUnreadReports(onCount: (n: number) => void) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.REPORTS), where("status", "==", "unread")),
    (snap) => onCount(snap.size),
    (err) => console.warn("Pastille rapports indisponible :", err.message),
  );
}

// === DEMANDES DE DEVIS (site web) ===
export async function getWebRequests() {
  return rows<WebRequest>(await getDocs(query(collection(db, COLLECTIONS.WEB_REQUESTS), orderBy("createdAt", "desc"))));
}
export async function saveWebRequest(req: Omit<New<WebRequest>, "status" | "createdAt">) {
  await addDoc(collection(db, COLLECTIONS.WEB_REQUESTS), { ...req, status: "new", createdAt: serverTimestamp() });
}
export const setWebRequestStatus = (id: string, status: MessageStatus) => updateDoc(doc(db, COLLECTIONS.WEB_REQUESTS, id), { status });
export const deleteWebRequest = (id: string) => remove(COLLECTIONS.WEB_REQUESTS, id);

// === INITIALISATION (données par défaut) ===
let seeding: Promise<void> | null = null;
export function initializeStorage() {
  return (seeding ||= (async () => {
    if (!(await getUserByEmail("admin@fortico.com")))
      await saveUser({ name: "Administrateur", email: "admin@fortico.com", password: "admin123", role: "admin", company: "Fortico", approved: true });
    if (!(await getMotorTypes()).length) for (const t of DEFAULT_MOTOR_TYPES) await saveMotorType(t);
  })().catch((e) => {
    seeding = null;
    console.warn("Initialisation des données par défaut impossible :", e);
  }));
}
