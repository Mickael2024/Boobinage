// Tests des règles Firestore + Storage (émulateurs requis) : npm run test:rules
import { after, before, beforeEach, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

const PROJECT = process.env.GCLOUD_PROJECT || "demo-jeff-elec";
let env;

const step = (validated = false) => ({
  id: "s1",
  name: "DIAGNOSTIC",
  substeps: ["a"],
  substepsCompleted: [false],
  completed: false,
  validated,
  completedAt: null,
  validatedAt: validated ? "2026-01-01" : null,
  validatedBy: validated ? "admin" : null,
});
const motor = (userId, steps = [step(), { ...step(), id: "s2" }]) => ({ userId, status: "pending", steps, clientName: "Client", createdAt: "2026-01-01" });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
    storage: { rules: readFileSync(new URL("../storage.rules", import.meta.url), "utf8") },
  });
});
after(() => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "fortico_users/admin"), { name: "Admin", email: "admin@x.mg", role: "admin", approved: true });
    await setDoc(doc(db, "fortico_users/tech"), { name: "Tech", email: "tech@x.mg", role: "user", approved: true });
    await setDoc(doc(db, "fortico_users/other"), { name: "Autre", email: "other@x.mg", role: "user", approved: true });
    await setDoc(doc(db, "fortico_users/pending"), { name: "Attente", email: "p@x.mg", role: "user", approved: false });
    await setDoc(doc(db, "fortico_motors/m1"), motor("tech"));
    await setDoc(doc(db, "fortico_motors/m2"), motor("other"));
    await setDoc(doc(db, "fortico_motor_types/t1"), { name: "Type" });
    await setDoc(doc(db, "settings/company"), { name: "Jeff Elec" });
    await setDoc(doc(db, "settings/secret"), { x: 1 });
    await setDoc(doc(db, "counters/OR-2026"), { value: 3 });
    await setDoc(doc(db, "invoices/draft"), { status: "draft", number: null, lines: [], amountPaid: 0, totals: { ht: 0, vat: 0, ttc: 0 } });
    await setDoc(doc(db, "invoices/issued"), { status: "issued", number: "FA-2026-0001", lines: [{ designation: "x" }], amountPaid: 0, totals: { ht: 100, vat: 20, ttc: 120 } });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const as = (uid, email) => env.authenticatedContext(uid, email ? { email } : {}).firestore();

const webRequest = (extra = {}) => ({ clientName: "Rakoto", clientEmail: "r@x.mg", description: "Moteur 5 kW", power: "5", status: "new", createdAt: serverTimestamp(), ...extra });

describe("public (non connecté)", () => {
  test("crée une demande de devis valide", () => assertSucceeds(addDoc(collection(anon(), "fortico_web_requests"), webRequest())));
  test("refuse un champ inconnu", () => assertFails(addDoc(collection(anon(), "fortico_web_requests"), webRequest({ role: "admin" }))));
  test("refuse un statut forcé", () => assertFails(addDoc(collection(anon(), "fortico_web_requests"), webRequest({ status: "replied" }))));
  test("refuse une description trop longue", () => assertFails(addDoc(collection(anon(), "fortico_web_requests"), webRequest({ description: "x".repeat(6000) }))));
  test("ne lit pas les demandes", () => assertFails(getDocs(collection(anon(), "fortico_web_requests"))));
  test("lit settings/company", () => assertSucceeds(getDoc(doc(anon(), "settings/company"))));
  test("ne lit pas les autres paramètres", () => assertFails(getDoc(doc(anon(), "settings/secret"))));
  test("ne lit ni moteurs ni profils", async () => {
    await assertFails(getDoc(doc(anon(), "fortico_motors/m1")));
    await assertFails(getDocs(collection(anon(), "fortico_users")));
  });
});

