# Boobinage — Jeff Elec

Gestion d'atelier de rebobinage de moteurs électriques : React 19 + Vite + TypeScript + Tailwind CSS v4,
Firebase (Authentication, Firestore, Storage) **sans Cloud Functions** : la sécurité repose sur
Firebase Auth et les règles `firestore.rules` / `storage.rules`.

## Démarrer

```bash
npm install
npm run dev          # serveur de développement
npm run build        # vérification TypeScript + build dans dist/
npm run preview      # sert le build localement
npm run test:rules   # tests des règles Firestore/Storage (émulateurs : Java + firebase-tools requis)
```

## Pages

| URL           | Rôle                                          |
| ------------- | --------------------------------------------- |
| `#/`          | Accueil : choix espace technique / admin      |
| `#/site`      | Site vitrine public + demande de devis        |
| `#/user/...`  | Espace technicien (moteurs, étapes, rapports) |
| `#/admin/...` | Supervision (utilisateurs, moteurs, pannes…)  |

Le routage utilise le hash (`#/…`) : le dossier `dist/` peut être déposé sur n'importe quel hébergement statique sans règle de réécriture.

## Structure

- `src/lib/firebase.ts` : initialisation Firebase (`db`, `auth`, `storage`) et noms des collections
- `src/lib/session.ts` : session Firebase Auth (`useCurrentUser`, `useAuthReady`, `authenticate`, `logout`, gestion des comptes)
- `src/lib/db.ts` : tout l'accès Firestore / Storage (les pages n'importent jamais `firebase/*`)
- `src/lib/money.ts` : calculs HT/TVA/TTC en Ariary, `formatMGA`, montant en lettres
- `src/lib/types.ts`, `format.ts`, `images.ts` (compression des photos), `pdf.ts`
- `src/components/ui/` : boutons, listes déroulantes, modales, notifications…
- `src/pages/` : écrans (accueil, site, `user/`, `admin/`)
- `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc` (projet `jeff-elec`)
- `scripts/migrate-users.mjs` : migration des anciens comptes ; `scripts/rules.test.mjs` : tests des règles

## Modèle de données

| Collection                                 | Contenu                                                       | Accès                                        |
| ------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------- |
| `fortico_users/{uid}`                      | Profil : nom, email, rôle `admin`/`user`, `approved`          | admin ; chacun lit le sien                   |
| `fortico_motors`                           | Moteurs, n° de dossier `OR-AAAA-NNNN`, étapes                 | admin ; technicien : les siens               |
| `fortico_reports`                          | Rapports d'étape (photos dans Storage `reports/{id}/…`)       | admin ; technicien : les siens               |
| `fortico_motor_types`, `fortico_fault_types` | Modèles de moteurs, pannes + diagnostics                   | admin ; lecture technicien                   |
| `fortico_activities`                       | Journal                                                       | admin ; création par le technicien           |
| `fortico_web_requests`                     | Demandes de devis du site                                     | admin ; **création publique** (champs contrôlés) |
| `clients`, `catalog`, `quotes`, `invoices`, `payments` | Gestion commerciale (Ariary, TVA 20 %)            | admin (technicien : lecture/création clients) |
| `settings/company`                         | Coordonnées, NIF/STAT, logo, TVA, conditions                  | lecture publique ; écriture admin            |
| `counters/{type}-{année}`                  | Numérotation OR / DV / FA / AV, en transaction                | admin ; technicien : `OR-*` (+1 seulement)   |

Les anciennes collections `fortico_*` gardent leur nom (données en production).
Une facture reçoit son numéro `FA-AAAA-NNNN` à l'émission seulement ; elle n'est plus modifiable ensuite (avoir `AV-…`).

## Mise en place Firebase (à faire une fois)

### 1. Activer Authentication

