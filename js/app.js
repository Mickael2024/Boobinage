// === POPUP PERSONNALISÉ ===
function showPopup(options) {
  const {
    title,
    message,
    icon = "question",
    confirmText = "Confirmer",
    cancelText = "Annuler",
    onConfirm,
    onCancel,
  } = options;
  const container = document.getElementById("popup-container");
  if (!container) return;
  container.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  const popup = document.createElement("div");
  popup.className = "popup";

  const isHtml =
    typeof message === "string" &&
    message.includes("<") &&
    message.includes(">");

  popup.innerHTML = `
      <div class="popup-icon"><i class="fas fa-${icon}"></i></div>
      <h3>${title}</h3>
      ${isHtml ? message : `<p>${message}</p>`}
      <div class="popup-actions">
        <button class="cyber-button secondary cancel-btn">${cancelText}</button>
        <button class="cyber-button confirm-btn">${confirmText}</button>
      </div>
    `;

  container.appendChild(overlay);
  container.appendChild(popup);

  const cleanup = () => {
    container.innerHTML = "";
  };

  popup.querySelector(".confirm-btn").onclick = () => {
    if (onConfirm) {
      const result = onConfirm();
      if (result !== false) cleanup();
    } else cleanup();
  };

  popup.querySelector(".cancel-btn").onclick = overlay.onclick = () => {
    if (onCancel) onCancel();
    cleanup();
  };

  popup.onclick = (e) => e.stopPropagation();
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      if (onCancel) onCancel();
      cleanup();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);
}

