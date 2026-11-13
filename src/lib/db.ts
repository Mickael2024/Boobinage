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
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QuerySnapshot,
  type Transaction,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { auth, COLLECTIONS, db, storage } from "./firebase";
import { DEFAULT_MOTOR_TYPES, getDefaultSteps } from "./defaults";
import { compressImageToDataUrl, isDataUrl } from "./images";
import { computeTotals, DEFAULT_VAT_RATE, paymentStatus, remainingDue } from "./money";
import { getCurrentUser } from "./session";
import type {
  Activity,
  CatalogItem,
  Client,
  ClientSnapshot,
  CompanySettings,
  CounterType,
  FaultType,
  Invoice,
  MessageStatus,
  Motor,
  MotorStep,
  MotorType,
  Payment,
  Quote,
  QuoteStatus,
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
/** Tri décroissant sur createdAt côté client (évite les index composites Firestore). */
const byCreatedDesc = <T extends { createdAt?: unknown }>(list: T[]) =>
  list.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
const isAdminSession = () => getCurrentUser()?.role === "admin";
/** uid du compte connecté (les règles Firestore filtrent les données du technicien sur ce uid). */
const currentUid = () => auth.currentUser?.uid ?? getCurrentUser()?.id ?? "";

async function getById<T>(col: Col, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}
async function list<T>(col: Col, ...constraints: QueryConstraint[]) {
  return rows<T>(await getDocs(constraints.length ? query(collection(db, col), ...constraints) : collection(db, col)));
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

// === NUMÉROTATION SÉQUENTIELLE (counters/{type}-{année}) ===
const pad = (n: number) => String(n).padStart(4, "0");

/** À appeler dans une transaction APRÈS les autres lectures (Firestore : lectures avant écritures). */
async function allocateNumber(tx: Transaction, type: CounterType, date = new Date()) {
  const year = date.getFullYear();
  const ref = doc(db, COLLECTIONS.COUNTERS, `${type}-${year}`);
  const snap = await tx.get(ref);
  const value = ((snap.exists() ? Number(snap.data().value) : 0) || 0) + 1;
  tx.set(ref, { value, updatedAt: now() });
  return `${type}-${year}-${pad(value)}`;
}

/** Réserve le prochain numéro (OR-2026-0001, DV-…, FA-…, AV-…). Sans trou : un numéro réservé est consommé. */
export function nextNumber(type: CounterType) {
  return runTransaction(db, (tx) => allocateNumber(tx, type));
}

// === TYPES DE MOTEURS (modèles prédéfinis) ===
export const getMotorTypes = () => list<MotorType>(COLLECTIONS.MOTOR_TYPES);
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
  const all = await list<FaultType>(COLLECTIONS.FAULT_TYPES);
  return all.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
}
export const saveFaultType = (ft: New<FaultType>) => create(COLLECTIONS.FAULT_TYPES, { ...ft, createdAt: now() });
export const updateFaultType = (id: string, updates: Partial<New<FaultType>>) => patch(COLLECTIONS.FAULT_TYPES, id, updates);
export const deleteFaultType = (id: string) => remove(COLLECTIONS.FAULT_TYPES, id);

// === UTILISATEURS (profils : id du document = uid Firebase Auth) ===
// Création de compte / mot de passe : voir session.ts (createTechnician, sendPasswordReset…).
export const getUsers = () => list<User>(COLLECTIONS.USERS);
export const getUserById = (id: string) => getById<User>(COLLECTIONS.USERS, id);
/** Admin uniquement (les règles interdisent aux techniciens de lister les profils). */
export async function getUserByEmail(email: string) {
  const found = await list<User>(COLLECTIONS.USERS, where("email", "==", email.trim()), limit(1));
  return found[0] ?? null;
}
/** Crée ou remplace le profil d'un compte Auth existant. */
export async function setUserProfile(id: string, profile: New<User>) {
  const data = { ...profile, createdAt: profile.createdAt ?? now() };
  await setDoc(doc(db, COLLECTIONS.USERS, id), data);
  return { id, ...data } as User;
}
export const updateUser = (id: string, updates: Partial<New<User>>) => patch(COLLECTIONS.USERS, id, updates);
/** Supprime le profil : le compte Auth subsiste mais n'a plus accès à rien (à supprimer dans la console Firebase). */
export const deleteUser = (id: string) => remove(COLLECTIONS.USERS, id);

// === MOTEURS ===
/** Admin : tous les moteurs. Technicien : uniquement les siens (exigé par les règles). */
export async function getMotors() {
  if (isAdminSession()) return list<Motor>(COLLECTIONS.MOTORS, orderBy("createdAt", "desc"));
  return byCreatedDesc(await list<Motor>(COLLECTIONS.MOTORS, where("userId", "==", currentUid())));
}
export const getMotorById = (id: string) => getById<Motor>(COLLECTIONS.MOTORS, id);
export const getMotorsByClient = async (clientId: string) => byCreatedDesc(await list<Motor>(COLLECTIONS.MOTORS, where("clientId", "==", clientId)));

type NewMotor = Omit<New<Motor>, "steps" | "status" | "createdAt" | "orNumber" | "completedAt" | "validationRequestedAt">;

/** Crée le moteur avec ses étapes et lui attribue un n° de dossier OR-AAAA-NNNN (transaction). */
export async function saveMotor(motor: NewMotor) {
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
  const ref = doc(collection(db, COLLECTIONS.MOTORS));
  const data = await runTransaction(db, async (tx) => {
    const orNumber = await allocateNumber(tx, "OR");
    const d = {
      ...motor,
      orNumber,
      steps,
      status: "pending" as const,
      priority: motor.priority ?? ("normal" as const),
      receivedAt: motor.receivedAt || now(),
      createdAt: now(),
    };
    tx.set(ref, d);
    return d;
  });
  await addActivity({ type: "motor_created", userId: motor.userId, motorId: ref.id, description: `Dossier ${data.orNumber} : moteur ${motor.clientName || ""} enregistré` });
  return { id: ref.id, ...data } as Motor;
}
export const updateMotor = (id: string, updates: Partial<New<Motor>>) => patch(COLLECTIONS.MOTORS, id, updates);

/** Admin : supprime le moteur et ses rapports (photos comprises). */
export async function deleteMotor(id: string) {
  const reports = await list<Report>(COLLECTIONS.REPORTS, where("motorId", "==", id));
  await Promise.all(reports.map((r) => deleteReport(r.id, r)));
  await remove(COLLECTIONS.MOTORS, id);
}

function motorStatus(steps: MotorStep[]): Motor["status"] {
  if (steps.length && steps.every((s) => s.validated)) return "completed";
  return steps.some((s) => s.completed || s.validated) ? "in_progress" : "pending";
}

/** Coche / décoche une sous-étape (transaction : pas d'écrasement entre deux postes). */
export function updateMotorSubstep(motorId: string, stepId: string, substepIndex: number, completed: boolean) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, COLLECTIONS.MOTORS, motorId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const motor = { id: snap.id, ...snap.data() } as Motor;
    const step = motor.steps.find((s) => s.id === stepId);
    if (!step) return null;
    if (!step.substepsCompleted) step.substepsCompleted = new Array(step.substeps.length).fill(false);
    step.substepsCompleted[substepIndex] = completed;
    const allDone = step.substepsCompleted.every(Boolean);
    step.completed = allDone;
    step.completedAt = allDone ? step.completedAt || now() : null;
    if (!allDone) Object.assign(step, { validated: false, validatedAt: null, validatedBy: null });
    const status = motorStatus(motor.steps);
    const updates: Partial<Motor> = { steps: motor.steps, status, updatedAt: now() };
    if (status !== "completed" && motor.completedAt) updates.completedAt = null;
    tx.update(ref, updates);
    return { ...motor, ...updates } as Motor;
  });
}

