// ==========================================
// STORAGE FIREBASE - FORTICO REWIND
// ==========================================

const { db, auth, COLLECTIONS, Timestamp, serverTimestamp } = window;

// === TYPES DE MOTEURS ===
async function getMotorTypes() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.MOTOR_TYPES));
        const types = [];
        snapshot.forEach(doc => types.push({ id: doc.id, ...doc.data() }));
        return types;
    } catch (error) {
        console.error('getMotorTypes error:', error);
        return [];
    }
}

async function getMotorTypeById(id) {
    try {
        const docRef = doc(db, COLLECTIONS.MOTOR_TYPES, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
        console.error('getMotorTypeById error:', error);
        return null;
    }
}

async function saveMotorType(motorType) {
    try {
        motorType.createdAt = serverTimestamp();
        if (!motorType.customSteps || motorType.customSteps.length === 0) {
            motorType.customSteps = getDefaultSteps(motorType.motorType, motorType.name || '').map(step => ({
                ...step,
                id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
            }));
        }
        const docRef = await addDoc(collection(db, COLLECTIONS.MOTOR_TYPES), motorType);
        return { id: docRef.id, ...motorType };
    } catch (error) {
        console.error('saveMotorType error:', error);
        return null;
    }
}

async function updateMotorType(typeId, updates) {
    try {
        updates.updatedAt = serverTimestamp();
        const docRef = doc(db, COLLECTIONS.MOTOR_TYPES, typeId);
        await updateDoc(docRef, updates);
        return { id: typeId, ...updates };
    } catch (error) {
        console.error('updateMotorType error:', error);
        return null;
    }
}

async function deleteMotorType(typeId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.MOTOR_TYPES, typeId));
        return true;
    } catch (error) {
        console.error('deleteMotorType error:', error);
        return false;
    }
}

// === ÉTAPES PERSONNALISÉES ===
async function addStepToMotorType(typeId, step) {
    const type = await getMotorTypeById(typeId);
    if (!type) return null;
    if (!type.customSteps) type.customSteps = [];
    const newStep = {
        id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: step.name,
        substeps: step.substeps || []
    };
    type.customSteps.push(newStep);
    await updateMotorType(typeId, { customSteps: type.customSteps });
    return newStep;
}

async function updateStepInMotorType(typeId, stepId, updates) {
    const type = await getMotorTypeById(typeId);
    if (!type || !type.customSteps) return null;
    const idx = type.customSteps.findIndex(s => s.id === stepId);
    if (idx !== -1) {
        type.customSteps[idx] = { ...type.customSteps[idx], ...updates };
        await updateMotorType(typeId, { customSteps: type.customSteps });
        return type.customSteps[idx];
    }
    return null;
}

async function deleteStepFromMotorType(typeId, stepId) {
    const type = await getMotorTypeById(typeId);
    if (!type || !type.customSteps) return false;
    type.customSteps = type.customSteps.filter(s => s.id !== stepId);
    await updateMotorType(typeId, { customSteps: type.customSteps });
    return true;
}

// === UTILISATEURS ===
async function getUsers() {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
        const users = [];
        snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        return users;
    } catch (error) {
        console.error('getUsers error:', error);
        return [];
    }
}

async function getUserByEmail(email) {
    try {
        const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() };
    } catch (error) {
        console.error('getUserByEmail error:', error);
        return null;
    }
}

async function saveUser(user) {
    try {
        user.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, COLLECTIONS.USERS), user);
        return { id: docRef.id, ...user };
    } catch (error) {
        console.error('saveUser error:', error);
        return null;
    }
}

async function updateUser(userId, updates) {
    try {
        updates.updatedAt = serverTimestamp();
        const docRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(docRef, updates);
        return { id: userId, ...updates };
    } catch (error) {
        console.error('updateUser error:', error);
        return null;
    }
}

async function deleteUser(userId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
        return true;
    } catch (error) {
        console.error('deleteUser error:', error);
        return false;
    }
}