function showNotification(message, type = "info") {
  const container = document.getElementById("notification-container");
  if (!container) return;
  const icons = {
    success: "check-circle",
    error: "times-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };
  const notif = document.createElement("div");
  notif.className = `notification ${type}`;
  notif.innerHTML = `<i class="fas fa-${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = "0";
    setTimeout(() => notif.remove(), 300);
  }, 4000);
}
window.showNotification = showNotification;

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function getStatusLabel(s) {
  return (
    { pending: "En attente", in_progress: "En cours", completed: "Terminé" }[
      s
    ] || s
  );
}

// === INIT USER ===
function initUserPage() {
  const currentUser = getCurrentUser();
  const nav = document.querySelector(".cyber-nav");
  const authView = document.getElementById("authView");

  if (currentUser && currentUser.role === "user") {
    nav?.classList.remove("hidden");
    authView?.classList.remove("active");
    showUserView("dashboard");
  } else {
    nav?.classList.add("hidden");
    authView?.classList.add("active");
  }

  document
    .getElementById("navToggle")
    ?.addEventListener("click", () =>
      document.getElementById("navMenu")?.classList.toggle("active")
    );

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".auth-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".auth-form")
        .forEach((f) => f.classList.remove("active"));
      tab.classList.add("active");
      document
        .getElementById(
          tab.dataset.tab === "login" ? "loginForm" : "registerForm"
        )
        .classList.add("active");
    });
  });

  document.getElementById("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = authenticateUser(
      document.getElementById("loginEmail").value,
      document.getElementById("loginPassword").value
    );
    r.success
      ? (showNotification("Connexion réussie", "success"),
        window.location.reload())
      : showNotification(r.message, "error");
  });

  document.getElementById("registerForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = registerUser({
      name: document.getElementById("registerName").value,
      email: document.getElementById("registerEmail").value,
      company: document.getElementById("registerCompany").value,
      password: document.getElementById("registerPassword").value,
    });
    showNotification(r.message, r.success ? "success" : "error");
    if (r.success) {
      document.querySelector('[data-tab="login"]').click();
      e.target.reset();
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
    window.location.reload();
  });

  document.getElementById("navDashboard")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navDashboard");
    showUserView("dashboard");
  });
  document.getElementById("navNewMotor")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navNewMotor");
    showUserView("newMotor");
  });
  document.getElementById("navProfile")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navProfile");
    showUserView("profile");
  });
  document.getElementById("quickNewMotor")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navNewMotor");
    showUserView("newMotor");
  });

  document
    .getElementById("backToDashboardBtn")
    ?.addEventListener("click", () => {
      setActiveNav("navDashboard");
      showUserView("dashboard");
    });
  document
    .getElementById("backFromDetailBtn")
    ?.addEventListener("click", () => {
      setActiveNav("navDashboard");
      showUserView("dashboard");
    });
  document.getElementById("cancelMotorBtn")?.addEventListener("click", () => {
    setActiveNav("navDashboard");
    showUserView("dashboard");
  });
  document.getElementById("cancelProfileBtn")?.addEventListener("click", () => {
    setActiveNav("navDashboard");
    showUserView("dashboard");
  });

  document.getElementById("motorForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveMotorData();
  });
  document
    .getElementById("motorTemplate")
    ?.addEventListener("change", applyMotorTemplate);
  document
    .getElementById("userProfileForm")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      saveUserProfile();
    });

  loadMotorTemplates();
}

function setActiveNav(id) {
  document
    .querySelectorAll(".nav-menu a")
    .forEach((a) => a.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
}

function showUserView(view) {
  ["dashboardView", "motorFormView", "motorDetailView", "profileView"].forEach(
    (v) => document.getElementById(v)?.classList.remove("active")
  );
  
  if (view === "dashboard") {
    document.getElementById("dashboardView")?.classList.add("active");
    loadUserDashboard();
  } else if (view === "newMotor") {
    document.getElementById("motorFormView")?.classList.add("active");
    document.getElementById("motorForm").reset();
    
    // Afficher les informations du technicien connecté
    const user = getCurrentUser();
    if (user) {
      document.getElementById("technicianName").textContent = user.name;
      document.getElementById("technicianEmail").textContent = user.email;
    }
  } else if (view === "motorDetail") {
    document.getElementById("motorDetailView")?.classList.add("active");
  } else if (view === "profile") {
    document.getElementById("profileView")?.classList.add("active");
    loadUserProfile();
  }
}
function loadUserDashboard() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById("userNameDisplay").textContent =
    user.name.split(" ")[0];
  const motors = getMotors().filter((m) => m.userId === user.id);
  document.getElementById("totalMotors").textContent = motors.length;
  document.getElementById("inProgressMotors").textContent = motors.filter(
    (m) => m.status === "in_progress"
  ).length;
  document.getElementById("completedMotors").textContent = motors.filter(
    (m) => m.status === "completed"
  ).length;
  document.getElementById("pendingMotors").textContent = motors.filter(
    (m) => m.status === "pending"
  ).length;
  renderMotorsList(motors);
}

function renderMotorsList(motors) {
  const c = document.getElementById("motorsList");
  if (!c) return;
  if (!motors.length) {
    c.innerHTML = '<p style="text-align:center;padding:40px;">Aucun moteur</p>';
    return;
  }
  c.innerHTML = motors
    .map(
      (m) =>
        `<div class="motor-item" data-id="${
          m.id
        }"><div class="motor-header"><h4>${
          m.clientName || "Sans nom"
        }</h4><span class="motor-status status-${m.status}">${getStatusLabel(
          m.status
        )}</span></div><div class="motor-details"><p><strong>Puissance:</strong> ${
          m.power || "-"
        } kW</p><p><strong>Type:</strong> ${
          m.motorType === "three_phase" ? "Triphasé" : "Monophasé"
        }</p><p><strong>Progression:</strong> ${
          m.steps?.filter((s) => s.validated).length || 0
        }/${m.steps?.length || 0}</p></div></div>`
    )
    .join("");
  document
    .querySelectorAll(".motor-item")
    .forEach((el) =>
      el.addEventListener("click", () => viewMotorDetail(el.dataset.id))
    );
}

window.viewMotorDetail = function(motorId) {
  const motor = getMotorById(motorId); 
  if(!motor) return showNotification('Moteur non trouvé','error');
  
  showUserView('motorDetail');
  document.getElementById('motorDetailTitle').textContent = `SUIVI - ${motor.clientName||'Sans nom'}`;
  const content = document.getElementById('motorDetailContent'); 
  if(!content) return;
  
  let html = `
    <div class="motor-info-card">
      <p><strong>Client:</strong> ${motor.clientName||'-'} | <strong>Tél:</strong> ${motor.clientPhone||'-'}</p>
      <p><strong>Entreprise client:</strong> ${motor.clientCompany||'-'} | <strong>Adresse:</strong> ${motor.clientAddress||'-'}</p>
      <p><strong>Technicien responsable:</strong> ${motor.technicianName||'-'} (${motor.technicianEmail||'-'})</p>
      <p><strong>Type:</strong> ${motor.motorType==='three_phase'?'Triphasé':'Monophasé'} | <strong>Puissance:</strong> ${motor.power||'-'} kW</p>
      <p><strong>Statut:</strong> <span class="motor-status status-${motor.status}">${getStatusLabel(motor.status)}</span></p>
      <p><strong>Panne décrite:</strong> ${motor.faultDescription||'-'}</p>
      <p><strong>Date création:</strong> ${formatDate(motor.createdAt)}</p>
    </div>
    <div class="steps-container">
  `;
    
    motor.steps.forEach((step, stepIndex) => {
      const stepValidated = step.validated;
      const stepCompleted = step.completed;
      
      // Initialiser substepsCompleted si nécessaire (pour les anciens moteurs)
      if (!step.substepsCompleted) {
        step.substepsCompleted = new Array(step.substeps.length).fill(stepCompleted || false);
      }
      
      html += `
        <div class="step-card ${stepValidated ? 'validated' : stepCompleted ? 'completed' : ''}">
          <div class="step-header">
            <h4>${step.name}</h4>
            <div class="step-status">
              ${stepValidated ? '<span class="badge success"><i class="fas fa-check-circle"></i> Validé</span>' : 
                stepCompleted ? '<span class="badge warning"><i class="fas fa-clock"></i> En attente validation</span>' : 
                '<span class="badge">À faire</span>'}
            </div>
          </div>
          <div class="step-substeps">
      `;
      
      // Générer les sous-étapes avec leurs états individuels
      step.substeps.forEach((substep, subIndex) => {
        const checkboxId = `cb_${motor.id}_${step.id}_${subIndex}`;
        const isChecked = step.substepsCompleted[subIndex] ? 'checked' : '';
        const isDisabled = stepValidated ? 'disabled' : '';
        
        html += `
          <label class="checkbox-label ${stepValidated ? 'disabled' : ''}" for="${checkboxId}">
            <input type="checkbox" 
                   id="${checkboxId}" 
                   ${isChecked} 
                   ${isDisabled}
                   data-motor-id="${motor.id}"
                   data-step-id="${step.id}"
                   data-substep-index="${subIndex}">
            <span>${substep}</span>
          </label>
        `;
      });
      
      html += `</div>`;
      
      if (step.completedAt) {
        html += `<small><i class="far fa-calendar"></i> Toutes les sous-étapes complétées le ${formatDate(step.completedAt)}</small>`;
      }
      if (step.validatedAt) {
        html += `<small><i class="fas fa-check-circle" style="color:var(--success);"></i> Validé le ${formatDate(step.validatedAt)}</small>`;
      }
      
      html += `</div>`;
    });
    
    html += `</div>`;
    content.innerHTML = html;
    
    // Ajouter les événements aux checkboxes
    content.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => {
      cb.addEventListener('change', function(e) {
        e.stopPropagation();
        const motorId = this.dataset.motorId;
        const stepId = this.dataset.stepId;
        const substepIndex = parseInt(this.dataset.substepIndex);
        const isChecked = this.checked;
        
        // Mettre à jour la sous-étape spécifique
        updateMotorSubstep(motorId, stepId, substepIndex, isChecked);
        showNotification(isChecked ? 'Sous-étape complétée' : 'Sous-étape décochée', 'info');
        
        // Recharger le moteur pour voir si l'étape est complète
        const updatedMotor = getMotorById(motorId);
        const step = updatedMotor.steps.find(s => s.id === stepId);
        
        // Si l'étape vient d'être complétée (toutes les sous-étapes cochées)
        if (step && step.completed && !step.validated) {
          setTimeout(() => {
            showPopup({
              title: 'Demande validation',
              message: `L'étape "${step.name}" est complète. Demander validation admin ?`,
              icon: 'check-circle',
              confirmText: 'Demander',
              cancelText: 'Plus tard',
              onConfirm: () => {
                showNotification('Demande envoyée', 'success');
                viewMotorDetail(motorId);
              },
              onCancel: () => {
                viewMotorDetail(motorId);
              }
            });
          }, 100);
        } else {
          viewMotorDetail(motorId);
        }
      });
    });
  };