/** Admin : valide une étape ; le moteur passe à « terminé » (completedAt) quand toutes sont validées. */
export async function validateMotorStep(motorId: string, stepId: string, adminId: string) {
  const motor = await runTransaction(db, async (tx) => {
    const ref = doc(db, COLLECTIONS.MOTORS, motorId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const m = { id: snap.id, ...snap.data() } as Motor;
    const step = m.steps.find((s) => s.id === stepId);
    if (!step) return null;
    Object.assign(step, { validated: true, validatedAt: now(), validatedBy: adminId });
    const status = motorStatus(m.steps);
    const updates: Partial<Motor> = {
      steps: m.steps,
      status,
      validationRequestedAt: null,
      completedAt: status === "completed" ? m.completedAt || now() : null,
      updatedAt: now(),
    };
    tx.update(ref, updates);
    return { ...m, ...updates } as Motor;
  });
  if (motor) await addActivity({ type: "step_validated", userId: adminId, motorId, description: "Étape validée" });
  return motor;
}

/** Technicien : signale à l'admin que des étapes attendent sa validation. */
export async function requestMotorValidation(motorId: string) {
  const at = now();
  await patch(COLLECTIONS.MOTORS, motorId, { validationRequestedAt: at });
  await addActivity({ type: "validation_requested", userId: currentUid(), motorId, description: "Demande de validation" });
  return at;
}
export const clearValidationRequest = (motorId: string) => patch(COLLECTIONS.MOTORS, motorId, { validationRequestedAt: null });

// === ACTIVITÉ ===
export async function addActivity(activity: Omit<Activity, "id" | "timestamp">) {
  await addDoc(collection(db, COLLECTIONS.ACTIVITIES), { ...activity, timestamp: now() });
}
export const getActivities = (limitCount = 20) => list<Activity>(COLLECTIONS.ACTIVITIES, orderBy("timestamp", "desc"), limit(limitCount));

// === RAPPORTS ===
export const getReports = () => list<Report>(COLLECTIONS.REPORTS, orderBy("createdAt", "desc"));
export const getReportById = (id: string) => getById<Report>(COLLECTIONS.REPORTS, id);
export async function getReportsByMotor(motorId: string) {
  const filters = [where("motorId", "==", motorId)];
  // le technicien ne peut lister que ses propres rapports
  if (!isAdminSession()) filters.push(where("userId", "==", currentUid()));
  return byCreatedDesc(await list<Report>(COLLECTIONS.REPORTS, ...filters));
}

const INLINE_BUDGET = 850_000; // un document Firestore est limité à 1 Mo

async function inlinePhotos(files: Blob[]) {
  for (const [dim, quality] of [
    [1024, 0.6],
    [800, 0.5],
    [640, 0.45],
  ] as const) {
    const urls = await Promise.all(files.map((f) => compressImageToDataUrl(f, dim, quality)));
    if (urls.reduce((n, u) => n + u.length, 0) <= INLINE_BUDGET) return urls;
  }
  throw new Error("Photos trop lourdes pour être enregistrées sans Firebase Storage");
}

/**
 * Envoie les photos vers Storage `reports/{reportId}/{n}.jpg`.
 * Repli automatique : data-URL compressées dans le document si Storage est indisponible.
 */
async function storeReportPhotos(reportId: string, files: Blob[]): Promise<{ photos: string[]; storage: "storage" | "inline" }> {
  if (!files.length) return { photos: [], storage: "storage" };
  const uploaded: string[] = [];
  try {
    for (const [i, file] of files.entries()) {
      const r = storageRef(storage, `reports/${reportId}/${i + 1}-${Date.now()}.jpg`);
      await uploadBytes(r, file, { contentType: "image/jpeg", customMetadata: { uploadedBy: currentUid() } });
      uploaded.push(await getDownloadURL(r));
    }
    return { photos: uploaded, storage: "storage" };
  } catch (e) {
    console.warn("Firebase Storage indisponible, photos enregistrées dans le document :", e);
    await Promise.all(uploaded.map((u) => deleteObject(storageRef(storage, u)).catch(() => undefined)));
    return { photos: await inlinePhotos(files), storage: "inline" };
  }
}

/**
 * Enregistre un rapport. `files` : photos (déjà compressées de préférence, cf. images.ts).
 * `report.photos` permet encore de passer des URL / data-URL existantes.
 * `photoStorage` indique si le repli data-URL a été utilisé.
 */
export async function saveReport(report: Omit<New<Report>, "status" | "createdAt">, files: Blob[] = []) {
  const ref = doc(collection(db, COLLECTIONS.REPORTS));
  const { photos, storage: photoStorage } = await storeReportPhotos(ref.id, files);
  const data = { ...report, photos: [...(report.photos ?? []), ...photos], status: "unread" as const, createdAt: now() };
  await setDoc(ref, data);
  await addActivity({ type: "report_created", userId: report.userId, motorId: report.motorId, description: "Rapport envoyé" });
  return { id: ref.id, ...data, photoStorage } as Report & { photoStorage: "storage" | "inline" };
}
export const updateReport = (id: string, updates: Partial<New<Report>>) => patch(COLLECTIONS.REPORTS, id, updates);
/** Supprime le rapport et ses photos Storage (au mieux). */
export async function deleteReport(id: string, known?: Report) {
  const report = known ?? (await getReportById(id));
  await remove(COLLECTIONS.REPORTS, id);
  const urls = (report?.photos ?? []).filter((p) => !isDataUrl(p) && p.includes("firebasestorage"));
  await Promise.all(urls.map((u) => deleteObject(storageRef(storage, u)).catch(() => undefined)));
}

/** Nombre de rapports non lus, en temps réel. Renvoie la fonction de désabonnement. */
export function watchUnreadReports(onCount: (n: number) => void) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.REPORTS), where("status", "==", "unread")),
    (snap) => onCount(snap.size),
    (err) => console.warn("Pastille rapports indisponible :", err.message),
  );
}

