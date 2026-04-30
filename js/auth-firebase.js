// ==========================================
// AUTH FIREBASE - FORTICO REWIND
// ==========================================

// Utiliser window.auth au lieu de déclarer une nouvelle variable
const firebaseAuth = window.auth;

async function authenticateUser(email, password) {
    try {
        try { await firebaseAuth.signInWithEmailAndPassword(email, password); } catch (fbErr) {}
        const user = await getUserByEmail(email);
        if (!user) return { success: false, message: 'Utilisateur non trouvé' };
        if (user.role !== 'user') return { success: false, message: 'Compte non utilisateur' };
        if (!user.approved) return { success: false, message: 'Compte en attente de validation admin' };
        if (user.password !== password) return { success: false, message: 'Mot de passe incorrect' };
        setCurrentUser(user);
        await addActivity({ type: 'login', userId: user.id, description: `${user.name} connecté` });
        return { success: true, user };
    } catch (error) { return { success: false, message: 'Erreur de connexion' }; }
}

async function authenticateAdmin(email, password) {
    try {
        try { await firebaseAuth.signInWithEmailAndPassword(email, password); } catch (fbErr) {}
        const admin = await getUserByEmail(email);
        if (!admin || admin.role !== 'admin') return { success: false, message: 'Accès refusé' };
        if (admin.password !== password) return { success: false, message: 'Mot de passe incorrect' };
        setCurrentUser(admin);
        await addActivity({ type: 'admin_login', userId: admin.id, description: 'Admin connecté' });
        return { success: true, admin };
    } catch (error) { return { success: false, message: 'Erreur de connexion' }; }
}

async function registerUser(userData) {
    try {
        const existing = await getUserByEmail(userData.email);
        if (existing) return { success: false, message: 'Email déjà utilisé' };
        try { await firebaseAuth.createUserWithEmailAndPassword(userData.email, userData.password); } catch (fbErr) {}
        const newUser = { name: userData.name, email: userData.email, password: userData.password, company: userData.company || '', role: 'user', approved: false };
        const saved = await saveUser(newUser);
        await addActivity({ type: 'user_registered', userId: saved?.id, description: `Inscription ${newUser.name}` });
        try { await firebaseAuth.signOut(); } catch (e) {}
        return { success: true, message: 'Compte créé, en attente de validation' };
    } catch (error) { return { success: false, message: 'Erreur d\'inscription' }; }
}

console.log('🔐 Auth Firebase prêt');