function loadMotorTemplates() {
  const s = document.getElementById("motorTemplate");
  if (!s) return;
  s.innerHTML =
    '<option value="">-- Personnalisé --</option>' +
    getMotorTypes()
      .map((t) => `<option value="${t.id}">${t.name}</option>`)
      .join("");
}

function applyMotorTemplate() {
  const id = document.getElementById("motorTemplate")?.value;
  if (!id) return;
  const t = getMotorTypes().find((x) => x.id === id);
  if (!t) return;
  document.getElementById("motorType").value = t.motorType || "";
  document.getElementById("power").value = t.power || "";
  document.getElementById("voltage").value = t.voltage || "";
  document.getElementById("current").value = t.current || "";
  document.getElementById("frequency").value = t.frequency || "";
  document.getElementById("rpm").value = t.rpm || "";
  document.getElementById("powerFactor").value = t.powerFactor || "";
  document.getElementById("insulationClass").value = t.insulationClass || "";
  document.getElementById("couplingType").value = t.couplingType || "";
  document.getElementById("poles").value = t.poles || "";
  showNotification("Template appliqué", "success");
}

function saveMotorData() {
  const user = getCurrentUser();
  if (!user) return;
  
  const templateId = document.getElementById("motorTemplate")?.value;
  const motor = {
    userId: user.id,
    templateId: templateId || null,
    
    // Informations du technicien
    technicianName: user.name,
    technicianEmail: user.email,
    technicianCompany: user.company || '',
    
    // Informations client
    clientName: document.getElementById("clientName")?.value,
    clientPhone: document.getElementById("clientPhone")?.value,
    clientCompany: document.getElementById("clientCompany")?.value,
    clientAddress: document.getElementById("clientAddress")?.value,
    faultDescription: document.getElementById("faultDescription")?.value,
    
    // Caractéristiques moteur
    motorType: document.getElementById("motorType")?.value,
    power: document.getElementById("power")?.value,
    voltage: document.getElementById("voltage")?.value,
    current: document.getElementById("current")?.value,
    frequency: document.getElementById("frequency")?.value,
    rpm: document.getElementById("rpm")?.value,
    powerFactor: document.getElementById("powerFactor")?.value,
    insulationClass: document.getElementById("insulationClass")?.value,
    couplingType: document.getElementById("couplingType")?.value,
    poles: document.getElementById("poles")?.value,
  };
  
  if (!motor.clientName || !motor.motorType)
    return showNotification("Client et type requis", "error");
    
  saveMotor(motor);
  showNotification("Moteur enregistré", "success");
  setActiveNav("navDashboard");
  showUserView("dashboard");
}

function loadUserProfile() {
  const u = getCurrentUser();
  if (!u) return;
  document.getElementById("profileName").value = u.name || "";
  document.getElementById("profileCompany").value = u.company || "";
  document.getElementById("profileEmail").value = u.email || "";
}

function saveUserProfile() {
  const u = getCurrentUser();
  if (!u) return;
  const cp = document.getElementById("currentPassword").value,
    np = document.getElementById("newPassword").value,
    conf = document.getElementById("confirmNewPassword").value;
  if (np) {
    if (cp !== u.password)
      return showNotification("Mot de passe actuel incorrect", "error");
    if (np !== conf)
      return showNotification("Mots de passe différents", "error");
  }
  const updates = {
    name: document.getElementById("profileName").value,
    company: document.getElementById("profileCompany").value,
    email: document.getElementById("profileEmail").value,
  };
  if (np) updates.password = np;
  const upd = updateUser(u.id, updates);
  if (upd) {
    setCurrentUser(upd);
    showNotification("Profil mis à jour", "success");
    setActiveNav("navDashboard");
    showUserView("dashboard");
  }
}

