// === INITIALISATION ===
function initializeStorage() {
    // Utilisateurs
    if (!localStorage.getItem('fortico_users')) {
      const defaultUsers = [{
        id: 'admin_' + Date.now(),
        name: 'Administrateur',
        email: 'admin@fortico.com',
        password: 'admin123',
        role: 'admin',
        company: 'Fortico',
        approved: true,
        createdAt: new Date().toISOString()
      }];
      localStorage.setItem('fortico_users', JSON.stringify(defaultUsers));
    }
    
    // Moteurs
    if (!localStorage.getItem('fortico_motors')) {
      localStorage.setItem('fortico_motors', JSON.stringify([]));
    }
    
    // Activités
    if (!localStorage.getItem('fortico_activities')) {
      localStorage.setItem('fortico_activities', JSON.stringify([]));
    }
    
    // Types de moteurs prédéfinis
    if (!localStorage.getItem('fortico_motor_types')) {
      localStorage.setItem('fortico_motor_types', JSON.stringify([]));
    }
 // MIGRATION : Ajouter les customSteps aux types existants
 migrateMotorTypes();  
}
  
  // === TYPES DE MOTEURS PRÉDÉFINIS ===
  function getMotorTypes() {
    return JSON.parse(localStorage.getItem('fortico_motor_types') || '[]');
  }
  
  function getMotorTypeById(id) {
    return getMotorTypes().find(t => t.id === id);
  }
  
  function saveMotorType(motorType) {
    const types = getMotorTypes();
    motorType.id = 'type_' + Date.now();
    motorType.createdAt = new Date().toISOString();
    
    // Si pas d'étapes personnalisées, utiliser les étapes par défaut
    if (!motorType.customSteps) {
      motorType.customSteps = getDefaultSteps(motorType.motorType).map(step => ({
        ...step,
        id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
      }));
    }
    
    types.push(motorType);
    localStorage.setItem('fortico_motor_types', JSON.stringify(types));
    return motorType;
  }
  
  function updateMotorType(typeId, updates) {
    const types = getMotorTypes();
    const index = types.findIndex(t => t.id === typeId);
    if (index !== -1) {
      types[index] = { ...types[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('fortico_motor_types', JSON.stringify(types));
      return types[index];
    }
    return null;
  }
  
  function deleteMotorType(typeId) {
    const types = getMotorTypes().filter(t => t.id !== typeId);
    localStorage.setItem('fortico_motor_types', JSON.stringify(types));
  }
  
  // === GESTION DES ÉTAPES PERSONNALISÉES ===
  function addStepToMotorType(typeId, step) {
    const type = getMotorTypeById(typeId);
    if (!type) return null;
    
    if (!type.customSteps) type.customSteps = [];
    
    const newStep = {
      id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: step.name,
      substeps: step.substeps || []
    };
    
    type.customSteps.push(newStep);
    updateMotorType(typeId, { customSteps: type.customSteps });
    return newStep;
  }
  
  function updateStepInMotorType(typeId, stepId, updates) {
    const type = getMotorTypeById(typeId);
    if (!type || !type.customSteps) return null;
    
    const stepIndex = type.customSteps.findIndex(s => s.id === stepId);
    if (stepIndex !== -1) {
      type.customSteps[stepIndex] = { ...type.customSteps[stepIndex], ...updates };
      updateMotorType(typeId, { customSteps: type.customSteps });
      return type.customSteps[stepIndex];
    }
    return null;
  }
  
  function deleteStepFromMotorType(typeId, stepId) {
    const type = getMotorTypeById(typeId);
    if (!type || !type.customSteps) return false;
    
    type.customSteps = type.customSteps.filter(s => s.id !== stepId);
    updateMotorType(typeId, { customSteps: type.customSteps });
    return true;
  }
  
  function addSubstepToStep(typeId, stepId, substep) {
    const type = getMotorTypeById(typeId);
    if (!type || !type.customSteps) return null;
    
    const step = type.customSteps.find(s => s.id === stepId);
    if (step) {
      if (!step.substeps) step.substeps = [];
      step.substeps.push(substep);
      updateMotorType(typeId, { customSteps: type.customSteps });
      return step;
    }
    return null;
  }
  
  function deleteSubstepFromStep(typeId, stepId, substepIndex) {
    const type = getMotorTypeById(typeId);
    if (!type || !type.customSteps) return false;
    
    const step = type.customSteps.find(s => s.id === stepId);
    if (step && step.substeps) {
      step.substeps.splice(substepIndex, 1);
      updateMotorType(typeId, { customSteps: type.customSteps });
      return true;
    }
    return false;
  }
  
  // === ÉTAPES PAR DÉFAUT ===
  function getDefaultSteps(motorType) {
    const commonSteps = [
      { name: 'DIAGNOSTIC', substeps: ['Identifier type', 'Vérifier panne', 'Court-circuit', 'Bobine coupée', 'Isolation brûlée'] },
      { name: 'DÉMONTAGE', substeps: ['Démonter flasques/rotor', 'Prendre photos', 'Repérer sens bobinage', 'Noter nombre tours', 'Noter connexion'] },
      { name: 'DÉBOBINAGE', substeps: ['Enlever anciennes bobines', 'Chauffer stator', 'Nettoyer encoches'] },
      { name: 'NETTOYAGE', substeps: ['Gratter résidus vernis', 'Souffler air comprimé', 'Vérifier métal coupant'] },
      { name: 'ISOLATION', substeps: ['Mettre papier isolant', 'Nomex/Mylar/Presspan'] },
      { name: 'BOBINAGE', substeps: ['Choisir bon diamètre fil', 'Respecter nombre spires', 'Respecter sens', 'Insérer bobines'] },
      { name: 'CONNEXIONS', substeps: ['Faire jonctions', 'Isoler gaine thermique'] },
      { name: 'VERNISSAGE', substeps: ['Appliquer vernis', 'Séchage'] },
      { name: 'REMONTAGE', substeps: ['Remonter rotor', 'Remonter roulements', 'Vérifier alignement'] },
      { name: 'TEST FINAL', substeps: ['Test isolement Megger', 'Test à vide', 'Vérifier bruit/vibration', 'Vérifier intensité'] }
    ];
    
    if (motorType === 'single_phase') {
      commonSteps.splice(5, 0, {
        name: 'SPÉCIFIQUE MONOPHASÉ', 
        substeps: ['Bobiner enroulement principal (gros fil)', 'Bobiner auxiliaire (fil fin)', 'Ajouter condensateur', 'Vérifier interrupteur centrifuge']
      });
    } else if (motorType === 'three_phase') {
      commonSteps.splice(5, 0, {
        name: 'SPÉCIFIQUE TRIPHASÉ',
        substeps: ['Diviser encoches en 3 groupes', 'Respecter pas de bobinage', 'Respecter séquence phases U,V,W']
      });
    }
    
    return commonSteps;
  }
  
  // === UTILISATEURS ===
  function getUsers() { return JSON.parse(localStorage.getItem('fortico_users') || '[]'); }
  function saveUser(user) { const users = getUsers(); users.push(user); localStorage.setItem('fortico_users', JSON.stringify(users)); return user; }
  function updateUser(userId, updates) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) { users[index] = { ...users[index], ...updates }; localStorage.setItem('fortico_users', JSON.stringify(users)); return users[index]; }
    return null;
  }
  
  // === MOTEURS ===
  function getMotors() { return JSON.parse(localStorage.getItem('fortico_motors') || '[]'); }
  function getMotorById(id) { return getMotors().find(m => m.id === id); }
  
  function saveMotor(motor) {
    const motors = getMotors();
    motor.id = 'motor_' + Date.now();
    motor.createdAt = new Date().toISOString();
    motor.status = 'pending';
    
    // Utiliser les étapes du template si spécifié
    let steps;
    if (motor.templateId) {
      const template = getMotorTypeById(motor.templateId);
      steps = template?.customSteps || getDefaultSteps(motor.motorType);
    } else {
      steps = getDefaultSteps(motor.motorType);
    }
    
    motor.steps = steps.map(step => ({
      ...step,
      completed: false,
      validated: false,
      completedAt: null,
      validatedAt: null,
      validatedBy: null,
      // Initialiser le tableau de suivi des sous-étapes
      substepsCompleted: new Array(step.substeps.length).fill(false)
    }));
    
    motors.push(motor);
    localStorage.setItem('fortico_motors', JSON.stringify(motors));
    addActivity({ type: 'motor_created', userId: motor.userId, motorId: motor.id, description: `Moteur ${motor.clientName || ''} enregistré` });
    return motor;
  }
  
  function updateMotor(motorId, updates) {
    const motors = getMotors();
    const index = motors.findIndex(m => m.id === motorId);
    if (index !== -1) { 
      motors[index] = { ...motors[index], ...updates, updatedAt: new Date().toISOString() }; 
      localStorage.setItem('fortico_motors', JSON.stringify(motors)); 
      return motors[index]; 
    }
    return null;
  }
  
 // === MISE À JOUR D'UNE SOUS-ÉTAPE ===