/** Admin : moteurs en attente de validation, en temps réel. */
export function watchValidationRequests(onCount: (n: number) => void) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.MOTORS), where("validationRequestedAt", ">", "")),
    (snap) => onCount(snap.size),
    (err) => console.warn("Pastille validations indisponible :", err.message),
  );
}

// === DEMANDES DE DEVIS (site web, création publique) ===
export const getWebRequests = () => list<WebRequest>(COLLECTIONS.WEB_REQUESTS, orderBy("createdAt", "desc"));
export const getWebRequestById = (id: string) => getById<WebRequest>(COLLECTIONS.WEB_REQUESTS, id);
export async function saveWebRequest(req: Omit<New<WebRequest>, "status" | "createdAt">) {
  await addDoc(collection(db, COLLECTIONS.WEB_REQUESTS), { ...req, status: "new", createdAt: serverTimestamp() });
}
export const setWebRequestStatus = (id: string, status: MessageStatus) => updateDoc(doc(db, COLLECTIONS.WEB_REQUESTS, id), { status });
export const deleteWebRequest = (id: string) => remove(COLLECTIONS.WEB_REQUESTS, id);

// ============================================================
// GESTION COMMERCIALE (admin uniquement)
// ============================================================

// === PARAMÈTRES ENTREPRISE (settings/company, lisible publiquement) ===
export const DEFAULT_COMPANY: CompanySettings = {
  name: "Jeff Elec",
  address: "",
  phone: "",
  email: "",
  nif: "",
  stat: "",
  rcs: "",
  logoUrl: "",
  bankDetails: "",
  mobileMoney: "",
  vatRate: DEFAULT_VAT_RATE,
  paymentTerms: "Paiement à réception de facture.",
  footer: "",
  quoteValidityDays: 30,
  invoiceDueDays: 30,
};
const companyRef = () => doc(db, COLLECTIONS.SETTINGS, "company");