// === INIT ADMIN ===
function initAdminPage() {
  const currentUser = getCurrentUser();
  const nav = document.querySelector(".cyber-nav"),
    loginView = document.getElementById("adminLoginView");
  if (currentUser?.role === "admin") {
    nav?.classList.remove("hidden");
    loginView?.classList.remove("active");
    showAdminView("dashboard");
  } else {
    nav?.classList.add("hidden");
    loginView?.classList.add("active");
  }

  document
    .getElementById("navToggle")
    ?.addEventListener("click", () =>
      document.getElementById("navMenu")?.classList.toggle("active")
    );
  document.getElementById("adminLoginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = authenticateAdmin(
      document.getElementById("adminUsername").value,
      document.getElementById("adminPassword").value
    );
    r.success
      ? (showNotification("Accès autorisé", "success"),
        window.location.reload())
      : showNotification(r.message, "error");
  });
  document.getElementById("adminLogoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
    window.location.reload();
  });

  document
    .getElementById("navAdminDashboard")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      setActiveNav("navAdminDashboard");
      showAdminView("dashboard");
    });
  document.getElementById("navAdminUsers")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navAdminUsers");
    showAdminView("users");
  });
  document.getElementById("navAdminMotors")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navAdminMotors");
    showAdminView("motors");
  });
  document
    .getElementById("navAdminMotorTypes")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      setActiveNav("navAdminMotorTypes");
      showAdminView("motorTypes");
    });
  document.getElementById("navAdminProfile")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navAdminProfile");
    showAdminView("profile");
  });

  document
    .getElementById("refreshDashboardBtn")
    ?.addEventListener("click", loadAdminStats);
  document
    .getElementById("refreshUsersList")
    ?.addEventListener("click", loadUsersList);
  document
    .getElementById("motorFilterStatus")
    ?.addEventListener("change", loadAllMotors);
  document
    .getElementById("addMotorTypeBtn")
    ?.addEventListener("click", showAddMotorTypeForm);
  document
    .getElementById("adminProfileForm")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      saveAdminProfile();
    });
  document
    .getElementById("cancelAdminProfileBtn")
    ?.addEventListener("click", () => {
      setActiveNav("navAdminDashboard");
      showAdminView("dashboard");
    });
  document
    .getElementById("backFromAdminDetailBtn")
    ?.addEventListener("click", () => {
      setActiveNav("navAdminMotors");
      showAdminView("motors");
    });
}

function showAdminView(view) {
  [
    "adminDashboardView",
    "adminProfileView",
    "adminMotorDetailView",
    "usersManagementView",
    "motorsManagementView",
    "motorTypesManagementView",
  ].forEach((v) => document.getElementById(v)?.classList.remove("active"));
  if (view === "dashboard") {
    document.getElementById("adminDashboardView")?.classList.add("active");
    loadAdminStats();
  } else if (view === "users") {
    document.getElementById("usersManagementView")?.classList.add("active");
    loadUsersList();
  } else if (view === "motors") {
    document.getElementById("motorsManagementView")?.classList.add("active");
    loadAllMotors();
  } else if (view === "motorTypes") {
    document
      .getElementById("motorTypesManagementView")
      ?.classList.add("active");
    loadMotorTypesList();
  } else if (view === "profile") {
    document.getElementById("adminProfileView")?.classList.add("active");
    loadAdminProfile();
  } else if (view === "motorDetail") {
    document.getElementById("adminMotorDetailView")?.classList.add("active");
  }
}

function loadAdminStats() {
  const users = getUsers().filter((u) => u.role === "user"),
    motors = getMotors();
  document.getElementById("totalUsers").textContent = users.length;
  document.getElementById("adminTotalMotors").textContent = motors.length;
  document.getElementById("adminPendingValidations").textContent =
    motors.filter((m) =>
      m.steps?.some((s) => s.completed && !s.validated)
    ).length;
  document.getElementById("adminCompleted").textContent = motors.filter(
    (m) => m.status === "completed"
  ).length;

  const p = document.getElementById("pendingValidationsList");
  if (p) {
    const pm = motors
      .filter((m) => m.steps?.some((s) => s.completed && !s.validated))
      .slice(0, 5);
    p.innerHTML = pm.length
      ? pm
          .map(
            (m) =>
              `<div class="list-item"><div><strong>${
                m.clientName || "Inconnu"
              }</strong><br><small>${
                m.power || "-"
              } kW</small></div><button class="action-btn" data-id="${
                m.id
              }"><i class="fas fa-eye"></i></button></div>`
          )
          .join("")
      : '<p style="padding:20px;">Aucune validation</p>';
    p.querySelectorAll(".action-btn").forEach((b) =>
      b.addEventListener("click", () => viewAdminMotorDetail(b.dataset.id))
    );
  }

  const a = document.getElementById("recentActivity");
  if (a) {
    const acts = getActivities(5);
    a.innerHTML = acts.length
      ? acts
          .map(
            (ac) =>
              `<div class="list-item"><span>${
                ac.description
              }</span><small>${new Date(
                ac.timestamp
              ).toLocaleTimeString()}</small></div>`
          )
          .join("")
      : "<p>Aucune activité</p>";
  }
}

