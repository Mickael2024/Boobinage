function authenticateUser(email, password) {
    const user = getUsers().find(u => u.email === email && u.password === password && u.role === 'user');
    if (user) {
      if (!user.approved) return { success: false, message: 'Compte en attente de validation admin' };
      setCurrentUser(user);
      addActivity({ type: 'login', userId: user.id, description: `${user.name} connecté` });
      return { success: true, user };
    }
    return { success: false, message: 'Identifiants invalides' };
  }
  
  function authenticateAdmin(email, password) {
    const admin = getUsers().find(u => u.email === email && u.password === password && u.role === 'admin');
    if (admin) {
      setCurrentUser(admin);
      addActivity({ type: 'admin_login', userId: admin.id, description: 'Admin connecté' });
      return { success: true, admin };
    }
    return { success: false, message: 'Accès refusé' };
  }
  
  function registerUser(userData) {
    if (getUsers().find(u => u.email === userData.email)) return { success: false, message: 'Email déjà utilisé' };
    const newUser = { id: 'user_' + Date.now(), ...userData, role: 'user', approved: false, createdAt: new Date().toISOString() };
    saveUser(newUser);
    addActivity({ type: 'user_registered', userId: newUser.id, description: `Inscription ${newUser.name}` });
    return { success: true, message: 'Compte créé, en attente de validation' };
  }