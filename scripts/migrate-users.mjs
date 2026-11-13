#!/usr/bin/env node
/**
 * Migration des comptes Jeff Elec vers Firebase Authentication.
 *
 * Avant : fortico_users/{id} contient le mot de passe en clair.
 * Après : un compte Firebase Auth par utilisateur (même mot de passe), profil fortico_users/{uid}
 *         sans mot de passe, userId / validatedBy mis à jour dans moteurs, rapports et activités.
 *
 * Les comptes sont créés avec uid = id du document existant : les références restent valides.
 * Si un compte Auth existe déjà pour l'email (créé dans la console), son uid est conservé
 * et toutes les références sont réécrites.
 *
 * Usage :
 *   FIREBASE_SERVICE_ACCOUNT=./jeff-elec-firebase-adminsdk-xxxx.json node scripts/migrate-users.mjs            # simulation (défaut)
 *   FIREBASE_SERVICE_ACCOUNT=... node scripts/migrate-users.mjs --apply                                       # exécution réelle
 *   ... --include-default-admin   migre aussi l'ancien compte par défaut admin@fortico.com (déconseillé)
 *   ADMIN_PASSWORD='…' ... --create-admin=moi@exemple.mg --name="Jeff"   crée / promeut un administrateur
 *
 * Clé de service : console Firebase > Paramètres du projet > Comptes de service > Générer une clé.
 * Ne JAMAIS commiter ce fichier (motifs ajoutés au .gitignore).
 */
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const C = {
  USERS: "fortico_users",
  MOTORS: "fortico_motors",
  REPORTS: "fortico_reports",
  ACTIVITIES: "fortico_activities",
};
const DEFAULT_ADMIN = "admin@fortico.com";

// ---------- arguments ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const APPLY = flag("apply");
const INCLUDE_DEFAULT_ADMIN = flag("include-default-admin");
const CREATE_ADMIN = option("create-admin");
const ADMIN_NAME = option("name") || "Administrateur";

// ---------- initialisation ----------
const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.GCLOUD_PROJECT || "jeff-elec";
if (!keyPath && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !emulator) {
  console.error("Définissez FIREBASE_SERVICE_ACCOUNT=chemin/vers/la-cle-de-service.json");
  process.exit(1);
}
initializeApp(
  keyPath
    ? { credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) }
    : emulator
      ? { projectId }
      : { credential: applicationDefault(), projectId },
);
const auth = getAuth();
const db = getFirestore();

const log = (...m) => console.log(APPLY ? "" : "[simulation]", ...m);
const now = () => new Date().toISOString();
const norm = (e) => String(e || "").trim().toLowerCase();

async function authUserByEmail(email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (e) {
    if (e.code === "auth/user-not-found") return null;
    throw e;
  }
}

/** Écritures groupées (500 max par lot Firestore). */
class Batcher {
  ops = [];
  set(ref, data) {
    this.ops.push((b) => b.set(ref, data));
  }
  update(ref, data) {
    this.ops.push((b) => b.update(ref, data));
  }
  delete(ref) {
    this.ops.push((b) => b.delete(ref));
  }
  async commit() {
    if (!APPLY) return;
    for (let i = 0; i < this.ops.length; i += 400) {
      const b = db.batch();
      this.ops.slice(i, i + 400).forEach((op) => op(b));
      await b.commit();
    }
  }
}

