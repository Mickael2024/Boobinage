// ==========================================
// ALL FIREBASE - FORTICO REWIND
// Fichier unique : config + storage + auth
// ==========================================

// === CONFIG ===
const firebaseConfig = {
    apiKey: "AIzaSyBP5qlIhgbVIY-0p57Oc7YOLk5EJGEf6SQ",
    authDomain: "jeff-elec.firebaseapp.com",
    projectId: "jeff-elec",
    storageBucket: "jeff-elec.firebasestorage.app",
    messagingSenderId: "990314301369",
    appId: "1:990314301369:web:095f42977469a49020d868"
};

// === INIT FIREBASE (chargement dynamique) ===
let db, auth, Timestamp;
const COLLECTIONS = {
    USERS: 'fortico_users',
    MOTORS: 'fortico_motors',
    ACTIVITIES: 'fortico_activities',
    MOTOR_TYPES: 'fortico_motor_types',
    REPORTS: 'fortico_reports',
    WEB_REQUESTS: 'fortico_web_requests'
};

async function initFirebase() {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore, Timestamp: TS } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    Timestamp = TS;
    
    window.db = db;
    window.auth = auth;
    window.Timestamp = Timestamp;
    window.COLLECTIONS = COLLECTIONS;
    
    console.log('🔥 Firebase initialisé');
}

