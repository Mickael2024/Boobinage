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
  function getDefaultSteps(motorType, motorName = '') {
    // Étapes communes à tous les moteurs
    const commonSteps = [
      { 
        name: 'DIAGNOSTIC', 
        substeps: [
          'Identifier le type de moteur', 
          'Relever plaque signalétique', 
          'Vérifier panne (court-circuit, bobine coupée, isolation brûlée)', 
          'Mesurer résistance des enroulements',
          'Prendre photo de la plaque'
        ] 
      },
      { 
        name: 'DÉMONTAGE', 
        substeps: [
          'Démonter les flasques', 
          'Extraire le rotor', 
          'Prendre des photos avant démontage', 
          'Repérer le sens du bobinage', 
          'Noter le nombre de tours par bobine', 
          'Noter le type de connexion'
        ] 
      },
      { 
        name: 'DÉBOBINAGE', 
        substeps: [
          'Enlever les anciennes bobines', 
          'Chauffer le stator (four ou chalumeau)', 
          'Nettoyer les encoches des résidus de vernis'
        ] 
      },
      { 
        name: 'NETTOYAGE', 
        substeps: [
          'Gratter les résidus de vernis', 
          'Souffler à l\'air comprimé', 
          'Vérifier l\'absence de métal coupant', 
          'Nettoyer les roulements'
        ] 
      },
      { 
        name: 'ISOLATION', 
        substeps: [
          'Mettre du papier isolant dans les encoches', 
          'Utiliser Nomex/Mylar/Presspan selon la classe', 
          'Vérifier l\'épaisseur d\'isolation'
        ] 
      },
      { 
        name: 'BOBINAGE', 
        substeps: [
          'Choisir le bon diamètre de fil', 
          'Respecter le nombre de spires', 
          'Respecter le sens du bobinage', 
          'Insérer les bobines dans les encoches',
          'Fermer les encoches avec des cales'
        ] 
      },
      { 
        name: 'CONNEXIONS', 
        substeps: [
          'Faire les jonctions (soudure ou sertissage)', 
          'Isoler avec gaine thermorétractable', 
          'Vérifier le serrage des connexions'
        ] 
      },
      { 
        name: 'VERNISSAGE', 
        substeps: [
          'Appliquer le vernis isolant (trempage ou pinceau)', 
          'Séchage au four à température contrôlée', 
          'Vérifier la polymérisation du vernis'
        ] 
      },
      { 
        name: 'REMONTAGE', 
        substeps: [
          'Remonter le rotor', 
          'Remonter les roulements (neufs si nécessaire)', 
          'Remonter les flasques', 
          'Vérifier l\'alignement', 
          'Remonter le ventilateur'
        ] 
      },
      { 
        name: 'TEST FINAL', 
        substeps: [
          'Test d\'isolement au Megger (500V ou 1000V)', 
          'Test à vide (bruit, vibration)', 
          'Vérifier l\'intensité à vide', 
          'Test en charge si possible',
          'Vérifier l\'échauffement'
        ] 
      }
    ];
  
    // Détection du type spécifique via le nom
    const isHighVoltage = motorName.toLowerCase().includes('haute tension') || 
                          motorName.toLowerCase().includes('6000v');
    const isBrakeMotor = motorName.toLowerCase().includes('frein');
    const isTwoSpeed = motorName.toLowerCase().includes('2 vitesses') || 
                       motorName.toLowerCase().includes('deux vitesses');
    const isSubmersible = motorName.toLowerCase().includes('immergée') || 
                          motorName.toLowerCase().includes('pompe');
    const isAntiExplosive = motorName.toLowerCase().includes('anti-déflagrant');
    const isCrusher = motorName.toLowerCase().includes('broyeur');
    const isCompressor = motorName.toLowerCase().includes('compresseur');
    const isFan = motorName.toLowerCase().includes('ventilateur');
    const isWinch = motorName.toLowerCase().includes('treuil');
    const isMixer = motorName.toLowerCase().includes('malaxeur');
  
    // === ÉTAPES SPÉCIFIQUES SELON LE TYPE ===
    
    if (motorType === 'single_phase') {
      // Moteur monophasé
      commonSteps.splice(5, 0, {
        name: 'SPÉCIFIQUE MONOPHASÉ',
        substeps: [
          'Identifier enroulement principal (fil plus gros)',
          'Identifier enroulement auxiliaire (fil plus fin)',
          'Bobiner l\'enroulement principal',
          'Bobiner l\'enroulement auxiliaire avec décalage',
          'Vérifier le condensateur de démarrage',
          'Vérifier l\'interrupteur centrifuge',
          'Remplacer le condensateur si nécessaire'
        ]
      });
    } else if (motorType === 'three_phase') {
      // Moteur triphasé - étapes de base
      const threePhaseSteps = {
        name: 'SPÉCIFIQUE TRIPHASÉ',
        substeps: [
          'Diviser les encoches en 3 groupes (U, V, W)',
          'Respecter le pas de bobinage (1-8, 1-10, etc.)',
          'Respecter la séquence des phases',
          'Vérifier le couplage (étoile ou triangle)'
        ]
      };
      
      // Ajouts spécifiques selon le type
      if (isHighVoltage) {
        threePhaseSteps.substeps.push(
          'Utiliser du fil haute tension spécial',
          'Renforcer l\'isolation entre phases',
          'Appliquer vernis haute tension',
          'Test diélectrique à tension nominale + 2x'
        );
      }
      
      if (isTwoSpeed) {
        threePhaseSteps.substeps.push(
          'Identifier les deux bobinages (petite et grande vitesse)',
          'Bobiner séparément les deux vitesses',
          'Respecter le couplage Dahlander',
          'Vérifier le bon fonctionnement des deux vitesses'
        );
      }
      
      if (isBrakeMotor) {
        threePhaseSteps.substeps.push(
          'Démonter et nettoyer le frein',
          'Vérifier l\'usure des garnitures',
          'Régler l\'entrefer du frein',
          'Tester le déblocage du frein'
        );
      }
      
      commonSteps.splice(5, 0, threePhaseSteps);
    }
  
    // Ajouts spécifiques post-bobinage
    if (isSubmersible) {
      commonSteps.push({
        name: 'ÉTANCHÉITÉ POMPE IMMERGÉE',
        substeps: [
          'Vérifier les joints d\'étanchéité',
          'Remplacer les joints si nécessaire',
          'Test d\'étanchéité sous pression',
          'Remplir d\'huile diélectrique si prévu'
        ]
      });
    }
  
    if (isAntiExplosive) {
      commonSteps.push({
        name: 'CERTIFICATION ATEX',
        substeps: [
          'Vérifier l\'intégrité de l\'enveloppe antidéflagrante',
          'Contrôler les jeux de sécurité',
          'Appliquer peinture spéciale ATEX',
          'Documenter la conformité EX'
        ]
      });
    }
  
    if (isCrusher) {
      commonSteps.splice(8, 0, {
        name: 'RENFORT BROYEUR',
        substeps: [
          'Utiliser fil à haute résistance mécanique',
          'Renforcer les têtes de bobines',
          'Vernis haute tenue aux vibrations',
          'Équilibrer le rotor dynamiquement'
        ]
      });
    }
  
    if (isCompressor) {
      commonSteps.push({
        name: 'SPÉCIFIQUE COMPRESSEUR',
        substeps: [
          'Vérifier le sens de rotation impératif',
          'Contrôler le couple de démarrage',
          'Tester avec le compresseur accouplé'
        ]
      });
    }
  
    if (isFan) {
      commonSteps.push({
        name: 'SPÉCIFIQUE VENTILATEUR',
        substeps: [
          'Vérifier le sens du flux d\'air',
          'Contrôler l\'équilibrage de l\'hélice',
          'Tester le débit d\'air'
        ]
      });
    }
  
    if (isWinch) {
      commonSteps.push({
        name: 'SPÉCIFIQUE TREUIL',
        substeps: [
          'Vérifier le frein mécanique',
          'Tester le couple de levage',
          'Contrôler les fins de course'
        ]
      });
    }
  
    if (isMixer) {
      commonSteps.push({
        name: 'SPÉCIFIQUE MALAXEUR',
        substeps: [
          'Renforcer l\'isolation contre l\'humidité',
          'Vérifier l\'étanchéité du bout d\'arbre',
          'Tester avec la charge de malaxage'
        ]
      });
    }
  
    // Ajout des étapes spécifiques selon le nombre de pôles (détecté dans le nom)
    const polesMatch = motorName.match(/(\d+)\s*RPM/i);
    if (polesMatch) {
      const rpm = parseInt(polesMatch[1]);
      let polesStep = null;
      
      if (rpm >= 2800) {
        polesStep = {
          name: 'MOTEUR 2 PÔLES (3000 RPM)',
          substeps: [
            'Pas de bobinage généralement 1-8 ou 1-10',
            'Vitesse élevée : soigner l\'équilibrage',
            'Vérifier les roulements haute vitesse'
          ]
        };
      } else if (rpm >= 1400 && rpm < 1500) {
        polesStep = {
          name: 'MOTEUR 4 PÔLES (1500 RPM)',
          substeps: [
            'Pas de bobinage généralement 1-6 ou 1-8',
            'Configuration la plus courante'
          ]
        };
      } else if (rpm >= 900 && rpm < 1000) {
        polesStep = {
          name: 'MOTEUR 6 PÔLES (1000 RPM)',
          substeps: [
            'Pas de bobinage généralement 1-6',
            'Couple plus élevé au démarrage'
          ]
        };
      } else if (rpm >= 700 && rpm < 800) {
        polesStep = {
          name: 'MOTEUR 8 PÔLES (750 RPM)',
          substeps: [
            'Pas de bobinage généralement 1-5',
            'Nombre d\'encoches plus important',
            'Couple très élevé'
          ]
        };
      }
      
      if (polesStep) {
        commonSteps.splice(6, 0, polesStep);
      }
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
    // Liste complète des types de moteurs prédéfinis
    const defaultTypes = [
      // ===== TRIPHASÉS 1500 RPM (4 pôles) =====
      { name: 'Moteur Triphasé 0.75kW - 1500 RPM', motorType: 'three_phase', power: '0.75', voltage: '400', current: '2.1', frequency: '50', rpm: '1420', powerFactor: '0.75', insulationClass: 'F', couplingType: 'star', poles: '4' },
      { name: 'Moteur Triphasé 1.1kW - 1500 RPM', motorType: 'three_phase', power: '1.1', voltage: '400', current: '2.8', frequency: '50', rpm: '1425', powerFactor: '0.77', insulationClass: 'F', couplingType: 'star', poles: '4' },
      { name: 'Moteur Triphasé 1.5kW - 1500 RPM', motorType: 'three_phase', power: '1.5', voltage: '400', current: '3.5', frequency: '50', rpm: '1430', powerFactor: '0.79', insulationClass: 'F', couplingType: 'star', poles: '4' },
      { name: 'Moteur Triphasé 2.2kW - 1500 RPM', motorType: 'three_phase', power: '2.2', voltage: '400', current: '4.9', frequency: '50', rpm: '1435', powerFactor: '0.81', insulationClass: 'F', couplingType: 'star', poles: '4' },
      { name: 'Moteur Triphasé 3kW - 1500 RPM', motorType: 'three_phase', power: '3', voltage: '400', current: '6.4', frequency: '50', rpm: '1440', powerFactor: '0.82', insulationClass: 'F', couplingType: 'star', poles: '4' },
      { name: 'Moteur Triphasé 4kW - 1500 RPM', motorType: 'three_phase', power: '4', voltage: '400', current: '8.3', frequency: '50', rpm: '1445', powerFactor: '0.83', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Triphasé 5.5kW - 1500 RPM', motorType: 'three_phase', power: '5.5', voltage: '400', current: '11.5', frequency: '50', rpm: '1450', powerFactor: '0.84', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Triphasé 7.5kW - 1500 RPM', motorType: 'three_phase', power: '7.5', voltage: '400', current: '15.2', frequency: '50', rpm: '1455', powerFactor: '0.84', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Triphasé 11kW - 1500 RPM', motorType: 'three_phase', power: '11', voltage: '400', current: '21.5', frequency: '50', rpm: '1460', powerFactor: '0.85', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Triphasé 15kW - 1500 RPM', motorType: 'three_phase', power: '15', voltage: '400', current: '28.5', frequency: '50', rpm: '1465', powerFactor: '0.85', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Triphasé 18.5kW - 1500 RPM', motorType: 'three_phase', power: '18.5', voltage: '400', current: '35', frequency: '50', rpm: '1470', powerFactor: '0.86', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Triphasé 22kW - 1500 RPM', motorType: 'three_phase', power: '22', voltage: '400', current: '41', frequency: '50', rpm: '1470', powerFactor: '0.86', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Triphasé 30kW - 1500 RPM', motorType: 'three_phase', power: '30', voltage: '400', current: '55', frequency: '50', rpm: '1475', powerFactor: '0.87', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Triphasé 37kW - 1500 RPM', motorType: 'three_phase', power: '37', voltage: '400', current: '68', frequency: '50', rpm: '1480', powerFactor: '0.87', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      
      // ===== TRIPHASÉS 3000 RPM (2 pôles) =====
      { name: 'Moteur Triphasé 1.5kW - 3000 RPM', motorType: 'three_phase', power: '1.5', voltage: '400', current: '3.2', frequency: '50', rpm: '2880', powerFactor: '0.82', insulationClass: 'F', couplingType: 'star', poles: '2' },
      { name: 'Moteur Triphasé 2.2kW - 3000 RPM', motorType: 'three_phase', power: '2.2', voltage: '400', current: '4.5', frequency: '50', rpm: '2890', powerFactor: '0.83', insulationClass: 'F', couplingType: 'delta', poles: '2' },
      { name: 'Moteur Triphasé 3kW - 3000 RPM', motorType: 'three_phase', power: '3', voltage: '400', current: '6.1', frequency: '50', rpm: '2890', powerFactor: '0.84', insulationClass: 'F', couplingType: 'delta', poles: '2' },
      { name: 'Moteur Triphasé 5.5kW - 3000 RPM', motorType: 'three_phase', power: '5.5', voltage: '400', current: '11', frequency: '50', rpm: '2910', powerFactor: '0.86', insulationClass: 'F', couplingType: 'delta', poles: '2' },
      { name: 'Moteur Triphasé 7.5kW - 3000 RPM', motorType: 'three_phase', power: '7.5', voltage: '400', current: '14.5', frequency: '50', rpm: '2920', powerFactor: '0.87', insulationClass: 'F', couplingType: 'delta', poles: '2' },
      { name: 'Moteur Triphasé 11kW - 3000 RPM', motorType: 'three_phase', power: '11', voltage: '400', current: '21', frequency: '50', rpm: '2930', powerFactor: '0.88', insulationClass: 'F', couplingType: 'delta', poles: '2' },
      
      // ===== TRIPHASÉS 1000 RPM (6 pôles) =====
      { name: 'Moteur Triphasé 3kW - 1000 RPM', motorType: 'three_phase', power: '3', voltage: '400', current: '7.2', frequency: '50', rpm: '950', powerFactor: '0.76', insulationClass: 'F', couplingType: 'star', poles: '6' },
      { name: 'Moteur Triphasé 5.5kW - 1000 RPM', motorType: 'three_phase', power: '5.5', voltage: '400', current: '12.5', frequency: '50', rpm: '960', powerFactor: '0.78', insulationClass: 'F', couplingType: 'delta', poles: '6' },
      { name: 'Moteur Triphasé 7.5kW - 1000 RPM', motorType: 'three_phase', power: '7.5', voltage: '400', current: '16.5', frequency: '50', rpm: '965', powerFactor: '0.79', insulationClass: 'F', couplingType: 'delta', poles: '6' },
      { name: 'Moteur Triphasé 11kW - 1000 RPM', motorType: 'three_phase', power: '11', voltage: '400', current: '23', frequency: '50', rpm: '970', powerFactor: '0.80', insulationClass: 'F', couplingType: 'delta', poles: '6' },
      
      // ===== TRIPHASÉS 750 RPM (8 pôles) =====
      { name: 'Moteur Triphasé 5.5kW - 750 RPM', motorType: 'three_phase', power: '5.5', voltage: '400', current: '14', frequency: '50', rpm: '720', powerFactor: '0.72', insulationClass: 'F', couplingType: 'delta', poles: '8' },
      { name: 'Moteur Triphasé 11kW - 750 RPM', motorType: 'three_phase', power: '11', voltage: '400', current: '25', frequency: '50', rpm: '730', powerFactor: '0.75', insulationClass: 'F', couplingType: 'delta', poles: '8' },
      { name: 'Moteur Triphasé 15kW - 750 RPM', motorType: 'three_phase', power: '15', voltage: '400', current: '33', frequency: '50', rpm: '735', powerFactor: '0.77', insulationClass: 'F', couplingType: 'delta', poles: '8' },
      
      // ===== MONOPHASÉS 1500 RPM =====
      { name: 'Moteur Monophasé 0.37kW - 1500 RPM', motorType: 'single_phase', power: '0.37', voltage: '230', current: '2.8', frequency: '50', rpm: '1400', powerFactor: '0.72', insulationClass: 'B', couplingType: '', poles: '4' },
      { name: 'Moteur Monophasé 0.55kW - 1500 RPM', motorType: 'single_phase', power: '0.55', voltage: '230', current: '3.8', frequency: '50', rpm: '1410', powerFactor: '0.75', insulationClass: 'B', couplingType: '', poles: '4' },
      { name: 'Moteur Monophasé 0.75kW - 1500 RPM', motorType: 'single_phase', power: '0.75', voltage: '230', current: '5.0', frequency: '50', rpm: '1420', powerFactor: '0.78', insulationClass: 'F', couplingType: '', poles: '4' },
      { name: 'Moteur Monophasé 1.1kW - 1500 RPM', motorType: 'single_phase', power: '1.1', voltage: '230', current: '7.0', frequency: '50', rpm: '1430', powerFactor: '0.80', insulationClass: 'F', couplingType: '', poles: '4' },
      { name: 'Moteur Monophasé 1.5kW - 1500 RPM', motorType: 'single_phase', power: '1.5', voltage: '230', current: '9.2', frequency: '50', rpm: '1435', powerFactor: '0.81', insulationClass: 'F', couplingType: '', poles: '4' },
      { name: 'Moteur Monophasé 2.2kW - 1500 RPM', motorType: 'single_phase', power: '2.2', voltage: '230', current: '12.5', frequency: '50', rpm: '1440', powerFactor: '0.82', insulationClass: 'F', couplingType: '', poles: '4' },
      { name: 'Moteur Monophasé 3kW - 1500 RPM', motorType: 'single_phase', power: '3', voltage: '230', current: '16.5', frequency: '50', rpm: '1445', powerFactor: '0.83', insulationClass: 'F', couplingType: '', poles: '4' },
      
      // ===== MONOPHASÉS 3000 RPM =====
      { name: 'Moteur Monophasé 0.75kW - 3000 RPM', motorType: 'single_phase', power: '0.75', voltage: '230', current: '4.8', frequency: '50', rpm: '2830', powerFactor: '0.76', insulationClass: 'B', couplingType: '', poles: '2' },
      { name: 'Moteur Monophasé 1.1kW - 3000 RPM', motorType: 'single_phase', power: '1.1', voltage: '230', current: '6.8', frequency: '50', rpm: '2850', powerFactor: '0.79', insulationClass: 'B', couplingType: '', poles: '2' },
      { name: 'Moteur Monophasé 2.2kW - 3000 RPM', motorType: 'single_phase', power: '2.2', voltage: '230', current: '12', frequency: '50', rpm: '2900', powerFactor: '0.82', insulationClass: 'F', couplingType: '', poles: '2' },
      
      // ===== MOTEURS SPÉCIAUX =====
      { name: 'Moteur Frein Triphasé 5.5kW', motorType: 'three_phase', power: '5.5', voltage: '400', current: '11.5', frequency: '50', rpm: '1450', powerFactor: '0.84', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Pompe Immergée 4kW', motorType: 'three_phase', power: '4', voltage: '400', current: '8.5', frequency: '50', rpm: '2890', powerFactor: '0.83', insulationClass: 'F', couplingType: 'delta', poles: '2' },
      { name: 'Moteur Ventilateur 1.5kW', motorType: 'three_phase', power: '1.5', voltage: '400', current: '3.5', frequency: '50', rpm: '1420', powerFactor: '0.79', insulationClass: 'F', couplingType: 'star', poles: '4' },
      { name: 'Moteur Compresseur 10kW', motorType: 'three_phase', power: '10', voltage: '400', current: '19.5', frequency: '50', rpm: '1465', powerFactor: '0.85', insulationClass: 'F', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Broyeur 15kW', motorType: 'three_phase', power: '15', voltage: '400', current: '28.5', frequency: '50', rpm: '1460', powerFactor: '0.85', insulationClass: 'H', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Treuil 3kW', motorType: 'three_phase', power: '3', voltage: '400', current: '6.5', frequency: '50', rpm: '1420', powerFactor: '0.81', insulationClass: 'F', couplingType: 'star', poles: '4' },
      { name: 'Moteur Malaxeur 2.2kW', motorType: 'three_phase', power: '2.2', voltage: '400', current: '4.9', frequency: '50', rpm: '1410', powerFactor: '0.80', insulationClass: 'F', couplingType: 'star', poles: '4' },
      { name: 'Moteur à 2 vitesses 1.5/3kW', motorType: 'three_phase', power: '3', voltage: '400', current: '6.8', frequency: '50', rpm: '1450/2900', powerFactor: '0.82', insulationClass: 'F', couplingType: 'star/delta', poles: '4/2' },
      { name: 'Moteur Anti-déflagrant 7.5kW', motorType: 'three_phase', power: '7.5', voltage: '400', current: '15', frequency: '50', rpm: '1460', powerFactor: '0.83', insulationClass: 'H', couplingType: 'delta', poles: '4' },
      { name: 'Moteur Haute Tension 200kW - 6000V', motorType: 'three_phase', power: '200', voltage: '6000', current: '24', frequency: '50', rpm: '1485', powerFactor: '0.88', insulationClass: 'H', couplingType: 'star', poles: '4' }
    ];
    
    // Enregistrer tous les types
    defaultTypes.forEach(type => saveMotorType(type));
  }
}

// === RAPPORTS AVEC PHOTOS ===
function getReports() {
  return JSON.parse(localStorage.getItem('fortico_reports') || '[]');
}

function getReportById(id) {
  return getReports().find(r => r.id === id);
}

function saveReport(report) {
  const reports = getReports();
  report.id = 'report_' + Date.now();
  report.createdAt = new Date().toISOString();
  report.status = 'unread'; // unread, read, approved, rejected
  reports.unshift(report);
  localStorage.setItem('fortico_reports', JSON.stringify(reports));
  addActivity({ 
    type: 'report_created', 
    userId: report.userId, 
    motorId: report.motorId, 
    description: `Rapport envoyé pour l'étape "${report.stepName}" du moteur ${report.motorClient || ''}` 
  });
  return report;
}

function updateReport(reportId, updates) {
  const reports = getReports();
  const index = reports.findIndex(r => r.id === reportId);
  if (index !== -1) {
    reports[index] = { ...reports[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('fortico_reports', JSON.stringify(reports));
    return reports[index];
  }
  return null;
}

function deleteReport(reportId) {
  const reports = getReports().filter(r => r.id !== reportId);
  localStorage.setItem('fortico_reports', JSON.stringify(reports));
}

function getReportsByMotor(motorId) {
  return getReports().filter(r => r.motorId === motorId);
}

function getReportsByUser(userId) {
  return getReports().filter(r => r.userId === userId);
}