// === MOTEURS ===
async function getMotors() {
    try {
        const q = query(collection(db, COLLECTIONS.MOTORS), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const motors = [];
        snapshot.forEach(doc => motors.push({ id: doc.id, ...doc.data() }));
        return motors;
    } catch (error) {
        console.error('getMotors error:', error);
        return [];
    }
}

async function getMotorById(id) {
    try {
        const docRef = doc(db, COLLECTIONS.MOTORS, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
        console.error('getMotorById error:', error);
        return null;
    }
}

async function saveMotor(motor) {
    try {
        motor.createdAt = serverTimestamp();
        motor.status = 'pending';
        
        let steps;
        if (motor.templateId) {
            const template = await getMotorTypeById(motor.templateId);
            steps = template?.customSteps || getDefaultSteps(motor.motorType, '');
        } else {
            steps = getDefaultSteps(motor.motorType, '');
        }
        
        motor.steps = steps.map(step => ({
            ...step,
            completed: false,
            validated: false,
            completedAt: null,
            validatedAt: null,
            validatedBy: null,
            substepsCompleted: new Array(step.substeps.length).fill(false)
        }));
        
        const docRef = await addDoc(collection(db, COLLECTIONS.MOTORS), motor);
        await addActivity({ type: 'motor_created', userId: motor.userId, motorId: docRef.id, description: `Moteur ${motor.clientName || ''} enregistré` });
        return { id: docRef.id, ...motor };
    } catch (error) {
        console.error('saveMotor error:', error);
        return null;
    }
}

async function updateMotor(motorId, updates) {
    try {
        updates.updatedAt = serverTimestamp();
        const docRef = doc(db, COLLECTIONS.MOTORS, motorId);
        await updateDoc(docRef, updates);
        return { id: motorId, ...updates };
    } catch (error) {
        console.error('updateMotor error:', error);
        return null;
    }
}

async function updateMotorSubstep(motorId, stepId, substepIndex, completed) {
    const motor = await getMotorById(motorId);
    if (!motor) return null;
    
    const stepIndex = motor.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return null;
    
    if (!motor.steps[stepIndex].substepsCompleted) {
        motor.steps[stepIndex].substepsCompleted = new Array(motor.steps[stepIndex].substeps.length).fill(false);
    }
    
    motor.steps[stepIndex].substepsCompleted[substepIndex] = completed;
    const allDone = motor.steps[stepIndex].substepsCompleted.every(v => v === true);
    
    motor.steps[stepIndex].completed = allDone;
    motor.steps[stepIndex].completedAt = allDone ? serverTimestamp() : null;
    
    if (!allDone) {
        motor.steps[stepIndex].validated = false;
        motor.steps[stepIndex].validatedAt = null;
        motor.steps[stepIndex].validatedBy = null;
    }
    
    const anyCompleted = motor.steps.some(s => s.completed);
    const allValidated = motor.steps.every(s => s.validated);
    
    if (allValidated) motor.status = 'completed';
    else if (anyCompleted) motor.status = 'in_progress';
    else motor.status = 'pending';
    
    await updateMotor(motorId, { steps: motor.steps, status: motor.status });
    await addActivity({ type: 'substep_updated', userId: motor.userId, motorId, description: `Sous-étape "${motor.steps[stepIndex].substeps[substepIndex]}" ${completed ? 'complétée' : 'décochée'}` });
    
    return motor;
}

async function validateMotorStep(motorId, stepId, adminId) {
    const motor = await getMotorById(motorId);
    if (!motor) return null;
    
    const stepIndex = motor.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return null;
    
    motor.steps[stepIndex].validated = true;
    motor.steps[stepIndex].validatedAt = serverTimestamp();
    motor.steps[stepIndex].validatedBy = adminId;
    
    const allValidated = motor.steps.every(s => s.validated);
    motor.status = allValidated ? 'completed' : 'in_progress';
    
    await updateMotor(motorId, { steps: motor.steps, status: motor.status });
    await addActivity({ type: 'step_validated', userId: adminId, motorId, description: `Étape ${motor.steps[stepIndex].name} validée par admin` });
    
    return motor;
}

// === ACTIVITÉS ===
async function addActivity(activity) {
    try {
        activity.timestamp = serverTimestamp();
        await addDoc(collection(db, COLLECTIONS.ACTIVITIES), activity);
        return activity;
    } catch (error) {
        console.error('addActivity error:', error);
        return null;
    }
}

async function getActivities(limitCount = 20) {
    try {
        const q = query(collection(db, COLLECTIONS.ACTIVITIES), orderBy('timestamp', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        const activities = [];
        snapshot.forEach(doc => activities.push({ id: doc.id, ...doc.data() }));
        return activities;
    } catch (error) {
        console.error('getActivities error:', error);
        return [];
    }
}

// === RAPPORTS ===
async function getReports() {
    try {
        const q = query(collection(db, COLLECTIONS.REPORTS), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const reports = [];
        snapshot.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));
        return reports;
    } catch (error) {
        console.error('getReports error:', error);
        return [];
    }
}

async function getReportById(id) {
    try {
        const docRef = doc(db, COLLECTIONS.REPORTS, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
        console.error('getReportById error:', error);
        return null;
    }
}

async function saveReport(report) {
    try {
        report.createdAt = serverTimestamp();
        report.status = 'unread';
        const docRef = await addDoc(collection(db, COLLECTIONS.REPORTS), report);
        await addActivity({ type: 'report_created', userId: report.userId, motorId: report.motorId, description: `Rapport envoyé pour "${report.stepName}"` });
        return { id: docRef.id, ...report };
    } catch (error) {
        console.error('saveReport error:', error);
        return null;
    }
}

async function updateReport(reportId, updates) {
    try {
        updates.updatedAt = serverTimestamp();
        const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
        await updateDoc(docRef, updates);
        return { id: reportId, ...updates };
    } catch (error) {
        console.error('updateReport error:', error);
        return null;
    }
}

async function deleteReport(reportId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.REPORTS, reportId));
        return true;
    } catch (error) {
        console.error('deleteReport error:', error);
        return false;
    }
}

async function getReportsByMotor(motorId) {
    try {
        const q = query(collection(db, COLLECTIONS.REPORTS), where('motorId', '==', motorId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const reports = [];
        snapshot.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));
        return reports;
    } catch (error) {
        console.error('getReportsByMotor error:', error);
        return [];
    }
}

// === SESSION ===
function setCurrentUser(user) { sessionStorage.setItem('currentUser', JSON.stringify(user)); }
function getCurrentUser() { return JSON.parse(sessionStorage.getItem('currentUser') || 'null'); }
function logout() { sessionStorage.removeItem('currentUser'); try { signOut(auth); } catch(e) {} }

// === ÉTAPES PAR DÉFAUT ===
function getDefaultSteps(motorType, motorName = '') {
    const commonSteps = [
        { name: 'DIAGNOSTIC', substeps: ['Identifier le type de moteur', 'Relever plaque signalétique', 'Vérifier panne', 'Mesurer résistance', 'Prendre photo'] },
        { name: 'DÉMONTAGE', substeps: ['Démonter flasques', 'Extraire rotor', 'Prendre photos', 'Repérer sens bobinage', 'Noter nombre tours', 'Noter connexion'] },
        { name: 'DÉBOBINAGE', substeps: ['Enlever anciennes bobines', 'Chauffer stator', 'Nettoyer encoches'] },
        { name: 'NETTOYAGE', substeps: ['Gratter résidus vernis', 'Souffler air comprimé', 'Vérifier métal coupant'] },
        { name: 'ISOLATION', substeps: ['Mettre papier isolant', 'Nomex/Mylar/Presspan'] },
        { name: 'BOBINAGE', substeps: ['Choisir diamètre fil', 'Respecter nombre spires', 'Respecter sens', 'Insérer bobines', 'Fermer encoches'] },
        { name: 'CONNEXIONS', substeps: ['Faire jonctions', 'Isoler gaine thermique'] },
        { name: 'VERNISSAGE', substeps: ['Appliquer vernis', 'Séchage', 'Vérifier polymérisation'] },
        { name: 'REMONTAGE', substeps: ['Remonter rotor', 'Remonter roulements', 'Remonter flasques', 'Vérifier alignement'] },
        { name: 'TEST FINAL', substeps: ['Test Megger', 'Test à vide', 'Vérifier intensité', 'Vérifier échauffement'] }
    ];
    
    if (motorType === 'single_phase') {
        commonSteps.splice(5, 0, { name: 'SPÉCIFIQUE MONOPHASÉ', substeps: ['Enroulement principal', 'Enroulement auxiliaire', 'Condensateur', 'Interrupteur centrifuge'] });
    } else if (motorType === 'three_phase') {
        commonSteps.splice(5, 0, { name: 'SPÉCIFIQUE TRIPHASÉ', substeps: ['Diviser en 3 groupes', 'Pas de bobinage', 'Séquence phases', 'Couplage'] });
    }
    
    return commonSteps;
}

// === INITIALISATION ===
async function initializeDefaultMotorTypes() {
    try {
        const types = await getMotorTypes();
        if (types.length === 0) {
            const defaults = [
                { name: 'Moteur Triphasé 0.75kW', motorType: 'three_phase', power: '0.75', voltage: '400', current: '2.1', frequency: '50', rpm: '1420', powerFactor: '0.75', insulationClass: 'F', couplingType: 'star', poles: '4' },
                { name: 'Moteur Triphasé 1.5kW', motorType: 'three_phase', power: '1.5', voltage: '400', current: '3.5', frequency: '50', rpm: '1430', powerFactor: '0.79', insulationClass: 'F', couplingType: 'star', poles: '4' },
                { name: 'Moteur Triphasé 3kW', motorType: 'three_phase', power: '3', voltage: '400', current: '6.4', frequency: '50', rpm: '1440', powerFactor: '0.82', insulationClass: 'F', couplingType: 'star', poles: '4' },
                { name: 'Moteur Triphasé 5.5kW', motorType: 'three_phase', power: '5.5', voltage: '400', current: '11.5', frequency: '50', rpm: '1450', powerFactor: '0.84', insulationClass: 'F', couplingType: 'delta', poles: '4' },
                { name: 'Moteur Triphasé 7.5kW', motorType: 'three_phase', power: '7.5', voltage: '400', current: '15.2', frequency: '50', rpm: '1455', powerFactor: '0.84', insulationClass: 'F', couplingType: 'delta', poles: '4' },
                { name: 'Moteur Triphasé 11kW', motorType: 'three_phase', power: '11', voltage: '400', current: '21.5', frequency: '50', rpm: '1460', powerFactor: '0.85', insulationClass: 'F', couplingType: 'delta', poles: '4' },
                { name: 'Moteur Triphasé 15kW', motorType: 'three_phase', power: '15', voltage: '400', current: '28.5', frequency: '50', rpm: '1465', powerFactor: '0.85', insulationClass: 'F', couplingType: 'delta', poles: '4' },
                { name: 'Moteur Triphasé 22kW', motorType: 'three_phase', power: '22', voltage: '400', current: '41', frequency: '50', rpm: '1470', powerFactor: '0.86', insulationClass: 'F', couplingType: 'delta', poles: '4' },
                { name: 'Moteur Monophasé 0.75kW', motorType: 'single_phase', power: '0.75', voltage: '230', current: '5.0', frequency: '50', rpm: '1420', powerFactor: '0.78', insulationClass: 'F', couplingType: '', poles: '4' },
                { name: 'Moteur Monophasé 1.5kW', motorType: 'single_phase', power: '1.5', voltage: '230', current: '9.2', frequency: '50', rpm: '1435', powerFactor: '0.81', insulationClass: 'F', couplingType: '', poles: '4' },
                { name: 'Moteur Monophasé 2.2kW', motorType: 'single_phase', power: '2.2', voltage: '230', current: '12.5', frequency: '50', rpm: '1440', powerFactor: '0.82', insulationClass: 'F', couplingType: '', poles: '4' },
                { name: 'Moteur Pompe Immergée 4kW', motorType: 'three_phase', power: '4', voltage: '400', current: '8.5', frequency: '50', rpm: '2890', powerFactor: '0.83', insulationClass: 'F', couplingType: 'delta', poles: '2' },
                { name: 'Moteur Compresseur 10kW', motorType: 'three_phase', power: '10', voltage: '400', current: '19.5', frequency: '50', rpm: '1465', powerFactor: '0.85', insulationClass: 'F', couplingType: 'delta', poles: '4' },
                { name: 'Moteur Broyeur 15kW', motorType: 'three_phase', power: '15', voltage: '400', current: '28.5', frequency: '50', rpm: '1460', powerFactor: '0.85', insulationClass: 'H', couplingType: 'delta', poles: '4' },
                { name: 'Moteur Treuil 3kW', motorType: 'three_phase', power: '3', voltage: '400', current: '6.5', frequency: '50', rpm: '1420', powerFactor: '0.81', insulationClass: 'F', couplingType: 'star', poles: '4' }
            ];
            for (const t of defaults) await saveMotorType(t);
            console.log('✅ 15 types de moteurs créés');
        }
    } catch (e) { console.error(e); }
}

async function initializeAdminUser() {
    const admin = await getUserByEmail('admin@fortico.com');
    if (!admin) {
        await saveUser({ name: 'Administrateur', email: 'admin@fortico.com', password: 'admin123', role: 'admin', company: 'Fortico', approved: true });
        console.log('✅ Admin créé: admin@fortico.com / admin123');
    }
}

async function initializeStorage() {
    try {
        await initializeAdminUser();
        await initializeDefaultMotorTypes();
        console.log('✅ Storage Firebase initialisé');
    } catch (e) { console.error(e); }
}

console.log('📦 Storage Firebase prêt');