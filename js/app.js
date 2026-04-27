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
  
  // Récupérer les rapports existants pour ce moteur
  const reports = getReportsByMotor(motorId);
  
  let html = `
    <div class="motor-info-card">
      <p><strong>Client:</strong> ${motor.clientName||'-'} | <strong>Tél:</strong> ${motor.clientPhone||'-'}</p>
      <p><strong>Technicien:</strong> ${motor.technicianName||'-'} (${motor.technicianEmail||'-'})</p>
      <p><strong>Type:</strong> ${motor.motorType==='three_phase'?'Triphasé':'Monophasé'} | <strong>Puissance:</strong> ${motor.power||'-'} kW</p>
      <p><strong>Statut:</strong> <span class="motor-status status-${motor.status}">${getStatusLabel(motor.status)}</span></p>
    </div>
    <div class="steps-container">
  `;
  
  motor.steps.forEach((step, stepIndex) => {
    const stepValidated = step.validated;
    const stepCompleted = step.completed;
    
    if (!step.substepsCompleted) {
      step.substepsCompleted = new Array(step.substeps.length).fill(stepCompleted || false);
    }
    
    // Trouver les rapports pour cette étape
    const stepReports = reports.filter(r => r.stepId === step.id);
    const reportCount = stepReports.length;
    
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
    
    step.substeps.forEach((substep, subIndex) => {
      const checkboxId = `cb_${motor.id}_${step.id}_${subIndex}`;
      const isChecked = step.substepsCompleted[subIndex] ? 'checked' : '';
      const isDisabled = stepValidated ? 'disabled' : '';
      
      html += `
        <label class="checkbox-label ${stepValidated ? 'disabled' : ''}" for="${checkboxId}">
          <input type="checkbox" id="${checkboxId}" ${isChecked} ${isDisabled}
                 data-motor-id="${motor.id}" data-step-id="${step.id}" data-substep-index="${subIndex}">
          <span>${substep}</span>
        </label>
      `;
    });
    
    html += `</div>`;
    
    // Bouton pour envoyer un rapport avec photo
    html += `
      <div class="step-actions">
        <button class="cyber-button small send-report-btn" data-motor-id="${motor.id}" data-step-id="${step.id}" data-step-name="${step.name}">
          <i class="fas fa-camera"></i> Envoyer rapport photo
        </button>
        ${reportCount > 0 ? `<span class="report-badge"><i class="fas fa-paperclip"></i> ${reportCount} rapport(s)</span>` : ''}
      </div>
    `;
    
    // Afficher les miniatures des rapports existants
    if (stepReports.length > 0) {
      html += `<div class="report-thumbnails">`;
      stepReports.forEach(report => {
        if (report.photos && report.photos.length > 0) {
          report.photos.forEach((photo, pi) => {
            html += `<img src="${photo}" class="report-thumb" onclick="viewReportDetail('${report.id}')" title="Rapport du ${formatDate(report.createdAt)}">`;
          });
        }
        if (report.description) {
          html += `<div class="report-note" onclick="viewReportDetail('${report.id}')"><i class="fas fa-sticky-note"></i> ${report.description.substring(0, 50)}...</div>`;
        }
      });
      html += `</div>`;
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
  
  // Événements checkboxes
  content.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => {
    cb.addEventListener('change', function(e) {
      e.stopPropagation();
      const motorId = this.dataset.motorId;
      const stepId = this.dataset.stepId;
      const substepIndex = parseInt(this.dataset.substepIndex);
      const isChecked = this.checked;
      
      updateMotorSubstep(motorId, stepId, substepIndex, isChecked);
      showNotification(isChecked ? 'Sous-étape complétée' : 'Sous-étape décochée', 'info');
      
      const updatedMotor = getMotorById(motorId);
      const step = updatedMotor.steps.find(s => s.id === stepId);
      
      if (step && step.completed && !step.validated) {
        setTimeout(() => {
          showPopup({
            title: 'Demande validation',
            message: `L'étape "${step.name}" est complète. Pensez à envoyer un rapport avec photos. Demander validation admin ?`,
            icon: 'check-circle',
            confirmText: 'Demander',
            cancelText: 'Plus tard',
            onConfirm: () => { showNotification('Demande envoyée', 'success'); viewMotorDetail(motorId); },
            onCancel: () => { viewMotorDetail(motorId); }
          });
        }, 100);
      } else {
        viewMotorDetail(motorId);
      }
    });
  });
  
  // Événements boutons rapport
  content.querySelectorAll('.send-report-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const motorId = this.dataset.motorId;
      const stepId = this.dataset.stepId;
      const stepName = this.dataset.stepName;
      showReportForm(motorId, stepId, stepName);
    });
  });
};
// === FONCTIONS RAPPORTS AVEC PHOTOS ===