// ---------- 1. comptes ----------
async function migrateUsers() {
  const snap = await db.collection(C.USERS).get();
  console.log(`${snap.size} profil(s) dans ${C.USERS}`);
  const seen = new Map(); // email -> id
  const toCreate = []; // mot de passe ≥ 6 caractères : createUser (haché par Firebase)
  const toImport = []; // mot de passe court ou absent : importUsers
  const remap = new Map(); // ancien id -> uid Auth
  const batch = new Batcher();
  const hmacKey = randomBytes(32);
  const report = { imported: 0, linked: 0, cleaned: 0, skipped: 0, noPassword: 0 };

  for (const d of snap.docs) {
    const data = d.data();
    const email = norm(data.email);
    if (!email) {
      log(`! ${d.id} : pas d'email, ignoré`);
      report.skipped++;
      continue;
    }
    if (seen.has(email)) {
      log(`! ${d.id} : email ${email} déjà utilisé par ${seen.get(email)}, ignoré (à fusionner à la main)`);
      report.skipped++;
      continue;
    }
    seen.set(email, d.id);
    const { password, ...profile } = data;
    const cleanProfile = { ...profile, email, updatedAt: now(), migratedAt: now() };

    if (email === DEFAULT_ADMIN && !INCLUDE_DEFAULT_ADMIN) {
      log(`! ${email} : ancien compte par défaut (mot de passe connu), pas de compte Auth créé. Mot de passe retiré du profil.`);
      if (password !== undefined) batch.update(d.ref, { password: FieldValue.delete() });
      report.skipped++;
      continue;
    }

    const existing = await authUserByEmail(email);
    if (existing) {
      log(`= ${email} : compte Auth existant (${existing.uid}), mot de passe Auth inchangé`);
      report.linked++;
      if (existing.uid !== d.id) {
        remap.set(d.id, existing.uid);
        batch.set(db.collection(C.USERS).doc(existing.uid), cleanProfile);
        batch.delete(d.ref);
        log(`  profil ${d.id} → ${existing.uid}`);
      } else batch.update(d.ref, { password: FieldValue.delete(), email, updatedAt: now() });
      continue;
    }

    const record = { uid: d.id, email, displayName: data.name || undefined, emailVerified: false, disabled: false };
    if (typeof password === "string" && password.length >= 6) {
      toCreate.push({ ...record, password });
    } else if (typeof password === "string" && password) {
      // Auth refuse les mots de passe < 6 caractères à la création : import haché (HMAC-SHA256)
      toImport.push({ ...record, passwordHash: createHmac("sha256", hmacKey).update(password).digest() });
      log(`! ${email} : mot de passe de moins de 6 caractères, importé tel quel (à faire changer)`);
    } else {
      toImport.push(record);
      log(`! ${email} : aucun mot de passe enregistré, compte créé sans mot de passe (envoyer une réinitialisation)`);
      report.noPassword++;
    }
    log(`+ ${email} (${data.role || "user"}) : compte Auth uid=${d.id}`);
    batch.update(d.ref, { password: FieldValue.delete(), email, updatedAt: now(), migratedAt: now() });
    report.cleaned++;
  }

  if (APPLY) {
    for (const u of toCreate) {
      try {
        await auth.createUser(u);
        report.imported++;
      } catch (e) {
        console.error(`  échec création ${u.email} : ${e.message}`);
      }
    }
    for (let i = 0; i < toImport.length; i += 1000) {
      const res = await auth.importUsers(toImport.slice(i, i + 1000), { hash: { algorithm: "HMAC_SHA256", key: hmacKey } });
      res.errors.forEach((e) => console.error(`  échec import ${toImport[i + e.index].email} : ${e.error.message}`));
      report.imported += res.successCount;
    }
  } else report.imported = toCreate.length + toImport.length;

  await batch.commit();
  return { remap, report };
}

// ---------- 2. références userId / validatedBy ----------
async function rewriteReferences(remap) {
  if (!remap.size) return 0;
  const batch = new Batcher();
  let count = 0;
  for (const col of [C.MOTORS, C.REPORTS, C.ACTIVITIES]) {
    for (const [oldId, uid] of remap) {
      const snap = await db.collection(col).where("userId", "==", oldId).get();
      snap.forEach((d) => batch.update(d.ref, { userId: uid }));
      if (snap.size) log(`  ${col} : ${snap.size} document(s) userId ${oldId} → ${uid}`);
      count += snap.size;
    }
  }
  // étapes validées par un admin dont l'id change
  const motors = await db.collection(C.MOTORS).get();
  motors.forEach((d) => {
    const steps = d.data().steps;
    if (!Array.isArray(steps) || !steps.some((s) => remap.has(s?.validatedBy))) return;
    batch.update(d.ref, { steps: steps.map((s) => (remap.has(s?.validatedBy) ? { ...s, validatedBy: remap.get(s.validatedBy) } : s)) });
    log(`  ${C.MOTORS}/${d.id} : validatedBy mis à jour`);
    count++;
  });
  await batch.commit();
  return count;
}

// ---------- 3. création / promotion d'un administrateur ----------
async function createAdmin(email) {
  const password = process.env.ADMIN_PASSWORD;
  let user = await authUserByEmail(norm(email));
  if (!user) {
    if (!password || password.length < 8) throw new Error("ADMIN_PASSWORD (8 caractères minimum) est requis pour créer l'administrateur");
    log(`+ administrateur ${email} : création du compte Auth`);
    if (APPLY) user = await auth.createUser({ email: norm(email), password, displayName: ADMIN_NAME });
  } else log(`= administrateur ${email} : compte Auth existant (${user.uid})`);
  const uid = user?.uid ?? "(nouveau)";
  log(`  profil ${C.USERS}/${uid} : role=admin, approved=true`);
  if (APPLY && user) {
    const ref = db.collection(C.USERS).doc(user.uid);
    const prev = await ref.get();
    await ref.set(
      { name: prev.data()?.name || ADMIN_NAME, email: norm(email), company: prev.data()?.company || "Jeff Elec", role: "admin", approved: true, updatedAt: now(), ...(prev.exists ? {} : { createdAt: now() }) },
      { merge: true },
    );
  }
}

// ---------- main ----------
console.log(APPLY ? "MODE EXÉCUTION : les modifications vont être écrites." : "Mode simulation (aucune écriture). Ajoutez --apply pour exécuter.");
console.log(`Projet : ${emulator ? `émulateur (${projectId})` : keyPath ? "clé de service" : projectId}\n`);

if (CREATE_ADMIN) await createAdmin(CREATE_ADMIN);
else {
  const { remap, report } = await migrateUsers();
  const refs = await rewriteReferences(remap);
  console.log(
    `\nRésumé : ${report.imported} compte(s) importé(s), ${report.linked} relié(s) à un compte existant, ` +
      `${report.skipped} ignoré(s), ${report.noPassword} sans mot de passe, ${refs} référence(s) réécrite(s).`,
  );
}
if (!APPLY) console.log("\nSimulation terminée. Relancez avec --apply pour appliquer.");
process.exit(0);