export async function getCompanySettings(): Promise<CompanySettings> {
  const snap = await getDoc(companyRef());
  return { ...DEFAULT_COMPANY, ...(snap.exists() ? (snap.data() as Partial<CompanySettings>) : {}) };
}
export async function saveCompanySettings(updates: Partial<CompanySettings>) {
  await setDoc(companyRef(), { ...updates, updatedAt: now() }, { merge: true });
}
/** Envoie le logo vers Storage `company/logo-…` et renvoie son URL (à enregistrer dans logoUrl). */
export async function uploadCompanyLogo(file: Blob) {
  const r = storageRef(storage, `company/logo-${Date.now()}`);
  await uploadBytes(r, file, { contentType: file.type || "image/png" });
  return getDownloadURL(r);
}

const addDays = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

// === CLIENTS ===
export async function getClients() {
  const all = await list<Client>(COLLECTIONS.CLIENTS);
  return all.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
}
export const getClientById = (id: string) => getById<Client>(COLLECTIONS.CLIENTS, id);
export const createClient = (client: Omit<New<Client>, "createdAt" | "updatedAt">) => create(COLLECTIONS.CLIENTS, { ...client, createdAt: now() });
export const updateClient = (id: string, updates: Partial<New<Client>>) => patch(COLLECTIONS.CLIENTS, id, updates);
export const deleteClient = (id: string) => remove(COLLECTIONS.CLIENTS, id);