function loadUsersList() {
  const users = getUsers().filter((u) => u.role === "user"),
    c = document.getElementById("usersList");
  if (!c) return;
  c.innerHTML = `<table class="data-table"><thead><tr><th>Nom</th><th>Email</th><th>Entreprise</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${users
    .map(
      (u) =>
        `<tr><td>${u.name}</td><td>${u.email}</td><td>${
          u.company || "-"
        }</td><td><span class="motor-status ${
          u.approved ? "status-completed" : "status-pending"
        }">${u.approved ? "Approuvé" : "En attente"}</span></td><td>${
          !u.approved
            ? `<button class="action-btn approve" data-id="${u.id}"><i class="fas fa-check"></i></button>`
            : ""
        }<button class="action-btn delete" data-id="${
          u.id
        }"><i class="fas fa-trash"></i></button></td></tr>`
    )
    .join("")}</tbody></table>`;
  c.querySelectorAll(".approve").forEach((b) =>
    b.addEventListener("click", () => {
      updateUser(b.dataset.id, { approved: true });
      showNotification("Approuvé", "success");
      loadUsersList();
      loadAdminStats();
    })
  );
  c.querySelectorAll(".delete").forEach((b) =>
    b.addEventListener("click", () => deleteUserConfirm(b.dataset.id))
  );
}
window.deleteUserConfirm = function (id) {
  showPopup({
    title: "Supprimer",
    message: "Supprimer cet utilisateur ?",
    icon: "trash",
    confirmText: "Supprimer",
    onConfirm: () => {
      localStorage.setItem(
        "fortico_users",
        JSON.stringify(getUsers().filter((u) => u.id !== id))
      );
      showNotification("Supprimé", "success");
      loadUsersList();
      loadAdminStats();
    },
  });
};

function loadAllMotors() {
  const filter = document.getElementById("motorFilterStatus")?.value || "all";
  let motors = getMotors();
  if (filter !== "all") motors = motors.filter((m) => m.status === filter);
  const c = document.getElementById("allMotorsList");
  if (!c) return;
  c.innerHTML = `<table class="data-table"><thead><tr><th>Client</th><th>Type</th><th>Puissance</th><th>Statut</th><th>Progression</th><th>Actions</th></tr></thead><tbody>${motors
    .map(
      (m) =>
        `<tr><td>${m.clientName || "-"}</td><td>${
          m.motorType === "three_phase" ? "Tri" : "Mono"
        }</td><td>${
          m.power || "-"
        } kW</td><td><span class="motor-status status-${
          m.status
        }">${getStatusLabel(m.status)}</span></td><td>${
          m.steps?.filter((s) => s.validated).length || 0
        }/${
          m.steps?.length || 0
        }</td><td><button class="action-btn view" data-id="${
          m.id
        }"><i class="fas fa-eye"></i></button></td></tr>`
    )
    .join("")}</tbody></table>`;
  c.querySelectorAll(".view").forEach((b) =>
    b.addEventListener("click", () => viewAdminMotorDetail(b.dataset.id))
  );
}

window.viewAdminMotorDetail = function(motorId) {
  const motor = getMotorById(motorId); 
  if(!motor) return showNotification('Moteur non trouvé','error');
  
  showAdminView('motorDetail');
  document.getElementById('adminMotorDetailTitle').textContent = `DÉTAIL - ${motor.clientName||'Sans nom'}`;
  const content = document.getElementById('adminMotorDetailContent'); 
  if(!content) return;
  
  let html = `
    <div class="motor-info-card">
      <p><strong>Client:</strong> ${motor.clientName||'-'} | <strong>Tél:</strong> ${motor.clientPhone||'-'}</p>
      <p><strong>Entreprise client:</strong> ${motor.clientCompany||'-'} | <strong>Adresse:</strong> ${motor.clientAddress||'-'}</p>
      <p><strong>Technicien responsable:</strong> ${motor.technicianName||'-'} (${motor.technicianEmail||'-'})${motor.technicianCompany ? ' - ' + motor.technicianCompany : ''}</p>
      <p><strong>Type:</strong> ${motor.motorType==='three_phase'?'Triphasé':'Monophasé'} | <strong>Puissance:</strong> ${motor.power||'-'} kW</p>
      <p><strong>Statut:</strong> <span class="motor-status status-${motor.status}">${getStatusLabel(motor.status)}</span></p>
      <p><strong>Panne décrite:</strong> ${motor.faultDescription||'-'}</p>
      <p><strong>Date création:</strong> ${formatDate(motor.createdAt)} | <strong>Dernière mise à jour:</strong> ${formatDate(motor.updatedAt)}</p>
    </div>
    <div class="steps-container">
  `;   
    motor.steps.forEach((step, stepIndex) => {
      const stepValidated = step.validated;
      const stepCompleted = step.completed;
      
      // Initialiser substepsCompleted si nécessaire
      if (!step.substepsCompleted) {
        step.substepsCompleted = new Array(step.substeps.length).fill(stepCompleted || false);
      }
      
      html += `
        <div class="step-card ${stepValidated ? 'validated' : stepCompleted ? 'completed' : ''}">
          <div class="step-header">
            <h4>${step.name}</h4>
            <div class="step-status">
              ${stepValidated ? '<span class="badge success"><i class="fas fa-check-circle"></i> Validé</span>' : 
                stepCompleted ? '<span class="badge warning"><i class="fas fa-clock"></i> En attente validation</span>' : 
                '<span class="badge">Non commencé</span>'}
            </div>
          </div>
          <div class="step-substeps">
      `;
      
      step.substeps.forEach((substep, subIndex) => {
        const checkboxId = `admin_cb_${motor.id}_${step.id}_${subIndex}`;
        const isChecked = step.substepsCompleted[subIndex] ? 'checked' : '';
        
        html += `
          <label class="checkbox-label disabled" for="${checkboxId}">
            <input type="checkbox" id="${checkboxId}" ${isChecked} disabled>
            <span>${substep}</span>
          </label>
        `;
      });
      
      html += `</div>`;
      
      if (stepCompleted && !stepValidated) {
        html += `<button class="cyber-button small validate-step" data-motor-id="${motor.id}" data-step-id="${step.id}"><i class="fas fa-check"></i> Valider cette étape</button>`;
      }
      
      if (step.completedAt) {
        html += `<small><i class="far fa-calendar"></i> Complété le ${formatDate(step.completedAt)}</small>`;
      }
      if (step.validatedAt) {
        html += `<small><i class="fas fa-check-circle" style="color:var(--success);"></i> Validé le ${formatDate(step.validatedAt)}</small>`;
      }
      
      html += `</div>`;
    });
    
    html += `</div>`;
    content.innerHTML = html;
    
    content.querySelectorAll('.validate-step').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const motorId = this.dataset.motorId;
        const stepId = this.dataset.stepId;
        validateStep(motorId, stepId);
      });
    });
  };

window.validateStep = function (motorId, stepId) {
  const admin = getCurrentUser();
  showPopup({
    title: "Valider étape",
    message: "Confirmer la validation ?",
    icon: "check-circle",
    onConfirm: () => {
      validateMotorStep(motorId, stepId, admin.id);
      showNotification("Étape validée", "success");
      viewAdminMotorDetail(motorId);
      loadAdminStats();
    },
  });
};

// === GESTION DES TYPES DE MOTEURS (VOIR, ÉDITER, ÉTAPES) ===
function loadMotorTypesList() {
  const types = getMotorTypes(),
    c = document.getElementById("motorTypesList");
  if (!c) return;
  if (!types.length) {
    c.innerHTML = '<p style="padding:40px;text-align:center;">Aucun type</p>';
    return;
  }
  c.innerHTML = `<table class="data-table"><thead><tr><th>Nom</th><th>Type</th><th>Puissance</th><th>Tension</th><th>Étapes</th><th>Actions</th></tr></thead><tbody>${types
    .map(
      (t) =>
        `<tr><td>${t.name}</td><td>${
          t.motorType === "three_phase" ? "Triphasé" : "Monophasé"
        }</td><td>${t.power || "-"} kW</td><td>${t.voltage || "-"} V</td><td>${
          t.customSteps?.length || 0
        } étapes</td><td><button class="action-btn view-type" data-id="${
          t.id
        }" title="Voir détails"><i class="fas fa-eye"></i></button><button class="action-btn edit-type" data-id="${
          t.id
        }" title="Modifier"><i class="fas fa-edit"></i></button><button class="action-btn steps-type" data-id="${
          t.id
        }" title="Gérer les étapes"><i class="fas fa-list-check"></i></button><button class="action-btn delete-type" data-id="${
          t.id
        }" title="Supprimer"><i class="fas fa-trash"></i></button></td></tr>`
    )
    .join("")}</tbody></table>`;

  c.querySelectorAll(".view-type").forEach((b) =>
    b.addEventListener("click", () => viewMotorTypeDetails(b.dataset.id))
  );
  c.querySelectorAll(".edit-type").forEach((b) =>
    b.addEventListener("click", () => editMotorType(b.dataset.id))
  );
  c.querySelectorAll(".steps-type").forEach((b) =>
    b.addEventListener("click", () => manageTypeSteps(b.dataset.id))
  );
  c.querySelectorAll(".delete-type").forEach((b) =>
    b.addEventListener("click", () => deleteMotorTypeConfirm(b.dataset.id))
  );
}

window.viewMotorTypeDetails = function (typeId) {
  const type = getMotorTypeById(typeId);
  if (!type) return;
  let html = `<div style="max-height:500px;overflow-y:auto;"><h4 style="color:var(--primary);margin-bottom:15px;">${type.name}</h4>`;
  html += `<p><strong>Type:</strong> ${
    type.motorType === "three_phase" ? "Triphasé" : "Monophasé"
  } | <strong>Puissance:</strong> ${
    type.power || "-"
  } kW | <strong>Tension:</strong> ${type.voltage || "-"} V</p>`;
  html += `<p><strong>Courant:</strong> ${
    type.current || "-"
  } A | <strong>Fréquence:</strong> ${
    type.frequency || "-"
  } Hz | <strong>Vitesse:</strong> ${type.rpm || "-"} RPM</p>`;
  html += `<p><strong>Cos φ:</strong> ${
    type.powerFactor || "-"
  } | <strong>Classe:</strong> ${
    type.insulationClass || "-"
  } | <strong>Couplage:</strong> ${
    type.couplingType || "-"
  } | <strong>Pôles:</strong> ${type.poles || "-"}</p>`;
  html += `<h5 style="margin:20px 0 10px;color:var(--primary);">Étapes (${
    type.customSteps?.length || 0
  })</h5>`;
  if (type.customSteps?.length) {
    type.customSteps.forEach((step, i) => {
      html += `<div style="background:rgba(0,0,0,0.2);padding:10px;margin-bottom:10px;border-radius:8px;"><strong>${
        i + 1
      }. ${step.name}</strong><br><small>${
        step.substeps?.join(" • ") || ""
      }</small></div>`;
    });
  } else {
    html += "<p>Aucune étape définie</p>";
  }
  html += "</div>";
  showPopup({
    title: "Détails du type",
    message: html,
    icon: "info-circle",
    confirmText: "Fermer",
    cancelText: null,
  });
};

window.editMotorType = function (typeId) {
  const type = getMotorTypeById(typeId);
  if (!type) return;
  const formHtml = `
      <div style="max-height:400px;overflow-y:auto;">
        <div class="form-field"><label>Nom *</label><input id="editName" value="${
          type.name || ""
        }"></div>
        <div class="form-field"><label>Type *</label><select id="editMotorType"><option value="three_phase" ${
          type.motorType === "three_phase" ? "selected" : ""
        }>Triphasé</option><option value="single_phase" ${
    type.motorType === "single_phase" ? "selected" : ""
  }>Monophasé</option></select></div>
        <div class="form-field"><label>Puissance (kW)</label><input id="editPower" value="${
          type.power || ""
        }" type="number" step="0.01"></div>
        <div class="form-field"><label>Tension (V)</label><input id="editVoltage" value="${
          type.voltage || ""
        }" type="number"></div>
        <div class="form-field"><label>Courant (A)</label><input id="editCurrent" value="${
          type.current || ""
        }" type="number" step="0.1"></div>
        <div class="form-field"><label>Fréquence (Hz)</label><input id="editFrequency" value="${
          type.frequency || ""
        }" type="number"></div>
        <div class="form-field"><label>Vitesse (RPM)</label><input id="editRpm" value="${
          type.rpm || ""
        }" type="number"></div>
        <div class="form-field"><label>Cos φ</label><input id="editPowerFactor" value="${
          type.powerFactor || ""
        }" type="number" step="0.01"></div>
        <div class="form-field"><label>Classe isolation</label><select id="editInsulation">${[
          "",
          "A",
          "B",
          "F",
          "H",
        ]
          .map(
            (v) =>
              `<option ${type.insulationClass === v ? "selected" : ""}>${
                v || "--"
              }</option>`
          )
          .join("")}</select></div>
        <div class="form-field"><label>Couplage</label><select id="editCoupling">${[
          "",
          "star",
          "delta",
        ]
          .map(
            (v) =>
              `<option value="${v}" ${
                type.couplingType === v ? "selected" : ""
              }>${
                v === "star" ? "Étoile" : v === "delta" ? "Triangle" : "--"
              }</option>`
          )
          .join("")}</select></div>
        <div class="form-field"><label>Pôles</label><input id="editPoles" value="${
          type.poles || ""
        }" type="number"></div>
      </div>`;
  showPopup({
    title: "Modifier le type",
    message: formHtml,
    icon: "edit",
    confirmText: "Enregistrer",
    onConfirm: () => {
      const name = document.getElementById("editName")?.value;
      if (!name) return showNotification("Nom requis", "error");
      updateMotorType(typeId, {
        name,
        motorType: document.getElementById("editMotorType")?.value,
        power: document.getElementById("editPower")?.value,
        voltage: document.getElementById("editVoltage")?.value,
        current: document.getElementById("editCurrent")?.value,
        frequency: document.getElementById("editFrequency")?.value,
        rpm: document.getElementById("editRpm")?.value,
        powerFactor: document.getElementById("editPowerFactor")?.value,
        insulationClass: document.getElementById("editInsulation")?.value,
        couplingType: document.getElementById("editCoupling")?.value,
        poles: document.getElementById("editPoles")?.value,
      });
      showNotification("Type modifié", "success");
      loadMotorTypesList();
      loadMotorTemplates();
    },
  });
};

window.manageTypeSteps = function (typeId) {
  const type = getMotorTypeById(typeId);
  if (!type) return;
  let stepsHtml = `<div style="max-height:400px;overflow-y:auto;"><h4>${type.name}</h4>`;
  if (type.customSteps?.length) {
    type.customSteps.forEach((step, i) => {
      stepsHtml += `<div style="background:rgba(0,0,0,0.2);padding:12px;margin-bottom:10px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;"><div><strong>${
        step.name
      }</strong><br><small>${
        step.substeps?.length || 0
      } sous-étapes</small></div><div><button class="action-btn edit-step" data-type="${typeId}" data-step="${
        step.id
      }" style="margin-right:5px;"><i class="fas fa-edit"></i></button><button class="action-btn delete-step" data-type="${typeId}" data-step="${
        step.id
      }"><i class="fas fa-trash"></i></button></div></div>`;
    });
  } else {
    stepsHtml += "<p>Aucune étape</p>";
  }
  stepsHtml += `<button class="cyber-button small" id="addNewStepBtn" style="margin-top:15px;"><i class="fas fa-plus"></i> Nouvelle étape</button></div>`;

  showPopup({
    title: "Gérer les étapes",
    message: stepsHtml,
    icon: "list",
    confirmText: "Fermer",
    cancelText: null,
  });

  setTimeout(() => {
    document
      .getElementById("addNewStepBtn")
      ?.addEventListener("click", () => showAddStepForm(typeId));
    document
      .querySelectorAll(".edit-step")
      .forEach((b) =>
        b.addEventListener("click", () =>
          showEditStepForm(b.dataset.type, b.dataset.step)
        )
      );
    document.querySelectorAll(".delete-step").forEach((b) =>
      b.addEventListener("click", () => {
        showPopup({
          title: "Supprimer",
          message: "Supprimer cette étape ?",
          icon: "trash",
          confirmText: "Supprimer",
          onConfirm: () => {
            deleteStepFromMotorType(b.dataset.type, b.dataset.step);
            showNotification("Étape supprimée", "success");
            manageTypeSteps(typeId);
            loadMotorTypesList();
          },
        });
      })
    );
  }, 100);
};