describe("technicien approuvé", () => {
  test("lit son moteur, pas celui d'un autre", async () => {
    await assertSucceeds(getDoc(doc(as("tech"), "fortico_motors/m1")));
    await assertFails(getDoc(doc(as("tech"), "fortico_motors/m2")));
  });
  test("liste ses moteurs filtrés, pas toute la collection", async () => {
    await assertSucceeds(getDocs(query(collection(as("tech"), "fortico_motors"), where("userId", "==", "tech"))));
    await assertFails(getDocs(collection(as("tech"), "fortico_motors")));
  });
  test("crée un moteur sans étape validée", () => assertSucceeds(setDoc(doc(as("tech"), "fortico_motors/new"), motor("tech"))));
  test("ne crée pas de moteur pré-validé ni pour un autre", async () => {
    await assertFails(setDoc(doc(as("tech"), "fortico_motors/new"), motor("tech", [step(true)])));
    await assertFails(setDoc(doc(as("tech"), "fortico_motors/new"), motor("other")));
  });
  test("coche une sous-étape", () =>
    assertSucceeds(updateDoc(doc(as("tech"), "fortico_motors/m1"), { steps: [{ ...step(), substepsCompleted: [true], completed: true, completedAt: "2026-02-01" }, { ...step(), id: "s2" }], status: "in_progress" })));
  test("coche une sous-étape sur un moteur de 25 étapes (limite d'expressions)", async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ ...step(i < 3), id: `s${i}` }));
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "fortico_motors/big"), motor("tech", many)));
    const next = many.map((s, i) => (i === 5 ? { ...s, substepsCompleted: [true], completed: true, completedAt: "2026-02-01" } : s));
    await assertSucceeds(updateDoc(doc(as("tech"), "fortico_motors/big"), { steps: next, status: "in_progress" }));
    // décocher une étape validée annule sa validation : autorisé
    const unvalidated = many.map((s, i) => (i === 0 ? step(false) : s));
    await assertSucceeds(updateDoc(doc(as("tech"), "fortico_motors/big"), { steps: unvalidated, status: "in_progress" }));
    const forged = many.map((s, i) => (i === 20 ? step(true) : s));
    await assertFails(updateDoc(doc(as("tech"), "fortico_motors/big"), { steps: forged, status: "in_progress" }));
  });
  test("ne valide pas une étape", () =>
    assertFails(updateDoc(doc(as("tech"), "fortico_motors/m1"), { steps: [step(true), { ...step(), id: "s2" }], status: "in_progress" })));
  test("ne passe pas le moteur à terminé", () => assertFails(updateDoc(doc(as("tech"), "fortico_motors/m1"), { status: "completed" })));
  test("demande une validation", () => assertSucceeds(updateDoc(doc(as("tech"), "fortico_motors/m1"), { validationRequestedAt: "2026-02-01T10:00:00Z" })));
  test("ne modifie pas le client ni ne supprime", async () => {
    await assertFails(updateDoc(doc(as("tech"), "fortico_motors/m1"), { clientName: "Pirate" }));
    await assertFails(deleteDoc(doc(as("tech"), "fortico_motors/m1")));
  });
  test("ne se promeut pas admin", async () => {
    await assertSucceeds(getDoc(doc(as("tech"), "fortico_users/tech")));
    await assertFails(updateDoc(doc(as("tech"), "fortico_users/tech"), { role: "admin" }));
    await assertFails(updateDoc(doc(as("tech"), "fortico_users/tech"), { approved: true, name: "x" }));
    await assertFails(getDoc(doc(as("tech"), "fortico_users/other")));
  });
  test("resynchronise son email avec Auth uniquement", async () => {
    await assertSucceeds(updateDoc(doc(as("tech", "new@x.mg"), "fortico_users/tech"), { email: "new@x.mg" }));
    await assertFails(updateDoc(doc(as("tech", "new@x.mg"), "fortico_users/tech"), { email: "autre@x.mg" }));
  });
  test("crée un rapport sur son moteur uniquement", async () => {
    const r = { motorId: "m1", userId: "tech", status: "unread", photos: [] };
    await assertSucceeds(addDoc(collection(as("tech"), "fortico_reports"), r));
    await assertFails(addDoc(collection(as("tech"), "fortico_reports"), { ...r, motorId: "m2" }));
    await assertFails(addDoc(collection(as("tech"), "fortico_reports"), { ...r, status: "approved" }));
  });
  test("compteur OR : +1 seulement, pas les factures", async () => {
    await assertSucceeds(updateDoc(doc(as("tech"), "counters/OR-2026"), { value: 4 }));
    await assertFails(updateDoc(doc(as("tech"), "counters/OR-2026"), { value: 10 }));
    await assertFails(setDoc(doc(as("tech"), "counters/FA-2026"), { value: 1 }));
    await assertFails(deleteDoc(doc(as("tech"), "counters/OR-2026")));
  });
  test("lit les types moteurs mais pas la gestion commerciale", async () => {
    await assertSucceeds(getDoc(doc(as("tech"), "fortico_motor_types/t1")));
    await assertFails(getDocs(collection(as("tech"), "invoices")));
    await assertFails(getDocs(collection(as("tech"), "quotes")));
    await assertFails(getDocs(collection(as("tech"), "payments")));
  });
});