function updateMotorSubstep(motorId, stepId, substepIndex, completed) {
    const motor = getMotorById(motorId);
    if (!motor) return null;
    
    const step = motor.steps.find(s => s.id === stepId);
    if (!step) return null;
    
    // Initialiser le tableau de suivi des sous-étapes s'il n'existe pas
    if (!step.substepsCompleted) {
      step.substepsCompleted = new Array(step.substeps.length).fill(false);
    }
    
    // Mettre à jour la sous-étape spécifique
    step.substepsCompleted[substepIndex] = completed;
    
    // Vérifier si TOUTES les sous-étapes sont complétées
    const allSubstepsCompleted = step.substepsCompleted.every(v => v === true);
    
    // Mettre à jour le statut global de l'étape
    step.completed = allSubstepsCompleted;
    step.completedAt = allSubstepsCompleted ? new Date().toISOString() : null;
    
    // Si l'étape est décomplétée, elle n'est plus validée
    if (!allSubstepsCompleted) {
      step.validated = false;
      step.validatedAt = null;
      step.validatedBy = null;
    }
    
    motor.updatedAt = new Date().toISOString();
    
    // Mettre à jour le statut global du moteur
    const anyCompleted = motor.steps.some(s => s.completed);
    const allValidated = motor.steps.every(s => s.validated);
    
    if (allValidated) {
      motor.status = 'completed';
    } else if (anyCompleted) {
      motor.status = 'in_progress';
    } else {
      motor.status = 'pending';
    }
    
    const motors = getMotors();
    const mIndex = motors.findIndex(m => m.id === motorId);
    motors[mIndex] = motor;
    localStorage.setItem('fortico_motors', JSON.stringify(motors));
    
    addActivity({ 
      type: 'substep_updated', 
      userId: motor.userId, 
      motorId, 
      description: `Sous-étape "${step.substeps[substepIndex]}" ${completed ? 'complétée' : 'décochée'}` 
    });
    
    return motor;
  }

  function validateMotorStep(motorId, stepId, adminId) {
    const motor = getMotorById(motorId);
    if (!motor) return null;
    
    const stepIndex = motor.steps.findIndex(s => s.id === stepId);
    if (stepIndex !== -1) {
      motor.steps[stepIndex].validated = true;
      motor.steps[stepIndex].validatedAt = new Date().toISOString();
      motor.steps[stepIndex].validatedBy = adminId;
      
      const allValidated = motor.steps.every(s => s.validated);
      motor.status = allValidated ? 'completed' : 'in_progress';
      motor.updatedAt = new Date().toISOString();
      
      const motors = getMotors();
      const mIndex = motors.findIndex(m => m.id === motorId);
      motors[mIndex] = motor;
      localStorage.setItem('fortico_motors', JSON.stringify(motors));
      
      addActivity({ type: 'step_validated', userId: adminId, motorId, description: `Étape ${motor.steps[stepIndex].name} validée par admin` });
      return motor;
    }
    return null;
  }
  // === MIGRATION DES TYPES EXISTANTS ===