/** Copie figée des coordonnées client (devis / facture). */
export function clientSnapshot(c: Partial<Client>): ClientSnapshot {
  const s: ClientSnapshot = { name: c.name ?? "" };
  for (const k of ["company", "phone", "email", "address", "nif", "stat"] as const) if (c[k]) s[k] = c[k];
  return s;
}

// === CATALOGUE DE PRESTATIONS ===
export async function getCatalog() {
  const all = await list<CatalogItem>(COLLECTIONS.CATALOG);
  return all.sort((a, b) => (a.category || "").localeCompare(b.category || "", "fr") || a.designation.localeCompare(b.designation, "fr"));
}
export const saveCatalogItem = (item: Omit<New<CatalogItem>, "createdAt" | "updatedAt">) => create(COLLECTIONS.CATALOG, { active: true, ...item, createdAt: now() });
export const updateCatalogItem = (id: string, updates: Partial<New<CatalogItem>>) => patch(COLLECTIONS.CATALOG, id, updates);
export const deleteCatalogItem = (id: string) => remove(COLLECTIONS.CATALOG, id);

// === DEVIS ===
export interface DocFilter {
  clientId?: string;
  motorId?: string;
}
function filters({ clientId, motorId }: DocFilter = {}) {
  const f: QueryConstraint[] = [];
  if (clientId) f.push(where("clientId", "==", clientId));
  if (motorId) f.push(where("motorId", "==", motorId));
  return f;
}

export const getQuotes = async (filter?: DocFilter) => byCreatedDesc(await list<Quote>(COLLECTIONS.QUOTES, ...filters(filter)));
export const getQuoteById = (id: string) => getById<Quote>(COLLECTIONS.QUOTES, id);

export type NewQuote = Omit<New<Quote>, "number" | "totals" | "status" | "validUntil" | "vatRate" | "createdAt" | "updatedAt" | "sentAt" | "acceptedAt"> &
  Partial<Pick<Quote, "status" | "validUntil" | "vatRate">>;

/** Crée un devis numéroté DV-AAAA-NNNN (totaux calculés). */
export async function createQuote(quote: NewQuote) {
  const settings = await getCompanySettings();
  const vatRate = quote.vatRate ?? settings.vatRate;
  const ref = doc(collection(db, COLLECTIONS.QUOTES));
  const data = await runTransaction(db, async (tx) => {
    const number = await allocateNumber(tx, "DV");
    const d = {
      ...quote,
      number,
      vatRate,
      totals: computeTotals(quote.lines, vatRate),
      status: quote.status ?? ("draft" as const),
      validUntil: quote.validUntil ?? addDays(settings.quoteValidityDays),
      createdAt: now(),
    };
    tx.set(ref, d);
    return d;
  });
  return { id: ref.id, ...data } as Quote;
}

/** Modifie un devis ; les totaux sont recalculés si les lignes ou la TVA changent. */
export async function updateQuote(id: string, updates: Partial<Omit<New<Quote>, "number" | "totals">>) {
  let data: Partial<New<Quote>> = updates;
  if (updates.lines || updates.vatRate !== undefined) {
    const current = await getQuoteById(id);
    if (!current) throw new Error("Devis introuvable");
    data = { ...updates, totals: computeTotals(updates.lines ?? current.lines, updates.vatRate ?? current.vatRate) };
  }
  return patch(COLLECTIONS.QUOTES, id, data);
}
export function setQuoteStatus(id: string, status: QuoteStatus) {
  const extra = status === "sent" ? { sentAt: now() } : status === "accepted" ? { acceptedAt: now() } : {};
  return patch(COLLECTIONS.QUOTES, id, { status, ...extra });
}
export const deleteQuote = (id: string) => remove(COLLECTIONS.QUOTES, id);

// === FACTURES ===
export const getInvoices = async (filter?: DocFilter) => byCreatedDesc(await list<Invoice>(COLLECTIONS.INVOICES, ...filters(filter)));
export const getInvoiceById = (id: string) => getById<Invoice>(COLLECTIONS.INVOICES, id);

export type NewInvoice = Omit<
  New<Invoice>,
  "number" | "totals" | "status" | "amountPaid" | "type" | "issuedAt" | "dueDate" | "vatRate" | "cancelledAt" | "createdAt" | "updatedAt"
> &
  Partial<Pick<Invoice, "type" | "dueDate" | "vatRate">>;