function showReportForm(motorId, stepId, stepName) {
  const motor = getMotorById(motorId);
  
  const formHtml = `
    <div style="max-height: 500px; overflow-y: auto;">
      <div class="report-form-section">
        <h4 style="color: var(--primary); margin-bottom: 10px;">Rapport pour : ${stepName}</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
          Moteur : ${motor?.clientName || '-'} | ${motor?.power || '-'} kW
        </p>
      </div>
      
      <div class="form-field">
        <label>Description du rapport</label>
        <textarea id="reportDescription" rows="4" placeholder="Décrivez ce qui a été fait, observations, mesures..."></textarea>
      </div>
      
      <div class="form-field">
        <label>Photos (max 5)</label>
        <div class="photo-upload-area" id="photoUploadArea">
          <input type="file" id="photoInput" accept="image/*" multiple style="display: none;">
          <div class="upload-placeholder" onclick="document.getElementById('photoInput').click()">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Cliquez pour ajouter des photos</p>
            <small>JPG, PNG - Max 5 photos</small>
          </div>
        </div>
        <div class="photo-previews" id="photoPreviews"></div>
      </div>
      
      <div class="form-field">
        <label>Mesures relevées (optionnel)</label>
        <textarea id="reportMeasurements" rows="3" placeholder="Résistance : ...&#10;Isolement : ...&#10;Courant : ..."></textarea>
      </div>
    </div>
  `;
  
  showPopup({
    title: 'Envoyer un rapport',
    message: formHtml,
    icon: 'camera',
    confirmText: 'Envoyer le rapport',
    cancelText: 'Annuler',
    onConfirm: () => {
      const description = document.getElementById('reportDescription')?.value;
      const measurements = document.getElementById('reportMeasurements')?.value;
      const photoPreviews = document.querySelectorAll('#photoPreviews img');
      
      if (!description && photoPreviews.length === 0) {
        showNotification('Veuillez ajouter une description ou au moins une photo', 'warning');
        return false;
      }
      
      // Récupérer les photos en base64
      const photos = [];
      photoPreviews.forEach(img => {
        photos.push(img.src);
      });
      
      const user = getCurrentUser();
      const motor = getMotorById(motorId);
      
      const report = {
        motorId: motorId,
        stepId: stepId,
        stepName: stepName,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        motorClient: motor?.clientName || '',
        motorPower: motor?.power || '',
        motorType: motor?.motorType || '',
        description: description,
        measurements: measurements,
        photos: photos,
        status: 'unread'
      };
      
      saveReport(report);
      showNotification('Rapport envoyé avec succès !', 'success');
      viewMotorDetail(motorId);
      return true;
    }
  });
  
  // Gestionnaire d'upload de photos
  setTimeout(() => {
    const photoInput = document.getElementById('photoInput');
    const photoPreviews = document.getElementById('photoPreviews');
    let selectedPhotos = [];
    
    photoInput?.addEventListener('change', function(e) {
      const files = Array.from(e.target.files);
      
      if (selectedPhotos.length + files.length > 5) {
        showNotification('Maximum 5 photos autorisées', 'warning');
        return;
      }
      
      files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          showNotification(`La photo ${file.name} dépasse 5MB`, 'warning');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
          selectedPhotos.push(event.target.result);
          renderPhotoPreviews();
        };
        reader.readAsDataURL(file);
      });
    });
    
    function renderPhotoPreviews() {
      photoPreviews.innerHTML = selectedPhotos.map((photo, index) => `
        <div class="photo-preview-item">
          <img src="${photo}" alt="Photo ${index + 1}">
          <button type="button" class="remove-photo-btn" onclick="removePhoto(${index})">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('');
    }
    
    window.removePhoto = function(index) {
      selectedPhotos.splice(index, 1);
      renderPhotoPreviews();
    };
  }, 100);
}

window.viewReportDetail = function(reportId) {
  const report = getReportById(reportId);
  if (!report) return;
  
  const motor = getMotorById(report.motorId);
  
  let html = `
    <div style="max-height: 500px; overflow-y: auto;">
      <div class="report-detail-header">
        <h4 style="color: var(--primary);">Rapport - ${report.stepName}</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">
          Moteur : ${motor?.clientName || report.motorClient} | ${motor?.power || report.motorPower} kW<br>
          Envoyé par : ${report.userName} | ${formatDate(report.createdAt)}
        </p>
      </div>
      
      ${report.description ? `
        <div class="report-section">
          <h5>Description</h5>
          <p>${report.description}</p>
        </div>
      ` : ''}
      
      ${report.measurements ? `
        <div class="report-section">
          <h5>Mesures</h5>
          <pre style="white-space: pre-wrap; font-family: inherit;">${report.measurements}</pre>
        </div>
      ` : ''}
      
      ${report.photos && report.photos.length > 0 ? `
        <div class="report-section">
          <h5>Photos (${report.photos.length})</h5>
          <div class="report-photos-grid">
            ${report.photos.map(photo => `
              <img src="${photo}" class="report-full-photo" onclick="window.open('${photo}')">
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="report-status">
        Statut : <span class="badge ${report.status === 'approved' ? 'success' : report.status === 'unread' ? 'warning' : ''}">
          ${report.status === 'approved' ? 'Approuvé' : report.status === 'unread' ? 'Non lu' : 'Lu'}
        </span>
      </div>
    </div>
  `;
  
  showPopup({
    title: 'Détail du rapport',
    message: html,
    icon: 'file-alt',
    confirmText: 'Fermer',
    cancelText: null
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
  document.getElementById("navAdminCompleted")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navAdminCompleted");
    showAdminView("completed");
  });

  document.getElementById("navAdminReports")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveNav("navAdminReports");
    showAdminView("reports");
  });
  
  document.getElementById('reportFilterStatus')?.addEventListener('change', loadReportsList);

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
    "completedMotorsView",
    "motorTypesManagementView",
    "reportsManagementView"
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
  } else if (view === "completed") {
    document.getElementById("completedMotorsView")?.classList.add("active");
    loadCompletedMotors();
  } else if (view === "reports") {
    document.getElementById("reportsManagementView")?.classList.add("active");
    loadReportsList();
  } else if (view === "motorTypes") {
    document.getElementById("motorTypesManagementView")?.classList.add("active");
    loadMotorTypesList();
  } else if (view === "profile") {
    document.getElementById("adminProfileView")?.classList.add("active");
    loadAdminProfile();
  } else if (view === "motorDetail") {
    document.getElementById("adminMotorDetailView")?.classList.add("active");
  }
}

function loadCompletedMotors() {
  const motors = getMotors().filter(m => m.status === 'completed');
  const tbody = document.getElementById('completedMotorsList');
  
  // Calculer les stats
  document.getElementById('totalCompletedMotors').textContent = motors.length;
  
  const now = new Date();
  const thisMonth = motors.filter(m => {
    const d = new Date(m.updatedAt || m.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  document.getElementById('completedThisMonth').textContent = thisMonth.length;
  
  // Calculer la durée moyenne
  let totalDays = 0;
  motors.forEach(m => {
    if (m.createdAt && (m.updatedAt || m.completedAt)) {
      const start = new Date(m.createdAt);
      const end = new Date(m.updatedAt || m.completedAt);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      totalDays += days;
    }
  });
  const avgDays = motors.length > 0 ? Math.round(totalDays / motors.length) : 0;
  document.getElementById('avgCompletionTime').textContent = avgDays;
  
  if (!motors.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">Aucun moteur terminé</td></tr>';
    return;
  }
  
  tbody.innerHTML = motors.map(m => {
    const startDate = new Date(m.createdAt);
    const endDate = new Date(m.updatedAt || m.completedAt);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return `
      <tr>
        <td><strong>${m.clientName || '-'}</strong><br><small>${m.clientCompany || ''}</small></td>
        <td>${m.technicianName || '-'}<br><small>${m.technicianEmail || ''}</small></td>
        <td>${m.motorType === 'three_phase' ? 'Triphasé' : 'Monophasé'}</td>
        <td>${m.power || '-'} kW</td>
        <td>${startDate.toLocaleDateString('fr-FR')}</td>
        <td>${endDate.toLocaleDateString('fr-FR')}</td>
        <td><span class="badge success">${durationDays} jours</span></td>
        <td>
          <button class="action-btn view-completed" data-id="${m.id}" title="Voir détails">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn print-motor" data-id="${m.id}" title="Imprimer fiche">
            <i class="fas fa-print"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Événements
  tbody.querySelectorAll('.view-completed').forEach(btn => {
    btn.addEventListener('click', () => viewAdminMotorDetail(btn.dataset.id));
  });
  
  tbody.querySelectorAll('.print-motor').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const motor = getMotorById(btn.dataset.id);
      if (motor) {
        printMotorPDF(motor);
      }
    });
  });
}
// Fonction pour imprimer un seul moteur en PDF
function printMotorPDF(motor) {
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  
  if (!jsPDF) {
    showNotification('Module PDF non disponible', 'error');
    return;
  }
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableWidth = pageWidth - (2 * margin);
  
  let yPos = 25;
  
  // En-tête
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text('FORTICO REWIND', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('FICHE TECHNIQUE MOTEUR', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  // Ligne de séparation
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;
  
  // Informations client
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('INFORMATIONS CLIENT', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Client : ${motor.clientName || '-'}`, margin, yPos);
  yPos += 7;
  doc.text(`Téléphone : ${motor.clientPhone || '-'}`, margin, yPos);
  yPos += 7;
  doc.text(`Entreprise : ${motor.clientCompany || '-'}`, margin, yPos);
  yPos += 7;
  doc.text(`Adresse : ${motor.clientAddress || '-'}`, margin, yPos);
  yPos += 7;
  // Description panne
  doc.text(`Panne décrite :`, margin, yPos);
  yPos += 6;
  const faultLines = doc.splitTextToSize(motor.faultDescription || 'Aucune description', usableWidth - 10);
  doc.text(faultLines, margin + 5, yPos);
  yPos += (faultLines.length * 5) + 10;
  
  // Informations technicien
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('TECHNICIEN RESPONSABLE', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Nom : ${motor.technicianName || '-'}`, margin, yPos);
  yPos += 7;
  doc.text(`Email : ${motor.technicianEmail || '-'}`, margin, yPos);
  yPos += 7;
  doc.text(`Entreprise : ${motor.technicianCompany || '-'}`, margin, yPos);
  yPos += 15;
  
  // Ligne de séparation
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;
  
  // Caractéristiques moteur
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('CARACTÉRISTIQUES MOTEUR', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  
  const specs = [
    `Type : ${motor.motorType === 'three_phase' ? 'Triphasé' : 'Monophasé'}`,
    `Puissance : ${motor.power || '-'} kW`,
    `Tension : ${motor.voltage || '-'} V`,
    `Courant : ${motor.current || '-'} A`,
    `Fréquence : ${motor.frequency || '-'} Hz`,
    `Vitesse : ${motor.rpm || '-'} RPM`,
    `Cos φ : ${motor.powerFactor || '-'}`,
    `Classe isolation : ${motor.insulationClass || '-'}`,
    `Couplage : ${motor.couplingType === 'star' ? 'Étoile' : motor.couplingType === 'delta' ? 'Triangle' : '-'}`,
    `Nombre de pôles : ${motor.poles || '-'}`
  ];
  
  // Afficher en deux colonnes
  const colWidth = usableWidth / 2;
  specs.forEach((spec, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const xPos = margin + (col * colWidth);
    const lineY = yPos + (row * 7);
    
    if (lineY > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(spec, xPos, yPos + (row * 7));
  });
  
  yPos += Math.ceil(specs.length / 2) * 7 + 15;
  
  // Dates
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const startDate = motor.createdAt ? new Date(motor.createdAt).toLocaleDateString('fr-FR') : '-';
  const endDate = (motor.updatedAt || motor.completedAt) ? new Date(motor.updatedAt || motor.completedAt).toLocaleDateString('fr-FR') : '-';
  let durationDays = '-';
  if (motor.createdAt && (motor.updatedAt || motor.completedAt)) {
    durationDays = Math.ceil((new Date(motor.updatedAt || motor.completedAt) - new Date(motor.createdAt)) / (1000 * 60 * 60 * 24));
  }
  
  doc.text(`Date de création : ${startDate}`, margin, yPos);
  doc.text(`Date de fin : ${endDate}`, margin + 100, yPos);
  yPos += 8;
  doc.text(`Durée totale : ${durationDays} ${typeof durationDays === 'number' ? 'jours' : ''}`, margin, yPos);
  
  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} / ${pageCount} - Fortico Rewind - Document confidentiel`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  doc.save(`fiche_moteur_${motor.clientName || motor.id}.pdf`);
  showNotification(`Fiche PDF générée pour ${motor.clientName}`, 'success');
}

// Exporter en PDF (format liste)
// Exporter en PDF (format liste)
document.getElementById('exportCompletedBtn')?.addEventListener('click', async () => {
  const motors = getMotors().filter(m => m.status === 'completed');
  if (motors.length === 0) {
    showNotification('Aucun moteur terminé à exporter', 'warning');
    return;
  }
  
  // Vérifier si jsPDF est chargé
  if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
    showNotification('Chargement du module PDF en cours...', 'info');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
  }
  
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  
  if (!jsPDF) {
    showNotification('Erreur de chargement du module PDF', 'error');
    return;
  }
  
  // Format A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  
  let yPos = 25;
  
  // En-tête
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text('FORTICO REWIND', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Rapport des moteurs terminés', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Statistiques (sans encadré)
  const now = new Date();
  const thisMonth = motors.filter(m => {
    const d = new Date(m.updatedAt || m.completedAt || m.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  
  let totalDays = 0;
  let motorsWithDuration = 0;
  motors.forEach(m => {
    if (m.createdAt && (m.updatedAt || m.completedAt)) {
      const start = new Date(m.createdAt);
      const end = new Date(m.updatedAt || m.completedAt);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      totalDays += days;
      motorsWithDuration++;
    }
  });
  const avgDays = motorsWithDuration > 0 ? Math.round(totalDays / motorsWithDuration) : 0;
  
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total terminés : ${motors.length}    |    Ce mois : ${thisMonth.length}    |    Durée moyenne : ${avgDays} jours`, margin, yPos);
  yPos += 15;
  
  // Ligne de séparation
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;
  
  // Parcourir chaque moteur
  motors.forEach((motor, index) => {
    // Vérifier si on doit ajouter une page
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 25;
      
      // Rappel en-tête sur nouvelle page
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('FORTICO REWIND - Rapport moteurs terminés (suite)', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
    }
    
    const startDate = motor.createdAt ? new Date(motor.createdAt).toLocaleDateString('fr-FR') : '-';
    const endDate = (motor.updatedAt || motor.completedAt) ? new Date(motor.updatedAt || motor.completedAt).toLocaleDateString('fr-FR') : '-';
    let durationDays = '-';
    if (motor.createdAt && (motor.updatedAt || motor.completedAt)) {
      durationDays = Math.ceil((new Date(motor.updatedAt || motor.completedAt) - new Date(motor.createdAt)) / (1000 * 60 * 60 * 24));
    }
    
    // Titre avec numéro
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text(`${index + 1}. ${motor.clientName || 'Client inconnu'}`, margin, yPos);
    
    // Badge durée
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(16, 185, 129);
    const durationText = typeof durationDays === 'number' ? `${durationDays} jours` : '-';
    const badgeWidth = doc.getTextWidth(durationText) + 10;
    doc.roundedRect(pageWidth - margin - badgeWidth, yPos - 5, badgeWidth, 7, 3, 3, 'F');
    doc.text(durationText, pageWidth - margin - badgeWidth/2, yPos, { align: 'center' });
    
    yPos += 10;
    
    // Détails
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    
    const details = [
      `Client : ${motor.clientName || '-'}`,
      `Entreprise : ${motor.clientCompany || '-'}`,
      `Téléphone : ${motor.clientPhone || '-'}`,
      `Adresse : ${motor.clientAddress || '-'}`,
      `Technicien : ${motor.technicianName || '-'} (${motor.technicianEmail || '-'})`,
      `Type : ${motor.motorType === 'three_phase' ? 'Triphasé' : 'Monophasé'} | Puissance : ${motor.power || '-'} kW | Tension : ${motor.voltage || '-'} V`,
      `Créé le : ${startDate} | Terminé le : ${endDate}`
    ];
    
    details.forEach(line => {
      doc.text(line, margin + 5, yPos);
      yPos += 7;
    });
    
    // Panne décrite (avec retour à la ligne)
    if (motor.faultDescription) {
      doc.text(`Panne décrite :`, margin + 5, yPos);
      yPos += 6;
      
      const faultLines = doc.splitTextToSize(motor.faultDescription, pageWidth - (2 * margin) - 10);
      faultLines.forEach(line => {
        doc.text(line, margin + 10, yPos);  
        yPos += 5;
      });
    } else {
      doc.text(`Panne décrite : -`, margin + 5, yPos);
      yPos += 7;
    }
    
    // Ligne de séparation
    yPos += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 12;
  });
  
  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} / ${pageCount} - Fortico Rewind - Rapport confidentiel`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  // Sauvegarder le PDF
  doc.save(`moteurs_termines_${new Date().toISOString().split('T')[0]}.pdf`);
  showNotification('PDF généré avec succès', 'success');
});

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

  // Rendre les stat-cards cliquables
  document.querySelectorAll('.stat-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function() {
      const label = this.querySelector('.stat-label')?.textContent;
      
      if (label === 'Utilisateurs') {
        setActiveNav('navAdminUsers');
        showAdminView('users');
      } else if (label === 'Moteurs totaux') {
        setActiveNav('navAdminMotors');
        showAdminView('motors');
      } else if (label === 'Validations en attente') {
        setActiveNav('navAdminMotors');
        showAdminView('motors');
        document.getElementById('motorFilterStatus').value = 'pending';
        loadAllMotors();
      } else if (label === 'Terminés') {
        setActiveNav('navAdminCompleted');
        showAdminView('completed');
      } else if (view === "reports") {
        document.getElementById("reportsManagementView")?.classList.add("active");
        loadReportsList();
      }
    });
  });

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
      : '<p style="padding:20px;">Aucune validation en attente</p>';
    p.querySelectorAll(".action-btn").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        viewAdminMotorDetail(b.dataset.id);
      })
    );
  }

  const a = document.getElementById("recentActivity");
  if (a) {
    const acts = getActivities(10);
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
      : "<p style='padding:20px;'>Aucune activité</p>";
  }
}

function loadReportsList() {
  const filter = document.getElementById('reportFilterStatus')?.value || 'all';
  let reports = getReports();
  if (filter !== 'all') reports = reports.filter(r => r.status === filter);
  
  const container = document.getElementById('reportsList');
  if (!container) return;
  
  if (reports.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;">Aucun rapport</p>';
    return;
  }
  
  container.innerHTML = `
    <div class="reports-cards">
      ${reports.map(r => {
        const motor = getMotorById(r.motorId);
        const photoCount = r.photos?.length || 0;
        
        return `
          <div class="report-card ${r.status === 'unread' ? 'unread' : ''}">
            <div class="report-card-header">
              <div>
                <h4><i class="fas fa-file-alt"></i> ${r.stepName}</h4>
                <p>Moteur : ${motor?.clientName || r.motorClient} (${motor?.power || r.motorPower} kW)</p>
              </div>
              <span class="badge ${r.status === 'approved' ? 'success' : r.status === 'unread' ? 'warning' : ''}">
                ${r.status === 'approved' ? 'Approuvé' : r.status === 'unread' ? 'Non lu' : 'Lu'}
              </span>
            </div>
            <div class="report-card-body">
              <p><strong>Technicien :</strong> ${r.userName} (${r.userEmail})</p>
              <p><strong>Date :</strong> ${formatDate(r.createdAt)}</p>
              ${r.description ? `<p><strong>Description :</strong> ${r.description.substring(0, 100)}...</p>` : ''}
              ${photoCount > 0 ? `<p><i class="fas fa-image"></i> ${photoCount} photo(s) jointe(s)</p>` : ''}
            </div>
            ${r.photos && r.photos.length > 0 ? `
              <div class="report-card-photos">
                ${r.photos.slice(0, 3).map(p => `<img src="${p}" class="report-mini-thumb" onclick="viewReportDetail('${r.id}')">`).join('')}
                ${r.photos.length > 3 ? `<span class="more-photos">+${r.photos.length - 3}</span>` : ''}
              </div>
            ` : ''}
            <div class="report-card-actions">
              <button class="cyber-button small" onclick="viewReportDetail('${r.id}')">
                <i class="fas fa-eye"></i> Voir détails
              </button>
              ${r.status === 'unread' ? `
                <button class="cyber-button small success" onclick="markReportRead('${r.id}')">
                  <i class="fas fa-check"></i> Marquer lu
                </button>
              ` : ''}
              ${r.status !== 'approved' ? `
                <button class="cyber-button small" onclick="approveReport('${r.id}')">
                  <i class="fas fa-check-double"></i> Approuver
                </button>
              ` : ''}
              <button class="action-btn delete-report" data-id="${r.id}" title="Supprimer">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  // Événements
  container.querySelectorAll('.delete-report').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPopup({
        title: 'Supprimer le rapport',
        message: 'Voulez-vous vraiment supprimer ce rapport ?',
        icon: 'trash',
        confirmText: 'Supprimer',
        onConfirm: () => {
          deleteReport(btn.dataset.id);
          showNotification('Rapport supprimé', 'success');
          loadReportsList();
        }
      });
    });
  });
}

window.markReportRead = function(reportId) {
  updateReport(reportId, { status: 'read' });
  showNotification('Rapport marqué comme lu', 'success');
  loadReportsList();
  loadAdminStats();
};

window.approveReport = function(reportId) {
  updateReport(reportId, { status: 'approved' });
  showNotification('Rapport approuvé', 'success');
  loadReportsList();
  loadAdminStats();
};


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