// === STORAGE ===
async function getMotorTypes() {
    if (!db) return [];
    const { getDocs, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snapshot = await getDocs(col(db, COLLECTIONS.MOTOR_TYPES));
    const types = [];
    snapshot.forEach(doc => types.push({ id: doc.id, ...doc.data() }));
    return types;
}

async function getMotorTypeById(id) {
    if (!db) return null;
    const { getDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(d(db, COLLECTIONS.MOTOR_TYPES, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function saveMotorType(motorType) {
    if (!db) return null;
    const { addDoc, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    motorType.createdAt = new Date().toISOString();
    if (!motorType.customSteps?.length) motorType.customSteps = getDefaultSteps(motorType.motorType, motorType.name || '').map(s => ({...s, id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2,5)}));
    const ref = await addDoc(col(db, COLLECTIONS.MOTOR_TYPES), motorType);
    return { id: ref.id, ...motorType };
}

async function updateMotorType(typeId, updates) {
    if (!db) return null;
    const { updateDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    updates.updatedAt = new Date().toISOString();
    await updateDoc(d(db, COLLECTIONS.MOTOR_TYPES, typeId), updates);
    return { id: typeId, ...updates };
}

async function deleteMotorType(typeId) {
    if (!db) return false;
    const { deleteDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(d(db, COLLECTIONS.MOTOR_TYPES, typeId));
    return true;
}

async function addStepToMotorType(typeId, step) {
    const type = await getMotorTypeById(typeId); if(!type) return null;
    if(!type.customSteps) type.customSteps = [];
    const ns = { id: 's_' + Date.now(), name: step.name, substeps: step.substeps || [] };
    type.customSteps.push(ns);
    await updateMotorType(typeId, { customSteps: type.customSteps });
    return ns;
}

async function updateStepInMotorType(typeId, stepId, updates) {
    const type = await getMotorTypeById(typeId); if(!type?.customSteps) return null;
    const i = type.customSteps.findIndex(s => s.id === stepId);
    if(i !== -1) { type.customSteps[i] = {...type.customSteps[i], ...updates}; await updateMotorType(typeId, {customSteps: type.customSteps}); return type.customSteps[i]; }
    return null;
}

async function deleteStepFromMotorType(typeId, stepId) {
    const type = await getMotorTypeById(typeId); if(!type?.customSteps) return false;
    type.customSteps = type.customSteps.filter(s => s.id !== stepId);
    await updateMotorType(typeId, { customSteps: type.customSteps });
    return true;
}

async function getUsers() {
    if (!db) return [];
    const { getDocs, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const s = await getDocs(col(db, COLLECTIONS.USERS));
    const u = []; s.forEach(d => u.push({ id: d.id, ...d.data() })); return u;
}

async function getUserByEmail(email) {
    if (!db) return null;
    const { getDocs, query: q, where, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const s = await getDocs(q(col(db, COLLECTIONS.USERS), where('email','==',email)));
    if(s.empty) return null;
    return { id: s.docs[0].id, ...s.docs[0].data() };
}

async function saveUser(user) {
    if (!db) return null;
    const { addDoc, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    user.createdAt = new Date().toISOString();
    const ref = await addDoc(col(db, COLLECTIONS.USERS), user);
    return { id: ref.id, ...user };
}

async function updateUser(userId, updates) {
    if (!db) return null;
    const { updateDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    updates.updatedAt = new Date().toISOString();
    await updateDoc(d(db, COLLECTIONS.USERS, userId), updates);
    return { id: userId, ...updates };
}

async function deleteUser(userId) {
    if (!db) return false;
    const { deleteDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(d(db, COLLECTIONS.USERS, userId)); return true;
}

async function getMotors() {
    if (!db) return [];
    const { getDocs, query: q, orderBy, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const s = await getDocs(q(col(db, COLLECTIONS.MOTORS), orderBy('createdAt','desc')));
    const m = []; s.forEach(d => m.push({ id: d.id, ...d.data() })); return m;
}

async function getMotorById(id) {
    if (!db) return null;
    const { getDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(d(db, COLLECTIONS.MOTORS, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function saveMotor(motor) {
    if (!db) return null;
    const { addDoc, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    motor.createdAt = new Date().toISOString(); motor.status = 'pending';
    let steps = motor.templateId ? (await getMotorTypeById(motor.templateId))?.customSteps || getDefaultSteps(motor.motorType) : getDefaultSteps(motor.motorType);
    motor.steps = steps.map(s => ({...s, completed:false, validated:false, completedAt:null, validatedAt:null, validatedBy:null, substepsCompleted: new Array(s.substeps.length).fill(false)}));
    const ref = await addDoc(col(db, COLLECTIONS.MOTORS), motor);
    await addActivity({ type: 'motor_created', userId: motor.userId, motorId: ref.id, description: `Moteur ${motor.clientName||''} enregistré` });
    return { id: ref.id, ...motor };
}

async function updateMotor(motorId, updates) {
    if (!db) return null;
    const { updateDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    updates.updatedAt = new Date().toISOString();
    await updateDoc(d(db, COLLECTIONS.MOTORS, motorId), updates);
    return { id: motorId, ...updates };
}

async function updateMotorSubstep(motorId, stepId, substepIndex, completed) {
    const motor = await getMotorById(motorId); if(!motor) return null;
    const si = motor.steps.findIndex(s => s.id === stepId); if(si === -1) return null;
    if(!motor.steps[si].substepsCompleted) motor.steps[si].substepsCompleted = new Array(motor.steps[si].substeps.length).fill(false);
    motor.steps[si].substepsCompleted[substepIndex] = completed;
    const allDone = motor.steps[si].substepsCompleted.every(v => v);
    motor.steps[si].completed = allDone; motor.steps[si].completedAt = allDone ? new Date().toISOString() : null;
    if(!allDone){ motor.steps[si].validated=false; motor.steps[si].validatedAt=null; motor.steps[si].validatedBy=null; }
    motor.status = motor.steps.every(s=>s.validated) ? 'completed' : motor.steps.some(s=>s.completed) ? 'in_progress' : 'pending';
    await updateMotor(motorId, { steps: motor.steps, status: motor.status });
    return motor;
}

async function validateMotorStep(motorId, stepId, adminId) {
    const motor = await getMotorById(motorId); if(!motor) return null;
    const si = motor.steps.findIndex(s => s.id === stepId); if(si === -1) return null;
    motor.steps[si].validated = true; motor.steps[si].validatedAt = new Date().toISOString(); motor.steps[si].validatedBy = adminId;
    motor.status = motor.steps.every(s=>s.validated) ? 'completed' : 'in_progress';
    await updateMotor(motorId, { steps: motor.steps, status: motor.status });
    await addActivity({ type: 'step_validated', userId: adminId, motorId, description: 'Étape validée' });
    return motor;
}

async function addActivity(activity) {
    if (!db) return null;
    const { addDoc, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    activity.timestamp = new Date().toISOString();
    await addDoc(col(db, COLLECTIONS.ACTIVITIES), activity); return activity;
}

async function getActivities(limitCount = 20) {
    if (!db) return [];
    const { getDocs, query: q, orderBy, limit: l, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const s = await getDocs(q(col(db, COLLECTIONS.ACTIVITIES), orderBy('timestamp','desc'), l(limitCount)));
    const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a;
}

async function getReports() {
    if (!db) return [];
    const { getDocs, query: q, orderBy, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const s = await getDocs(q(col(db, COLLECTIONS.REPORTS), orderBy('createdAt','desc')));
    const r = []; s.forEach(d => r.push({ id: d.id, ...d.data() })); return r;
}

async function getReportById(id) {
    if (!db) return null;
    const { getDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(d(db, COLLECTIONS.REPORTS, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function saveReport(report) {
    if (!db) return null;
    const { addDoc, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    report.createdAt = new Date().toISOString(); report.status = 'unread';
    const ref = await addDoc(col(db, COLLECTIONS.REPORTS), report);
    await addActivity({ type: 'report_created', userId: report.userId, motorId: report.motorId, description: 'Rapport envoyé' });
    return { id: ref.id, ...report };
}

async function updateReport(reportId, updates) {
    if (!db) return null;
    const { updateDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    updates.updatedAt = new Date().toISOString();
    await updateDoc(d(db, COLLECTIONS.REPORTS, reportId), updates); return { id: reportId, ...updates };
}

async function deleteReport(reportId) {
    if (!db) return false;
    const { deleteDoc, doc: d } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(d(db, COLLECTIONS.REPORTS, reportId)); return true;
}

async function getReportsByMotor(motorId) {
    if (!db) return [];
    const { getDocs, query: q, where, orderBy, collection: col } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const s = await getDocs(q(col(db, COLLECTIONS.REPORTS), where('motorId','==',motorId), orderBy('createdAt','desc')));
    const r = []; s.forEach(d => r.push({ id: d.id, ...d.data() })); return r;
}

function setCurrentUser(user) { sessionStorage.setItem('currentUser', JSON.stringify(user)); }
function getCurrentUser() { return JSON.parse(sessionStorage.getItem('currentUser') || 'null'); }
function logout() { sessionStorage.removeItem('currentUser'); try { auth?.signOut(); } catch(e){} }

function getDefaultSteps(motorType) {
    const steps = [
        { name: 'DIAGNOSTIC', substeps: ['Identifier type','Relever plaque','Vérifier panne','Mesurer résistance'] },
        { name: 'DÉMONTAGE', substeps: ['Démonter flasques','Extraire rotor','Prendre photos','Noter tours'] },
        { name: 'DÉBOBINAGE', substeps: ['Enlever bobines','Chauffer stator','Nettoyer encoches'] },
        { name: 'NETTOYAGE', substeps: ['Gratter vernis','Souffler air'] },
        { name: 'ISOLATION', substeps: ['Papier isolant','Nomex/Mylar'] },
        { name: 'BOBINAGE', substeps: ['Diamètre fil','Nombre spires','Insérer bobines'] },
        { name: 'CONNEXIONS', substeps: ['Faire jonctions','Isoler gaine'] },
        { name: 'VERNISSAGE', substeps: ['Appliquer vernis','Séchage'] },
        { name: 'REMONTAGE', substeps: ['Remonter rotor','Remonter roulements','Vérifier alignement'] },
        { name: 'TEST FINAL', substeps: ['Test Megger','Test à vide','Vérifier intensité'] }
    ];
    if(motorType === 'single_phase') steps.splice(5,0,{name:'SPÉCIFIQUE MONOPHASÉ',substeps:['Enroulement principal','Enroulement auxiliaire','Condensateur']});
    else if(motorType === 'three_phase') steps.splice(5,0,{name:'SPÉCIFIQUE TRIPHASÉ',substeps:['Diviser 3 groupes','Pas bobinage','Séquence phases','Couplage']});
    return steps;
}

async function initializeDefaultMotorTypes() {
    const types = await getMotorTypes();
    if(!types.length) {
        const defaults = [
            {name:'Moteur Triphasé 0.75kW',motorType:'three_phase',power:'0.75',voltage:'400',current:'2.1',frequency:'50',rpm:'1420',powerFactor:'0.75',insulationClass:'F',couplingType:'star',poles:'4'},
            {name:'Moteur Triphasé 1.5kW',motorType:'three_phase',power:'1.5',voltage:'400',current:'3.5',frequency:'50',rpm:'1430',powerFactor:'0.79',insulationClass:'F',couplingType:'star',poles:'4'},
            {name:'Moteur Triphasé 3kW',motorType:'three_phase',power:'3',voltage:'400',current:'6.4',frequency:'50',rpm:'1440',powerFactor:'0.82',insulationClass:'F',couplingType:'star',poles:'4'},
            {name:'Moteur Triphasé 5.5kW',motorType:'three_phase',power:'5.5',voltage:'400',current:'11.5',frequency:'50',rpm:'1450',powerFactor:'0.84',insulationClass:'F',couplingType:'delta',poles:'4'},
            {name:'Moteur Triphasé 7.5kW',motorType:'three_phase',power:'7.5',voltage:'400',current:'15.2',frequency:'50',rpm:'1455',powerFactor:'0.84',insulationClass:'F',couplingType:'delta',poles:'4'},
            {name:'Moteur Triphasé 11kW',motorType:'three_phase',power:'11',voltage:'400',current:'21.5',frequency:'50',rpm:'1460',powerFactor:'0.85',insulationClass:'F',couplingType:'delta',poles:'4'},
            {name:'Moteur Triphasé 15kW',motorType:'three_phase',power:'15',voltage:'400',current:'28.5',frequency:'50',rpm:'1465',powerFactor:'0.85',insulationClass:'F',couplingType:'delta',poles:'4'},
            {name:'Moteur Monophasé 0.75kW',motorType:'single_phase',power:'0.75',voltage:'230',current:'5.0',frequency:'50',rpm:'1420',powerFactor:'0.78',insulationClass:'F',couplingType:'',poles:'4'},
            {name:'Moteur Monophasé 1.5kW',motorType:'single_phase',power:'1.5',voltage:'230',current:'9.2',frequency:'50',rpm:'1435',powerFactor:'0.81',insulationClass:'F',couplingType:'',poles:'4'},
            {name:'Moteur Monophasé 2.2kW',motorType:'single_phase',power:'2.2',voltage:'230',current:'12.5',frequency:'50',rpm:'1440',powerFactor:'0.82',insulationClass:'F',couplingType:'',poles:'4'}
        ];
        for(const t of defaults) await saveMotorType(t);
        console.log('✅ Types créés');
    }
}

async function initializeAdminUser() {
    const admin = await getUserByEmail('admin@fortico.com');
    if(!admin) { await saveUser({name:'Administrateur',email:'admin@fortico.com',password:'admin123',role:'admin',company:'Fortico',approved:true}); console.log('✅ Admin créé'); }
}

async function initializeStorage() {
    await initFirebase();
    await initializeAdminUser();
    await initializeDefaultMotorTypes();
    console.log('✅ Storage initialisé');
}

// === AUTH ===
async function authenticateUser(email, password) {
    try { try{await auth.signInWithEmailAndPassword(email,password);}catch(e){} const u=await getUserByEmail(email); if(!u||u.role!=='user'||!u.approved||u.password!==password) return {success:false,message:'Identifiants invalides'}; setCurrentUser(u); await addActivity({type:'login',userId:u.id,description:`${u.name} connecté`}); return {success:true,user:u}; }
    catch(e){return {success:false,message:'Erreur'};}
}

async function authenticateAdmin(email, password) {
    try { try{await auth.signInWithEmailAndPassword(email,password);}catch(e){} const a=await getUserByEmail(email); if(!a||a.role!=='admin'||a.password!==password) return {success:false,message:'Accès refusé'}; setCurrentUser(a); await addActivity({type:'admin_login',userId:a.id,description:'Admin connecté'}); return {success:true,admin:a}; }
    catch(e){return {success:false,message:'Erreur'};}
}

async function registerUser(userData) {
    try { const ex=await getUserByEmail(userData.email); if(ex) return {success:false,message:'Email déjà utilisé'}; try{await auth.createUserWithEmailAndPassword(userData.email,userData.password);}catch(e){} const nu={name:userData.name,email:userData.email,password:userData.password,company:userData.company||'',role:'user',approved:false}; const s=await saveUser(nu); await addActivity({type:'user_registered',userId:s?.id,description:`Inscription ${nu.name}`}); try{await auth.signOut();}catch(e){} return {success:true,message:'Compte créé, en attente de validation'}; }
    catch(e){return {success:false,message:'Erreur'};}
}

console.log('📦 All Firebase prêt');