/** Crée une facture en brouillon (sans numéro : il est attribué par issueInvoice). */
export async function createInvoice(invoice: NewInvoice) {
  const settings = await getCompanySettings();
  const vatRate = invoice.vatRate ?? settings.vatRate;
  return create(COLLECTIONS.INVOICES, {
    ...invoice,
    type: invoice.type ?? "invoice",
    number: null,
    vatRate,
    totals: computeTotals(invoice.lines, vatRate),
    status: "draft",
    amountPaid: 0,
    dueDate: invoice.dueDate ?? addDays(settings.invoiceDueDays),
    createdAt: now(),
  } satisfies New<Invoice>) as Promise<Invoice>;
}

/** Facture brouillon à partir d'un devis (le devis passe à « accepté »). */
export async function createInvoiceFromQuote(quoteId: string) {
  const q = await getQuoteById(quoteId);
  if (!q) throw new Error("Devis introuvable");
  const inv = await createInvoice({
    quoteId: q.id,
    clientId: q.clientId,
    client: q.client,
    motorId: q.motorId,
    lines: q.lines,
    vatRate: q.vatRate,
    notes: q.notes,
  });
  if (q.status !== "accepted") await setQuoteStatus(q.id, "accepted");
  return inv;
}

/** Modifie une facture brouillon (une facture émise est figée : faire un avoir). */
export async function updateInvoice(id: string, updates: Partial<Omit<New<Invoice>, "number" | "totals" | "status" | "amountPaid" | "issuedAt">>) {
  const current = await getInvoiceById(id);
  if (!current) throw new Error("Facture introuvable");
  if (current.status !== "draft") throw new Error("Facture émise : modification impossible, établissez un avoir");
  const data = { ...updates, totals: computeTotals(updates.lines ?? current.lines, updates.vatRate ?? current.vatRate) };
  return patch(COLLECTIONS.INVOICES, id, data);
}
export async function deleteInvoice(id: string) {
  const current = await getInvoiceById(id);
  if (current && current.status !== "draft") throw new Error("Seul un brouillon peut être supprimé");
  await remove(COLLECTIONS.INVOICES, id);
}

/**
 * Émet la facture : numéro définitif FA-AAAA-NNNN (AV-… pour un avoir), date d'émission, totaux figés.
 * Un avoir total annule la facture d'origine.
 */
export function issueInvoice(id: string) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, COLLECTIONS.INVOICES, id);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Facture introuvable");
    const inv = { id: snap.id, ...snap.data() } as Invoice;
    if (inv.status !== "draft") throw new Error("Facture déjà émise");
    if (!inv.lines?.length) throw new Error("La facture ne contient aucune ligne");
    const origin = inv.type === "credit_note" && inv.creditOf ? await tx.get(doc(db, COLLECTIONS.INVOICES, inv.creditOf)) : null;
    const totals = computeTotals(inv.lines, inv.vatRate);
    if (origin?.exists() && origin.data().status === "cancelled") throw new Error("La facture d'origine est déjà annulée");
    const number = await allocateNumber(tx, inv.type === "credit_note" ? "AV" : "FA");
    const updates = { number, totals, status: "issued" as const, issuedAt: now(), updatedAt: now() };
    tx.update(ref, updates);
    if (origin?.exists()) {
      // l'avoir réduit le reste à payer de la facture d'origine ; un avoir total l'annule
      const o = origin.data() as Invoice;
      const originTtc = Number(o.totals?.ttc ?? 0);
      const credited = Number(o.creditedAmount ?? 0) + totals.ttc;
      if (credited > originTtc) throw new Error("Le total des avoirs dépasse le montant de la facture d'origine");
      if (credited >= originTtc) tx.update(origin.ref, { creditedAmount: credited, status: "cancelled", cancelledAt: now(), updatedAt: now() });
      else if (o.status !== "cancelled")
        tx.update(origin.ref, { creditedAmount: credited, status: paymentStatus(originTtc, o.amountPaid || 0, credited), updatedAt: now() });
    }
    return { ...inv, ...updates } as Invoice;
  });
}