describe("technicien non approuvé", () => {
  test("n'a accès à rien d'autre que son profil", async () => {
    await assertSucceeds(getDoc(doc(as("pending"), "fortico_users/pending")));
    await assertFails(getDoc(doc(as("pending"), "fortico_motor_types/t1")));
    await assertFails(setDoc(doc(as("pending"), "fortico_motors/x"), motor("pending")));
  });
});

describe("admin", () => {
  test("lit et écrit tout", async () => {
    await assertSucceeds(getDocs(collection(as("admin"), "fortico_motors")));
    await assertSucceeds(updateDoc(doc(as("admin"), "fortico_motors/m1"), { steps: [step(true), { ...step(), id: "s2" }] }));
    await assertSucceeds(updateDoc(doc(as("admin"), "fortico_users/tech"), { approved: false }));
    await assertSucceeds(getDocs(collection(as("admin"), "fortico_web_requests")));
  });
  test("facture : brouillon modifiable, émise figée", async () => {
    await assertSucceeds(updateDoc(doc(as("admin"), "invoices/draft"), { lines: [{ designation: "y" }] }));
    await assertFails(updateDoc(doc(as("admin"), "invoices/issued"), { lines: [] }));
    await assertFails(updateDoc(doc(as("admin"), "invoices/issued"), { number: "FA-2026-0099" }));
    await assertSucceeds(updateDoc(doc(as("admin"), "invoices/issued"), { amountPaid: 60, status: "partially_paid" }));
    await assertSucceeds(updateDoc(doc(as("admin"), "invoices/issued"), { creditedAmount: 30, status: "partially_paid" }));
    await assertFails(deleteDoc(doc(as("admin"), "invoices/issued")));
    await assertSucceeds(deleteDoc(doc(as("admin"), "invoices/draft")));
  });
  test("ne crée pas de facture déjà numérotée", () =>
    assertFails(setDoc(doc(as("admin"), "invoices/x"), { status: "issued", number: "FA-2026-0005" })));
  test("ne supprime pas un compteur", () => assertFails(deleteDoc(doc(as("admin"), "counters/OR-2026"))));
});

describe("storage", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const meta = (uid) => ({ contentType: "image/jpeg", customMetadata: { uploadedBy: uid } });
  const st = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();

  test("technicien : envoie ses photos de rapport, relit les siennes", async () => {
    await assertSucceeds(uploadBytes(ref(st("tech"), "reports/r1/1.jpg"), jpeg, meta("tech")));
    await assertSucceeds(getBytes(ref(st("tech"), "reports/r1/1.jpg")));
    await assertFails(getBytes(ref(st("other"), "reports/r1/1.jpg")));
    await assertSucceeds(getBytes(ref(st("admin"), "reports/r1/1.jpg")));
  });
  test("refuse : anonyme, non approuvé, métadonnée usurpée, fichier non image", async () => {
    await assertFails(uploadBytes(ref(st(null), "reports/r1/2.jpg"), jpeg, meta("tech")));
    await assertFails(uploadBytes(ref(st("pending"), "reports/r1/2.jpg"), jpeg, meta("pending")));
    await assertFails(uploadBytes(ref(st("tech"), "reports/r1/2.jpg"), jpeg, meta("other")));
    await assertFails(uploadBytes(ref(st("tech"), "reports/r1/2.jpg"), jpeg, { contentType: "application/pdf", customMetadata: { uploadedBy: "tech" } }));
  });
  test("logo : admin écrit, tout le monde lit", async () => {
    await assertFails(uploadBytes(ref(st("tech"), "company/logo.png"), jpeg, { contentType: "image/png" }));
    await assertSucceeds(uploadBytes(ref(st("admin"), "company/logo.png"), jpeg, { contentType: "image/png" }));
    await assertSucceeds(getBytes(ref(st(null), "company/logo.png")));
  });
});