function showAddStepForm(typeId) {
  showPopup({
    title: "Nouvelle étape",
    message: `<div class="form-field"><label>Nom de l'étape</label><input id="stepName" placeholder="Ex: DIAGNOSTIC"></div><div class="form-field"><label>Sous-étapes (une par ligne)</label><textarea id="stepSubsteps" rows="5" placeholder="Identifier type&#10;Vérifier panne&#10;Court-circuit"></textarea></div>`,
    icon: "plus",
    confirmText: "Ajouter",
    onConfirm: () => {
      const name = document.getElementById("stepName")?.value;
      if (!name) return showNotification("Nom requis", "error");
      const substeps = document
        .getElementById("stepSubsteps")
        ?.value.split("\n")
        .filter((s) => s.trim());
      addStepToMotorType(typeId, { name, substeps });
      showNotification("Étape ajoutée", "success");
      manageTypeSteps(typeId);
      loadMotorTypesList();
    },
  });
}

function showEditStepForm(typeId, stepId) {
  const type = getMotorTypeById(typeId);
  const step = type?.customSteps?.find((s) => s.id === stepId);
  if (!step) return;
  showPopup({
    title: "Modifier étape",
    message: `<div class="form-field"><label>Nom</label><input id="editStepName" value="${
      step.name
    }"></div><div class="form-field"><label>Sous-étapes</label><textarea id="editStepSubsteps" rows="5">${
      step.substeps?.join("\n") || ""
    }</textarea></div>`,
    icon: "edit",
    confirmText: "Enregistrer",
    onConfirm: () => {
      const name = document.getElementById("editStepName")?.value;
      if (!name) return showNotification("Nom requis", "error");
      const substeps = document
        .getElementById("editStepSubsteps")
        ?.value.split("\n")
        .filter((s) => s.trim());
      updateStepInMotorType(typeId, stepId, { name, substeps });
      showNotification("Étape modifiée", "success");
      manageTypeSteps(typeId);
      loadMotorTypesList();
    },
  });
}