/** Annule une facture émise sans règlement (le numéro reste consommé). Sinon : avoir. */
export async function cancelInvoice(id: string) {
  const inv = await getInvoiceById(id);
  if (!inv) throw new Error("Facture introuvable");
  if (inv.amountPaid > 0) throw new Error("Facture déjà réglée en partie : établissez un avoir");
  return patch(COLLECTIONS.INVOICES, id, { status: "cancelled", cancelledAt: now() });
}

/** Avoir (brouillon) reprenant les lignes d'une facture émise. */
export async function createCreditNote(invoiceId: string) {
  const inv = await getInvoiceById(invoiceId);
  if (!inv || inv.status === "draft") throw new Error("Seule une facture émise peut faire l'objet d'un avoir");
  return createInvoice({
    type: "credit_note",
    creditOf: inv.id,
    clientId: inv.clientId,
    client: inv.client,
    motorId: inv.motorId,
    lines: inv.lines,
    vatRate: inv.vatRate,
    dueDate: now(),
    notes: `Avoir sur facture ${inv.number ?? ""}`.trim(),
  });
}

// === PAIEMENTS ===
export async function getPayments(filter: { invoiceId?: string; clientId?: string } = {}) {
  const f: QueryConstraint[] = [];
  if (filter.invoiceId) f.push(where("invoiceId", "==", filter.invoiceId));
  if (filter.clientId) f.push(where("clientId", "==", filter.clientId));
  const all = await list<Payment>(COLLECTIONS.PAYMENTS, ...f);
  return all.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** Enregistre un règlement et met à jour amountPaid / statut de la facture (transaction). */
export function addPayment(payment: Omit<New<Payment>, "createdAt" | "clientId">) {
  return runTransaction(db, async (tx) => {
    const invRef = doc(db, COLLECTIONS.INVOICES, payment.invoiceId);
    const snap = await tx.get(invRef);
    if (!snap.exists()) throw new Error("Facture introuvable");
    const inv = { id: snap.id, ...snap.data() } as Invoice;
    if (inv.type === "credit_note") throw new Error("Un avoir ne reçoit pas de règlement");
    if (inv.status !== "issued" && inv.status !== "partially_paid") throw new Error("Cette facture n'attend pas de règlement");
    const amount = Math.round(Number(payment.amount));
    if (!(amount > 0)) throw new Error("Montant invalide");
    if (amount > remainingDue(inv)) throw new Error("Montant supérieur au reste à payer");
    const amountPaid = (inv.amountPaid || 0) + amount;
    const payRef = doc(collection(db, COLLECTIONS.PAYMENTS));
    const data = { ...payment, amount, clientId: inv.clientId, createdAt: now() };
    tx.set(payRef, data);
    tx.update(invRef, { amountPaid, status: paymentStatus(inv.totals.ttc, amountPaid, inv.creditedAmount), updatedAt: now() });
    return { id: payRef.id, ...data } as Payment;
  });
}

/** Supprime un règlement saisi par erreur (la facture est recalculée). */
export function deletePayment(id: string) {
  return runTransaction(db, async (tx) => {
    const payRef = doc(db, COLLECTIONS.PAYMENTS, id);
    const pay = await tx.get(payRef);
    if (!pay.exists()) return;
    const { invoiceId, amount } = pay.data() as Payment;
    const invRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
    const inv = await tx.get(invRef);
    if (inv.exists()) {
      const data = inv.data() as Invoice;
      const amountPaid = Math.max(0, (data.amountPaid || 0) - amount);
      const status = data.status === "cancelled" ? data.status : paymentStatus(data.totals.ttc, amountPaid, data.creditedAmount);
      tx.update(invRef, { amountPaid, status, updatedAt: now() });
    }
    tx.delete(payRef);
  });
}

// === INITIALISATION (données par défaut) ===
// Plus aucun compte par défaut : le premier admin se crée dans la console Firebase (voir README).
let seeding: Promise<void> | null = null;
/** Crée les modèles de moteurs par défaut si la collection est vide (admin connecté uniquement). */
export function initializeStorage() {
  if (!isAdminSession()) return Promise.resolve();
  return (seeding ||= (async () => {
    if (!(await getDocs(query(collection(db, COLLECTIONS.MOTOR_TYPES), limit(1)))).empty) return;
    for (const t of DEFAULT_MOTOR_TYPES) await saveMotorType(t);
  })().catch((e) => {
    seeding = null;
    console.warn("Initialisation des données par défaut impossible :", e);
  }));
}