function migrateMotorTypes() {
    const types = getMotorTypes();
    let updated = false;
    
    types.forEach(type => {
      if (!type.customSteps) {
        type.customSteps = getDefaultSteps(type.motorType).map(step => ({
          ...step,
          id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
        }));
        updated = true;
      }
    });
    
    if (updated) {
      localStorage.setItem('fortico_motor_types', JSON.stringify(types));
    }
  }
  
  // === INITIALISATION ===
 
  // === ACTIVITÉS ===
  function addActivity(activity) {
    const activities = JSON.parse(localStorage.getItem('fortico_activities') || '[]');
    activity.id = 'act_' + Date.now();
    activity.timestamp = new Date().toISOString();
    activities.unshift(activity);
    if (activities.length > 50) activities.pop();
    localStorage.setItem('fortico_activities', JSON.stringify(activities));
  }
  function getActivities(limit = 20) { return JSON.parse(localStorage.getItem('fortico_activities') || '[]').slice(0, limit); }
  
  // === SESSION ===
  function setCurrentUser(user) { sessionStorage.setItem('currentUser', JSON.stringify(user)); }
  function getCurrentUser() { return JSON.parse(sessionStorage.getItem('currentUser') || 'null'); }
  function logout() { sessionStorage.removeItem('currentUser'); }
  
  // === INITIALISATION TYPES PAR DÉFAUT ===
  function initializeDefaultMotorTypes() {
    const types = getMotorTypes();
    if (types.length === 0) {
      saveMotorType({
        name: 'Moteur Triphasé Standard 15kW',
        motorType: 'three_phase',
        power: '15',
        voltage: '400',
        current: '28.5',
        frequency: '50',
        rpm: '1450',
        powerFactor: '0.85',
        insulationClass: 'F',
        couplingType: 'star',
        poles: '4'
      });
      saveMotorType({
        name: 'Moteur Monophasé 2.2kW',
        motorType: 'single_phase',
        power: '2.2',
        voltage: '230',
        current: '12',
        frequency: '50',
        rpm: '1420',
        powerFactor: '0.8',
        insulationClass: 'B',
        couplingType: '',
        poles: '2'
      });
    }
  }