function showAddMotorTypeForm() {
  const formHtml = `
      <div style="max-height:400px;overflow-y:auto;">
        <div class="form-field"><label>Nom *</label><input id="popName"></div>
        <div class="form-field"><label>Type *</label><select id="popType"><option value="three_phase">Triphasé</option><option value="single_phase">Monophasé</option></select></div>
        <div class="form-field"><label>Puissance (kW)</label><input id="popPower" type="number" step="0.01"></div>
        <div class="form-field"><label>Tension (V)</label><input id="popVoltage" type="number"></div>
        <div class="form-field"><label>Courant (A)</label><input id="popCurrent" type="number" step="0.1"></div>
        <div class="form-field"><label>Fréquence (Hz)</label><input id="popFreq" type="number"></div>
        <div class="form-field"><label>Vitesse (RPM)</label><input id="popRpm" type="number"></div>
        <div class="form-field"><label>Cos φ</label><input id="popPf" type="number" step="0.01"></div>
        <div class="form-field"><label>Classe isolation</label><select id="popIns"><option value="">--</option><option>A</option><option>B</option><option>F</option><option>H</option></select></div>
        <div class="form-field"><label>Couplage</label><select id="popCoup"><option value="">--</option><option value="star">Étoile</option><option value="delta">Triangle</option></select></div>
        <div class="form-field"><label>Pôles</label><input id="popPoles" type="number"></div>
      </div>`;
  showPopup({
    title: "Nouveau type",
    message: formHtml,
    icon: "plus-circle",
    confirmText: "Créer",
    onConfirm: () => {
      const name = document.getElementById("popName")?.value;
      if (!name) return showNotification("Nom requis", "error");
      const motorType = document.getElementById("popType")?.value;
      saveMotorType({
        name,
        motorType,
        power: document.getElementById("popPower")?.value,
        voltage: document.getElementById("popVoltage")?.value,
        current: document.getElementById("popCurrent")?.value,
        frequency: document.getElementById("popFreq")?.value,
        rpm: document.getElementById("popRpm")?.value,
        powerFactor: document.getElementById("popPf")?.value,
        insulationClass: document.getElementById("popIns")?.value,
        couplingType: document.getElementById("popCoup")?.value,
        poles: document.getElementById("popPoles")?.value,
      });
      showNotification("Type créé", "success");
      loadMotorTypesList();
      loadMotorTemplates();
    },
  });
}