Console Firebase → projet **jeff-elec** → *Authentication* → *Commencer* → activer **Adresse e-mail/Mot de passe**.
Dans *Authentication → Modèles*, passer la langue des emails en français si besoin
(réinitialisation de mot de passe envoyée depuis l'écran Utilisateurs).

### 2. Migrer les comptes existants (ou créer le premier admin)

Les anciens profils `fortico_users` contenaient le mot de passe en clair. Le script les transforme en vrais comptes
Firebase Auth (même mot de passe, uid = id du profil donc aucune donnée à renommer), retire le champ `password`
et, si un compte Auth existait déjà pour un email, réécrit `userId` dans moteurs / rapports / activités.

1. Console → *Paramètres du projet* → *Comptes de service* → **Générer une nouvelle clé privée**.
   Enregistrer le fichier **hors du dépôt** (ou à la racine : les motifs `*firebase-adminsdk*.json`,
   `*service-account*.json` sont ignorés par git). Ne jamais le partager.
2. Simulation (aucune écriture, mode par défaut) :
   ```bash
   FIREBASE_SERVICE_ACCOUNT=/chemin/jeff-elec-firebase-adminsdk-xxxx.json node scripts/migrate-users.mjs
   ```
3. Exécution réelle :
   ```bash
   FIREBASE_SERVICE_ACCOUNT=/chemin/cle.json node scripts/migrate-users.mjs --apply
   ```
   - L'ancien compte par défaut `admin@fortico.com / admin123` **n'est pas migré** (mot de passe public) ;
     ajouter `--include-default-admin` seulement si vous le voulez vraiment, puis changez son mot de passe.
   - Les mots de passe de moins de 6 caractères sont importés tels quels : faites-les changer
     (bouton « Réinitialiser le mot de passe » dans Utilisateurs).

**Créer le premier administrateur** (au choix) :

- via le script :
  ```bash
  ADMIN_PASSWORD='un-mot-de-passe-solide' FIREBASE_SERVICE_ACCOUNT=/chemin/cle.json \
    node scripts/migrate-users.mjs --apply --create-admin=vous@exemple.mg --name="Votre nom"
  ```
- ou à la main : *Authentication → Ajouter un utilisateur* (email + mot de passe), copier son **UID**, puis
  *Firestore → fortico_users →* document d'ID = cet UID avec les champs
  `name` (string), `email` (string), `role` = `"admin"`, `approved` = `true` (boolean), `company` = `"Jeff Elec"`.

Les techniciens sont ensuite créés depuis l'écran **Utilisateurs** de l'admin (mot de passe initial),
sans déconnecter l'admin. Pour supprimer définitivement un technicien : supprimer son profil dans l'appli
(il perd tout accès immédiatement) puis son compte dans *Authentication* pour libérer l'email.

### 3. Activer Storage (photos des rapports)

Console → *Storage* → *Commencer*. Sur un projet récent, Storage peut exiger le forfait **Blaze**
(paiement à l'usage, quota gratuit inclus). Sans Storage, l'application fonctionne quand même :
les photos sont automatiquement enregistrées compressées dans le document du rapport (qualité réduite).

### 4. Déployer les règles

```bash
npm install -g firebase-tools   # si besoin
firebase login
firebase deploy --only firestore:rules,storage
```

Au premier déploiement de `storage.rules`, la console demande d'autoriser Storage à lire Firestore
(les règles Storage lisent le rôle dans `fortico_users`) : accepter.

**Ordre conseillé** : activer Auth → lancer la migration (`--apply`) → vérifier la connexion admin et technicien
→ déployer les règles. Tant que les règles ne sont pas déployées, la base reste ouverte à quiconque possède la clé web.

### Tester les règles en local

```bash
npm run test:rules
```

Lance les émulateurs Firestore et Storage (Java 11+ et `firebase-tools` requis) et vérifie notamment :
un visiteur ne peut que créer une demande de devis et lire `settings/company` ; un technicien ne voit que ses
moteurs, ne peut ni valider une étape ni se promouvoir admin ; une facture émise est figée.