window.deleteMotorTypeConfirm = function (id) {
  showPopup({
    title: "Supprimer",
    message: "Supprimer ce type ?",
    icon: "trash",
    confirmText: "Supprimer",
    onConfirm: () => {
      deleteMotorType(id);
      showNotification("Supprimé", "success");
      loadMotorTypesList();
      loadMotorTemplates();
    },
  });
};

function loadAdminProfile() {
  const a = getCurrentUser();
  if (a) {
    document.getElementById("adminProfileName").value = a.name || "";
    document.getElementById("adminProfileEmail").value = a.email || "";
  }
}

function saveAdminProfile() {
  const a = getCurrentUser();
  if (!a) return;
  const cp = document.getElementById("adminCurrentPassword").value,
    np = document.getElementById("adminNewPassword").value,
    conf = document.getElementById("adminConfirmNewPassword").value;
  if (np) {
    if (cp !== a.password)
      return showNotification("Mot de passe actuel incorrect", "error");
    if (np !== conf)
      return showNotification("Mots de passe différents", "error");
  }
  const updates = {
    name: document.getElementById("adminProfileName").value,
    email: document.getElementById("adminProfileEmail").value,
  };
  if (np) updates.password = np;
  const upd = updateUser(a.id, updates);
  if (upd) {
    setCurrentUser(upd);
    showNotification("Profil mis à jour", "success");
    setActiveNav("navAdminDashboard");
    showAdminView("dashboard");
  }
}

window.addEventListener("load", () =>
  setTimeout(
    () => document.querySelector(".cyber-loader")?.classList.add("hidden"),
    800
  )
);
