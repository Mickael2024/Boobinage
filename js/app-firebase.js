// ==========================================
// APP FIREBASE - FORTICO REWIND
// Fichier complet A-Z compatible Firebase
// ==========================================

// === POPUP PERSONNALISÉ ===
function showPopup(options) {
  const { title, message, icon = "question", confirmText = "Confirmer", cancelText = "Annuler", onConfirm, onCancel } = options;
  const container = document.getElementById("popup-container");
  if (!container) return;
  document.removeEventListener("keydown", showPopup._esc);
  container.innerHTML = "";
  const overlay = document.createElement("div"); overlay.className = "popup-overlay";
  const popup = document.createElement("div"); popup.className = "popup";
  popup.setAttribute("role", "dialog"); popup.setAttribute("aria-modal", "true"); popup.setAttribute("aria-label", title || "");
  const isHtml = typeof message === "string" && message.includes("<") && message.includes(">");
  if (isHtml) popup.classList.add("popup-wide");
  const hasCancel = typeof cancelText === "string" && cancelText !== "";
  popup.innerHTML = `<button type="button" class="popup-close" aria-label="Fermer"><i class="fas fa-times"></i></button><div class="popup-icon"><i class="fas fa-${icon}"></i></div><h3>${title}</h3><div class="popup-body">${isHtml ? message : `<p>${message}</p>`}</div><div class="popup-actions">${hasCancel ? `<button type="button" class="cyber-button secondary cancel-btn">${cancelText}</button>` : ""}<button type="button" class="cyber-button confirm-btn">${confirmText}</button></div>`;
  container.appendChild(overlay); container.appendChild(popup);
  document.body.classList.add("modal-open");
  const cleanup = () => { container.innerHTML = ""; document.body.classList.remove("modal-open"); document.removeEventListener("keydown", showPopup._esc); };
  const cancel = () => { if (onCancel) onCancel(); cleanup(); };
  const confirmBtn = popup.querySelector(".confirm-btn");
  confirmBtn.onclick = () => {
    if (!onConfirm) return cleanup();
    const r = onConfirm();
    if (r && typeof r.then === "function") {
      // action asynchrone : on garde le modal ouvert (bouton bloqué) jusqu'à la fin, sauf retour false
      confirmBtn.disabled = true;
      window.btnLoading?.(confirmBtn, true);
      const reset = () => { if (popup.isConnected) { confirmBtn.disabled = false; window.btnLoading?.(confirmBtn, false); } };
      r.then((v) => { if (popup.isConnected) { if (v !== false) cleanup(); else reset(); } })
       .catch((err) => { console.error(err); showNotification("Une erreur est survenue", "error"); reset(); });
    } else if (r !== false) cleanup();
  };
  const cancelBtn = popup.querySelector(".cancel-btn");
  if (cancelBtn) cancelBtn.onclick = cancel;
  popup.querySelector(".popup-close").onclick = overlay.onclick = cancel;
  popup.onclick = (e) => e.stopPropagation();
  showPopup._esc = (e) => { if (e.key === "Escape") cancel(); };
  document.addEventListener("keydown", showPopup._esc);
  const firstField = popup.querySelector(".popup-body input, .popup-body textarea");
  (firstField || popup.querySelector(".confirm-btn")).focus();
}

function showNotification(message, type = "info") {
  const container = document.getElementById("notification-container");
  if (!container) return;
  const icons = { success: "check-circle", error: "times-circle", warning: "exclamation-triangle", info: "info-circle" };
  const notif = document.createElement("div"); notif.className = `notification ${type}`;
  notif.innerHTML = `<i class="fas fa-${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(notif);
  setTimeout(() => { notif.style.opacity = "0"; setTimeout(() => notif.remove(), 300); }, 4000);
}
window.showNotification = showNotification;

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatDate(d) {
  if (!d) return "-";
  try {
    if (d && typeof d.toDate === 'function') d = d.toDate();
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch(e) { return "-"; }
}

function getStatusLabel(s) {
  return { pending: "En attente", in_progress: "En cours", completed: "Terminé" }[s] || s;
}

// === PANNES & DIAGNOSTICS : helpers ===
const FAULT_CATEGORIES = { electrical: "Électrique", mechanical: "Mécanique", thermal: "Thermique", insulation: "Isolation / bobinage", other: "Autre" };
// Libellé du type de moteur d'une fiche ("Autre" => texte saisi par le technicien)
function motorTypeLabel(m, short, raw) {
  if (m?.motorType === "three_phase") return short ? "Tri" : "Triphasé";
  if (m?.motorType === "single_phase") return short ? "Mono" : "Monophasé";
  return raw ? (m?.motorTypeCustom || "Autre") : esc(m?.motorTypeCustom || "Autre");
}
const OTHER_TEMPLATE = "__other";
const FAULT_MOTOR_LABELS = { all: "Tous les moteurs", three_phase: "Triphasé", single_phase: "Monophasé" };

function diagnosticListHtml(list) {
  if (!list?.length) return '<p class="diag-empty">Aucun test de diagnostic défini.</p>';
  return `<ol class="diag-list">${list.map((d) => `<li><span class="diag-title">${esc(d.title)}</span>${d.expected ? `<span class="diag-expected"><i class="fas fa-bullseye" aria-hidden="true"></i> ${esc(d.expected)}</span>` : ""}</li>`).join("")}</ol>`;
}

// Bloc affiché dans la fiche d'un moteur (technicien et admin)
function diagnosticSectionHtml(motor) {
  if (!motor?.faultTypeName && !motor?.diagnostic?.length) return "";
  return `<div class="diag-box"><div class="diag-head"><i class="fas fa-stethoscope" aria-hidden="true"></i><div><strong>Panne : ${esc(motor.faultTypeName || "Non précisée")}</strong>${motor.faultCategory ? `<small>${esc(FAULT_CATEGORIES[motor.faultCategory] || motor.faultCategory)}</small>` : ""}</div></div>${motor.diagnostic?.length ? `<h5 class="popup-subtitle">Diagnostic à effectuer</h5>${diagnosticListHtml(motor.diagnostic)}` : ""}</div>`;
}

// === INIT USER ===
async function initUserPage() {
  await validateRememberedSession("user");
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

  document.getElementById("navToggle")?.addEventListener("click", () => document.getElementById("navMenu")?.classList.toggle("active"));

  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showNotification("Connexion en cours...", "info");
    const r = await authenticateUser(document.getElementById("loginEmail").value, document.getElementById("loginPassword").value, !!document.getElementById("rememberMe")?.checked);
    if (r.success) { showNotification("Connexion réussie", "success"); setTimeout(() => window.location.reload(), 500); }
    else showNotification(r.message, "error");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => { e.preventDefault(); logout(); window.location.reload(); });
  document.getElementById("navDashboard")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navDashboard"); showUserView("dashboard"); });
  document.getElementById("navNewMotor")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navNewMotor"); showUserView("newMotor"); });
  document.getElementById("navProfile")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navProfile"); showUserView("profile"); });
  document.getElementById("quickNewMotor")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navNewMotor"); showUserView("newMotor"); });
  document.getElementById("backToDashboardBtn")?.addEventListener("click", () => { setActiveNav("navDashboard"); showUserView("dashboard"); });
  document.getElementById("backFromDetailBtn")?.addEventListener("click", () => { setActiveNav("navDashboard"); showUserView("dashboard"); });
  document.getElementById("cancelMotorBtn")?.addEventListener("click", () => { setActiveNav("navDashboard"); showUserView("dashboard"); });
  document.getElementById("cancelProfileBtn")?.addEventListener("click", () => { setActiveNav("navDashboard"); showUserView("dashboard"); });

  document.getElementById("motorForm")?.addEventListener("submit", async (e) => { e.preventDefault(); await saveMotorData(); });
  document.getElementById("motorTemplate")?.addEventListener("change", async () => { await applyMotorTemplate(); });
  document.getElementById("motorType")?.addEventListener("change", () => { syncOtherFields(); refreshFaultOptions(); });
  document.getElementById("faultType")?.addEventListener("change", showDiagnosticPreview);
  await initializeStorage();
  await loadMotorTemplates();

}

function setActiveNav(id) {
  document.querySelectorAll(".nav-menu a").forEach((a) => a.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
}

function showUserView(view) {
  ["dashboardView", "motorFormView", "motorDetailView", "profileView"].forEach((v) => document.getElementById(v)?.classList.remove("active"));
  if (view === "dashboard") { document.getElementById("dashboardView")?.classList.add("active"); loadUserDashboard(); }
  else if (view === "newMotor") { 
    document.getElementById("motorFormView")?.classList.add("active"); 
    document.getElementById("motorForm").reset();
    const user = getCurrentUser();
    if (user) { 
      const tn = document.getElementById("technicianName"); if (tn) tn.textContent = user.name || "";
      const te = document.getElementById("technicianEmail"); if (te) te.textContent = user.email || "";
      const tc = document.getElementById("technicianCompany"); if (tc) tc.value = user.company || "";
    }
    syncOtherFields();
    refreshFaultOptions(true);
  }
  else if (view === "motorDetail") { document.getElementById("motorDetailView")?.classList.add("active"); }
  else if (view === "profile") { document.getElementById("profileView")?.classList.add("active"); loadUserProfile(); }
}

async function loadUserDashboard() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById("userNameDisplay").textContent = user.name.split(" ")[0];
  const allMotors = await getMotors();
  const motors = allMotors.filter((m) => m.userId === user.id);
  document.getElementById("totalMotors").textContent = motors.length;
  document.getElementById("inProgressMotors").textContent = motors.filter((m) => m.status === "in_progress").length;
  document.getElementById("completedMotors").textContent = motors.filter((m) => m.status === "completed").length;
  document.getElementById("pendingMotors").textContent = motors.filter((m) => m.status === "pending").length;
  renderMotorsList(motors);
}

function renderMotorsList(motors) {
  const c = document.getElementById("motorsList");
  if (!c) return;
  if (!motors.length) { c.innerHTML = '<p style="text-align:center;padding:40px;">Aucun moteur</p>'; return; }
  c.innerHTML = motors.map((m) => `<div class="motor-item" data-id="${m.id}"><div class="motor-header"><h4>${esc(m.clientName || "Sans nom")}</h4><span class="motor-status status-${m.status}">${getStatusLabel(m.status)}</span></div><div class="motor-details"><p><strong>Puissance:</strong> ${m.power || "-"} kW</p><p><strong>Type:</strong> ${motorTypeLabel(m)}</p><p><strong>Progression:</strong> ${m.steps?.filter((s) => s.validated).length || 0}/${m.steps?.length || 0}</p></div></div>`).join("");
  document.querySelectorAll(".motor-item").forEach((el) => el.addEventListener("click", () => viewMotorDetail(el.dataset.id)));
}

window.viewMotorDetail = async function(motorId) {
  const motor = await getMotorById(motorId);
  if (!motor) return showNotification('Moteur non trouvé', 'error');
  showUserView('motorDetail');
  document.getElementById('motorDetailTitle').textContent = `SUIVI - ${motor.clientName || 'Sans nom'}`;
  const content = document.getElementById('motorDetailContent');
  if (!content) return;
  const reports = await getReportsByMotor(motorId);
  
  let html = `<div class="motor-info-card"><p><strong>Client:</strong> ${motor.clientName||'-'} | <strong>Tél:</strong> ${motor.clientPhone||'-'}</p><p><strong>Technicien:</strong> ${motor.technicianName||'-'} (${motor.technicianEmail||'-'})</p><p><strong>Type:</strong> ${motorTypeLabel(motor)}${motor.templateCustom ? ` | <strong>Modèle:</strong> ${esc(motor.templateCustom)}` : ''} | <strong>Puissance:</strong> ${motor.power||'-'} kW</p><p><strong>Statut:</strong> <span class="motor-status status-${motor.status}">${getStatusLabel(motor.status)}</span></p></div><div class="steps-container">`;
  html += diagnosticSectionHtml(motor);
  
  motor.steps.forEach((step, stepIndex) => {
    const stepValidated = step.validated; const stepCompleted = step.completed;
    if (!step.substepsCompleted) step.substepsCompleted = new Array(step.substeps.length).fill(stepCompleted || false);
    const stepReports = reports.filter(r => r.stepId === step.id);
    const reportCount = stepReports.length;
    
    html += `<div class="step-card ${stepValidated ? 'validated' : stepCompleted ? 'completed' : ''}"><div class="step-header"><h4>${step.name}</h4><div class="step-status">${stepValidated ? '<span class="badge success"><i class="fas fa-check-circle"></i> Validé</span>' : stepCompleted ? '<span class="badge warning"><i class="fas fa-clock"></i> En attente</span>' : '<span class="badge">À faire</span>'}</div></div><div class="step-substeps">`;
    
    step.substeps.forEach((substep, subIndex) => {
      const isChecked = step.substepsCompleted[subIndex] ? 'checked' : '';
      const isDisabled = stepValidated ? 'disabled' : '';
      html += `<label class="checkbox-label ${stepValidated ? 'disabled' : ''}"><input type="checkbox" ${isChecked} ${isDisabled} data-motor-id="${motor.id}" data-step-id="${step.id}" data-substep-index="${subIndex}"><span>${substep}</span></label>`;
    });
    
    html += `</div><div class="step-actions"><button class="cyber-button small send-report-btn" data-motor-id="${motor.id}" data-step-id="${step.id}" data-step-name="${step.name}"><i class="fas fa-camera"></i> Envoyer rapport</button>${reportCount > 0 ? `<span class="report-badge"><i class="fas fa-paperclip"></i> ${reportCount} rapport(s)</span>` : ''}</div>`;
    
    if (stepReports.length > 0) {
      html += `<div class="report-thumbnails">`;
      stepReports.forEach(report => {
        if (report.photos && report.photos.length > 0) report.photos.forEach(photo => html += `<img src="${photo}" class="report-thumb" onclick="viewReportDetail('${report.id}')">`);
        if (report.description) html += `<div class="report-note" onclick="viewReportDetail('${report.id}')"><i class="fas fa-sticky-note"></i> ${report.description.substring(0, 50)}...</div>`;
      });
      html += `</div>`;
    }
    
    if (step.completedAt) html += `<small><i class="far fa-calendar"></i> Complété le ${formatDate(step.completedAt)}</small>`;
    if (step.validatedAt) html += `<small><i class="fas fa-check-circle" style="color:var(--success);"></i> Validé le ${formatDate(step.validatedAt)}</small>`;
    html += `</div>`;
  });
  
  html += `</div>`;
  content.innerHTML = html;
  
  content.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => {
    cb.addEventListener('change', async function(e) {
      e.stopPropagation();
      const mid = this.dataset.motorId, sid = this.dataset.stepId, ssi = parseInt(this.dataset.substepIndex);
      await updateMotorSubstep(mid, sid, ssi, this.checked);
      showNotification(this.checked ? 'Sous-étape complétée' : 'Sous-étape décochée', 'info');
      const um = await getMotorById(mid);
      const step = um.steps.find(s => s.id === sid);
      if (step && step.completed && !step.validated) {
        setTimeout(() => showPopup({ title: 'Demande validation', message: `L'étape "${step.name}" est complète. Demander validation admin ?`, icon: 'check-circle', confirmText: 'Demander', cancelText: 'Plus tard', onConfirm: () => { showNotification('Demande envoyée', 'success'); viewMotorDetail(mid); }, onCancel: () => viewMotorDetail(mid) }), 100);
      } else viewMotorDetail(mid);
    });
  });
  
  content.querySelectorAll('.send-report-btn').forEach(btn => {
    btn.addEventListener('click', function(e) { e.stopPropagation(); showReportForm(this.dataset.motorId, this.dataset.stepId, this.dataset.stepName); });
  });
};

// === RAPPORTS ===
function showReportForm(motorId, stepId, stepName) {
  getMotorById(motorId).then(motor => {
    const formHtml = `<div><h4 style="color:var(--primary);margin-bottom:10px;">Rapport : ${stepName}</h4><p style="color:var(--text-secondary);">Moteur : ${motor?.clientName||'-'} | ${motor?.power||'-'} kW</p><div class="form-field"><label>Description</label><textarea id="reportDescription" rows="4" placeholder="Décrivez..."></textarea></div><div class="form-field"><label>Photos (max 5)</label><div class="photo-upload-area"><input type="file" id="photoInput" accept="image/*" multiple style="display:none;"><div class="upload-placeholder" onclick="document.getElementById('photoInput').click()"><i class="fas fa-cloud-upload-alt"></i><p>Cliquez pour ajouter</p></div></div><div class="photo-previews" id="photoPreviews"></div></div><div class="form-field"><label>Mesures</label><textarea id="reportMeasurements" rows="3" placeholder="Résistance..."></textarea></div></div>`;
    
    showPopup({ title: 'Envoyer rapport', message: formHtml, icon: 'camera', confirmText: 'Envoyer', cancelText: 'Annuler', onConfirm: async () => {
      const desc = document.getElementById('reportDescription')?.value;
      const meas = document.getElementById('reportMeasurements')?.value;
      const previews = document.querySelectorAll('#photoPreviews img');
      if (!desc && previews.length === 0) { showNotification('Ajoutez une description ou photo', 'warning'); return false; }
      const photos = []; previews.forEach(img => photos.push(img.src));
      const user = getCurrentUser();
      await saveReport({ motorId, stepId, stepName, userId: user.id, userName: user.name, userEmail: user.email, motorClient: motor?.clientName||'', motorPower: motor?.power||'', motorType: motor?.motorType||'', description: desc, measurements: meas, photos, status: 'unread' });
      showNotification('Rapport envoyé !', 'success');
      viewMotorDetail(motorId);
      return true;
    }});
    
    setTimeout(() => {
      let selectedPhotos = [];
      document.getElementById('photoInput')?.addEventListener('change', function(e) {
        Array.from(e.target.files).forEach(file => {
          if (selectedPhotos.length >= 5) { showNotification('Max 5 photos', 'warning'); return; }
          if (file.size > 5*1024*1024) { showNotification('Max 5MB', 'warning'); return; }
          const reader = new FileReader();
          reader.onload = ev => { selectedPhotos.push(ev.target.result); renderPreviews(); };
          reader.readAsDataURL(file);
        });
      });
      function renderPreviews() {
        document.getElementById('photoPreviews').innerHTML = selectedPhotos.map((p,i) => `<div class="photo-preview-item"><img src="${p}"><button class="remove-photo-btn" onclick="this.parentElement.remove();selectedPhotos.splice(${i},1)"><i class="fas fa-times"></i></button></div>`).join('');
      }
    }, 100);
  });
}

window.viewReportDetail = async function(reportId) {
  const report = await getReportById(reportId); if (!report) return;
  const motor = await getMotorById(report.motorId);
  let html = `<div><h4 style="color:var(--primary);">Rapport - ${report.stepName}</h4><p>Moteur : ${motor?.clientName||report.motorClient} | Envoyé par : ${report.userName} | ${formatDate(report.createdAt)}</p>${report.description?`<div><h5>Description</h5><p>${report.description}</p></div>`:''}${report.measurements?`<div><h5>Mesures</h5><pre>${report.measurements}</pre></div>`:''}${report.photos?.length?`<div><h5>Photos</h5><div class="report-photos-grid">${report.photos.map(p=>`<img src="${p}" class="report-full-photo">`).join('')}</div></div>`:''}</div>`;
  showPopup({ title: 'Détail rapport', message: html, icon: 'file-alt', confirmText: 'Fermer', cancelText: null });
};

// === TEMPLATES ===
async function loadMotorTemplates() {
  const s = document.getElementById("motorTemplate");
  if (!s) {
    console.warn('loadMotorTemplates: élément #motorTemplate non trouvé');
    return;
  }
  
  try {
    console.log('Chargement des types de moteurs...');
    const types = await getMotorTypes();
    console.log('Types chargés:', types.length, types);
    
    if (!types || types.length === 0) {
      s.innerHTML = '<option value="">Aucun modèle disponible</option><option value="__other">Autre (à préciser)</option>';
      console.warn('Aucun type de moteur trouvé dans Firestore');
      return;
    }
    
    s.innerHTML = '<option value="">Choisir un modèle</option>' +
      types.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('') + '<option value="__other">Autre (à préciser)</option>';
    
    console.log('✅ Templates chargés:', types.length);
  } catch (error) {
    console.error('Erreur loadMotorTemplates:', error);
    s.innerHTML = '<option value="">Erreur de chargement</option><option value="__other">Autre (à préciser)</option>';
  }
}

// Affiche / masque les champs « Précisez… » quand « Autre » est choisi
function syncOtherFields() {
  const tpl = document.getElementById("motorTemplate"), typ = document.getElementById("motorType");
  const toggle = (inputId, on) => { const el = document.getElementById(inputId); if (!el) return; el.hidden = !on; if (!on) el.value = ""; };
  toggle("motorTemplateOther", tpl?.value === OTHER_TEMPLATE);
  toggle("motorTypeOther", typ?.value === "other");
}

async function applyMotorTemplate() {
  syncOtherFields();
  const id = document.getElementById("motorTemplate")?.value; if (!id || id === OTHER_TEMPLATE) return;
  const types = await getMotorTypes();
  const t = types.find(x => x.id === id); if (!t) return;
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
  refreshFaultOptions();
  showNotification("Template appliqué", "success");
}

let faultTypesCache = [];

// Remplit la liste des pannes selon le type de moteur choisi (et recharge depuis la base si besoin)
async function refreshFaultOptions(reload) {
  const sel = document.getElementById("faultType"); if (!sel) return;
  if (reload === true || !faultTypesCache.length) { try { faultTypesCache = await getFaultTypes(); } catch (e) { faultTypesCache = []; } }
  const mt = document.getElementById("motorType")?.value;
  const previous = sel.value;
  const list = faultTypesCache.filter((f) => !mt || mt === "other" || f.motorType === "all" || f.motorType === mt);
  sel.innerHTML = '<option value="">-- Non précisé --</option>' + list.map((f) => `<option value="${f.id}">${esc(f.name)}</option>`).join("");
  if (list.some((f) => f.id === previous)) sel.value = previous;
  showDiagnosticPreview();
}

function showDiagnosticPreview() {
  const box = document.getElementById("diagnosticPreview"); if (!box) return;
  const ft = faultTypesCache.find((f) => f.id === document.getElementById("faultType")?.value);
  if (!ft) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = `<div class="diag-head"><i class="fas fa-stethoscope" aria-hidden="true"></i><div><strong>Diagnostic recommandé</strong><small>${esc(FAULT_CATEGORIES[ft.category] || "")}${ft.description ? " — " + esc(ft.description) : ""}</small></div></div>${diagnosticListHtml(ft.diagnostic)}`;
}

async function saveMotorData() {
  const user = getCurrentUser(); if (!user) return;
  const motor = {
    userId: user.id,
    templateId: (document.getElementById("motorTemplate")?.value && document.getElementById("motorTemplate").value !== OTHER_TEMPLATE) ? document.getElementById("motorTemplate").value : null,
    templateCustom: document.getElementById("motorTemplate")?.value === OTHER_TEMPLATE ? (document.getElementById("motorTemplateOther")?.value || "").trim() : "",
    motorTypeCustom: document.getElementById("motorType")?.value === "other" ? (document.getElementById("motorTypeOther")?.value || "").trim() : "",
    technicianName: document.getElementById("technicianName")?.value || user.name,
    technicianEmail: document.getElementById("technicianEmail")?.value || user.email,
    technicianCompany: document.getElementById("technicianCompany")?.value || user.company || '',
    clientName: document.getElementById("clientName")?.value,
    clientPhone: document.getElementById("clientPhone")?.value,
    clientCompany: document.getElementById("clientCompany")?.value,
    clientAddress: document.getElementById("clientAddress")?.value,
    faultDescription: document.getElementById("faultDescription")?.value,
    ...(() => {
      const ft = faultTypesCache.find((f) => f.id === document.getElementById("faultType")?.value);
      // copie figée : la fiche garde le diagnostic tel qu'il était à la création, même si l'admin le modifie ensuite
      return ft ? { faultTypeId: ft.id, faultTypeName: ft.name, faultCategory: ft.category || "", diagnostic: (ft.diagnostic || []).map((d) => ({ title: d.title, expected: d.expected || "" })) } : {};
    })(),
    motorType: document.getElementById("motorType")?.value,
    power: document.getElementById("power")?.value, voltage: document.getElementById("voltage")?.value,
    current: document.getElementById("current")?.value, frequency: document.getElementById("frequency")?.value,
    rpm: document.getElementById("rpm")?.value, powerFactor: document.getElementById("powerFactor")?.value,
    insulationClass: document.getElementById("insulationClass")?.value,
    couplingType: document.getElementById("couplingType")?.value, poles: document.getElementById("poles")?.value,
  };
  if (!motor.clientName || !motor.motorType) return showNotification("Client et type requis", "error");
  if (document.getElementById("motorTemplate")?.value === OTHER_TEMPLATE && !motor.templateCustom) return showNotification("Précisez le modèle du moteur", "warning");
  if (motor.motorType === "other" && !motor.motorTypeCustom) return showNotification("Précisez le type de moteur", "warning");
  await saveMotor(motor);
  showNotification("Moteur enregistré", "success");
  setActiveNav("navDashboard"); showUserView("dashboard");
}

function loadUserProfile() {
  const u = getCurrentUser(); if (!u) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || "-"; };
  set("profileName", u.name);
  set("profileEmail", u.email);
  set("profileCompany", u.company);
  set("profileStatus", u.approved ? "Actif" : "En attente");
}

// === INIT ADMIN ===
// ===== Pastille « rapports non lus » (temps réel) =====
function setReportsBadge(n) {
  const link = document.getElementById("navAdminReports");
  if (link) {
    let badge = link.querySelector(".nav-badge");
    if (!badge) { badge = document.createElement("span"); badge.className = "nav-badge"; badge.setAttribute("role", "status"); link.appendChild(badge); }
    const had = badge.textContent;
    badge.textContent = n > 99 ? "99+" : String(n);
    badge.hidden = n <= 0;
    badge.setAttribute("aria-label", `${n} rapport${n > 1 ? "s" : ""} non lu${n > 1 ? "s" : ""}`);
    if (n > 0 && badge.textContent !== had) { badge.classList.remove("pop"); void badge.offsetWidth; badge.classList.add("pop"); }
  }
  // sur mobile, le menu est replié : on signale aussi sur le bouton hamburger
  const toggle = document.getElementById("navToggle");
  if (toggle) { if (n > 0) toggle.setAttribute("data-badge", n > 9 ? "9+" : String(n)); else toggle.removeAttribute("data-badge"); }
}

async function startReportsBadge() {
  if (window._reportsUnsub) return;
  try {
    await initFirebase();
    const { onSnapshot, collection } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    let previous = null;
    window._reportsUnsub = onSnapshot(collection(window.db, COLLECTIONS.REPORTS), (snap) => {
      let unread = 0;
      snap.forEach((d) => { if (d.data().status === "unread") unread++; });
      setReportsBadge(unread);
      if (previous !== null && unread > previous) {
        const diff = unread - previous;
        showNotification(`${diff} nouveau${diff > 1 ? "x" : ""} rapport${diff > 1 ? "s" : ""} reçu${diff > 1 ? "s" : ""}`, "info");
      }
      previous = unread;
    }, (err) => console.warn("Pastille rapports indisponible :", err.message));
  } catch (e) { console.warn("Pastille rapports indisponible :", e.message); }
}

async function initAdminPage() {
  await validateRememberedSession("admin");
  const currentUser = getCurrentUser();
  const nav = document.querySelector(".cyber-nav"), loginView = document.getElementById("adminLoginView");
  if (currentUser?.role === "admin") { nav?.classList.remove("hidden"); loginView?.classList.remove("active"); showAdminView("dashboard"); startReportsBadge(); }
  else { nav?.classList.add("hidden"); loginView?.classList.add("active"); }

  document.getElementById("navToggle")?.addEventListener("click", () => document.getElementById("navMenu")?.classList.toggle("active"));
  document.getElementById("navAdminMessages")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminMessages"); showAdminView("messages"); });
document.getElementById("messageFilterStatus")?.addEventListener("change", loadMessagesList);
document.getElementById("refreshMessagesBtn")?.addEventListener("click", loadMessagesList);
  document.getElementById("adminLoginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await authenticateAdmin(document.getElementById("adminUsername").value, document.getElementById("adminPassword").value, !!document.getElementById("rememberMe")?.checked);
    r.success ? (showNotification("Accès autorisé", "success"), window.location.reload()) : showNotification(r.message, "error");
  });

  document.getElementById("adminLogoutBtn")?.addEventListener("click", (e) => { e.preventDefault(); logout(); window.location.reload(); });
  document.getElementById("navAdminDashboard")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminDashboard"); showAdminView("dashboard"); });
  document.getElementById("navAdminUsers")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminUsers"); showAdminView("users"); });
  document.getElementById("navAdminMotors")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminMotors"); showAdminView("motors"); });
  document.getElementById("navAdminMotorTypes")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminMotorTypes"); showAdminView("motorTypes"); });
  document.getElementById("navAdminFaults")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminFaults"); showAdminView("faults"); });
  document.getElementById("addFaultTypeBtn")?.addEventListener("click", () => showFaultTypeForm());
  document.getElementById("navAdminProfile")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminProfile"); showAdminView("profile"); });
  document.getElementById("navAdminCompleted")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminCompleted"); showAdminView("completed"); });
  document.getElementById("navAdminReports")?.addEventListener("click", (e) => { e.preventDefault(); setActiveNav("navAdminReports"); showAdminView("reports"); });
  
  document.getElementById("refreshDashboardBtn")?.addEventListener("click", loadAdminStats);
  document.getElementById("refreshUsersList")?.addEventListener("click", loadUsersList);
  document.getElementById("addUserBtn")?.addEventListener("click", () => showUserForm());
  document.getElementById("motorFilterStatus")?.addEventListener("change", loadAllMotors);
  document.getElementById("reportFilterStatus")?.addEventListener("change", loadReportsList);
  document.getElementById("addMotorTypeBtn")?.addEventListener("click", showAddMotorTypeForm);
  document.getElementById("adminProfileForm")?.addEventListener("submit", async (e) => { e.preventDefault(); await saveAdminProfile(); });
  document.getElementById("cancelAdminProfileBtn")?.addEventListener("click", () => { setActiveNav("navAdminDashboard"); showAdminView("dashboard"); });
  document.getElementById("backFromAdminDetailBtn")?.addEventListener("click", () => { setActiveNav("navAdminMotors"); showAdminView("motors"); });
  
  document.getElementById('exportCompletedBtn')?.addEventListener('click', exportCompletedPDF);
}

function showAdminView(view) {
  ["adminDashboardView","adminProfileView","adminMotorDetailView","usersManagementView","motorsManagementView","completedMotorsView","motorTypesManagementView","faultTypesManagementView","reportsManagementView","messagesManagementView"].forEach(v => document.getElementById(v)?.classList.remove("active"));
  if (view === "dashboard") { document.getElementById("adminDashboardView")?.classList.add("active"); loadAdminStats(); }
  else if (view === "users") { document.getElementById("usersManagementView")?.classList.add("active"); loadUsersList(); }
  else if (view === "motors") { document.getElementById("motorsManagementView")?.classList.add("active"); loadAllMotors(); }
  else if (view === "completed") { document.getElementById("completedMotorsView")?.classList.add("active"); loadCompletedMotors(); }
  else if (view === "reports") { document.getElementById("reportsManagementView")?.classList.add("active"); loadReportsList(); }
  else if (view === "faults") { document.getElementById("faultTypesManagementView")?.classList.add("active"); loadFaultTypesList(); }
  else if (view === "motorTypes") { document.getElementById("motorTypesManagementView")?.classList.add("active"); loadMotorTypesList(); }
  else if (view === "profile") { document.getElementById("adminProfileView")?.classList.add("active"); loadAdminProfile(); }
  else if (view === "motorDetail") { document.getElementById("adminMotorDetailView")?.classList.add("active"); 

  }else if (view === "messages") { document.getElementById("messagesManagementView")?.classList.add("active"); loadMessagesList(); }
}

async function loadAdminStats() {
  const users = await getUsers(); const motors = await getMotors();
  const userList = users.filter(u => u.role === "user");
  document.getElementById("totalUsers").textContent = userList.length;
  document.getElementById("adminTotalMotors").textContent = motors.length;
  document.getElementById("adminPendingValidations").textContent = motors.filter(m => m.steps?.some(s => s.completed && !s.validated)).length;
  document.getElementById("adminCompleted").textContent = motors.filter(m => m.status === "completed").length;

  document.querySelectorAll('.stat-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.onclick = function() {
      const label = this.querySelector('.stat-label')?.textContent;
      if (label === 'Utilisateurs') { setActiveNav('navAdminUsers'); showAdminView('users'); }
      else if (label === 'Moteurs totaux' || label === 'Moteurs') { setActiveNav('navAdminMotors'); showAdminView('motors'); }
      else if (label === 'Validations en attente') { setActiveNav('navAdminMotors'); showAdminView('motors'); document.getElementById('motorFilterStatus').value = 'pending'; loadAllMotors(); }
      else if (label === 'Terminés') { setActiveNav('navAdminCompleted'); showAdminView('completed'); }
    };
  });

  const p = document.getElementById("pendingValidationsList");
  if (p) {
    const pm = motors.filter(m => m.steps?.some(s => s.completed && !s.validated)).slice(0, 5);
    p.innerHTML = pm.length ? pm.map(m => `<div class="list-item"><div><strong>${esc(m.clientName||"Inconnu")}</strong><br><small>${m.power||"-"} kW</small></div><button class="action-btn" data-id="${m.id}"><i class="fas fa-eye"></i></button></div>`).join('') : '<p style="padding:20px;">Aucune validation</p>';
    p.querySelectorAll(".action-btn").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); viewAdminMotorDetail(b.dataset.id); }));
  }

  const a = document.getElementById("recentActivity");
  if (a) {
    const acts = await getActivities(10);
    a.innerHTML = acts.length ? acts.map(ac => `<div class="list-item"><span>${esc(ac.description)}</span><small>${formatDate(ac.timestamp)}</small></div>`).join('') : '<p style="padding:20px;">Aucune activité</p>';
  }
}

async function loadReportsList() {
  const filter = document.getElementById('reportFilterStatus')?.value || 'all';
  let reports = await getReports();
  if (filter !== 'all') reports = reports.filter(r => r.status === filter);
  const container = document.getElementById('reportsList'); if (!container) return;
  if (!reports.length) { container.innerHTML = '<p style="text-align:center;padding:40px;">Aucun rapport</p>'; return; }
  container.innerHTML = `<div class="reports-cards">${reports.map(r => { const photoCount = r.photos?.length || 0; return `<div class="report-card ${r.status==='unread'?'unread':''}"><div class="report-card-header"><div><h4><i class="fas fa-file-alt"></i> ${esc(r.stepName)}</h4><p>Moteur : ${esc(r.motorClient||'Inconnu')} (${r.motorPower||'-'} kW)</p></div><span class="badge ${r.status==='approved'?'success':r.status==='unread'?'warning':''}">${r.status==='approved'?'Approuvé':r.status==='unread'?'Non lu':'Lu'}</span></div><div class="report-card-body"><p><strong>Technicien :</strong> ${esc(r.userName)}</p><p><strong>Date :</strong> ${formatDate(r.createdAt)}</p>${r.description?`<p>${esc(r.description.substring(0,100))}...</p>`:''}${photoCount>0?`<p><i class="fas fa-image"></i> ${photoCount} photo(s)</p>`:''}</div>${r.photos?.length?`<div class="report-card-photos">${r.photos.slice(0,3).map(p=>`<img src="${p}" class="report-mini-thumb" onclick="viewReportDetail('${r.id}')">`).join('')}</div>`:''}<div class="report-card-actions"><button class="cyber-button small" onclick="viewReportDetail('${r.id}')"><i class="fas fa-eye"></i> Voir</button>${r.status==='unread'?`<button class="cyber-button small success" onclick="markReportRead('${r.id}')"><i class="fas fa-check"></i> Lu</button>`:''}${r.status!=='approved'?`<button class="cyber-button small" onclick="approveReport('${r.id}')"><i class="fas fa-check-double"></i> Approuver</button>`:''}<button class="action-btn del-rep" data-id="${r.id}"><i class="fas fa-trash"></i></button></div></div>`; }).join('')}</div>`;
  container.querySelectorAll('.del-rep').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); showPopup({ title:'Supprimer', message:'Supprimer ce rapport ?', icon:'trash', confirmText:'Supprimer', onConfirm: async () => { await deleteReport(b.dataset.id); showNotification('Supprimé','success'); loadReportsList(); }}); }));
}

window.markReportRead = async function(reportId) { await updateReport(reportId, { status: 'read' }); showNotification('Marqué comme lu','success'); loadReportsList(); };
window.approveReport = async function(reportId) { await updateReport(reportId, { status: 'approved' }); showNotification('Approuvé','success'); loadReportsList(); };

const USER_STATUS = { approved: "Approuvé", pending: "En attente" };

async function loadUsersList() {
  const users = await getUsers();
  const userList = users.filter(u => u.role === "user");
  const c = document.getElementById("usersList"); if (!c) return;
  if (!userList.length) { c.innerHTML = '<p>Aucun utilisateur. Cliquez sur « Nouvel utilisateur » pour en créer un.</p>'; return; }
  c.innerHTML = `<table class="data-table"><thead><tr><th>Nom</th><th>Email</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${userList.map(u => `<tr><td><strong>${esc(u.name)}</strong></td><td>${esc(u.email)}</td><td><span class="motor-status ${u.approved?"status-completed":"status-pending"}">${u.approved?USER_STATUS.approved:USER_STATUS.pending}</span></td><td class="row-actions"><button class="action-btn view-user" data-id="${u.id}" title="Voir" aria-label="Voir"><i class="fas fa-eye"></i></button><button class="action-btn edit-user" data-id="${u.id}" title="Modifier" aria-label="Modifier"><i class="fas fa-pen"></i></button>${!u.approved?`<button class="action-btn approve" data-id="${u.id}" title="Approuver" aria-label="Approuver"><i class="fas fa-check"></i></button>`:''}<button class="action-btn delete" data-id="${u.id}" title="Supprimer" aria-label="Supprimer"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table>`;
  const byId = (id) => userList.find(u => u.id === id);
  c.querySelectorAll(".view-user").forEach(b => b.addEventListener("click", () => showUserDetails(byId(b.dataset.id))));
  c.querySelectorAll(".edit-user").forEach(b => b.addEventListener("click", () => showUserForm(byId(b.dataset.id))));
  c.querySelectorAll(".approve").forEach(b => b.addEventListener("click", async () => { await updateUser(b.dataset.id, { approved: true }); showNotification("Utilisateur approuvé", "success"); loadUsersList(); loadAdminStats(); }));
  c.querySelectorAll(".delete").forEach(b => b.addEventListener("click", () => deleteUserConfirm(b.dataset.id)));
}

function showUserDetails(u) {
  if (!u) return;
  const row = (label, value) => `<div class="detail-row"><span>${label}</span><strong>${value}</strong></div>`;
  showPopup({
    title: "Détails utilisateur", icon: "user",
    message: `<div class="detail-list">${row("Nom", esc(u.name))}${row("Email", esc(u.email))}${row("Statut", u.approved ? USER_STATUS.approved : USER_STATUS.pending)}${row("Créé le", formatDate(u.createdAt))}${row("Dernière modification", formatDate(u.updatedAt))}</div>`,
    confirmText: "Modifier", cancelText: "Fermer", onConfirm: () => { setTimeout(() => showUserForm(u), 0); },
  });
}

// Création (u absent) et modification (u présent) d'un utilisateur
function showUserForm(u) {
  const editing = !!u;
  u = u || {};
  const form = `<form id="userFormPopup" autocomplete="off" novalidate>
    <div class="form-field"><label for="ufName">Nom complet *</label><input id="ufName" type="text" value="${esc(u.name || "")}" required></div>
    <div class="form-field"><label for="ufEmail">Email *</label><input id="ufEmail" type="email" value="${esc(u.email || "")}" required></div>
    <div class="form-field"><label for="ufStatus">Statut du compte</label><select id="ufStatus"><option value="approved" ${u.approved !== false ? "selected" : ""}>Approuvé (peut se connecter)</option><option value="pending" ${u.approved === false ? "selected" : ""}>En attente (accès bloqué)</option></select></div>
    <div class="form-field"><label for="ufPassword">${editing ? "Nouveau mot de passe" : "Mot de passe *"}</label><input id="ufPassword" type="password" autocomplete="new-password" placeholder="${editing ? "Laisser vide pour ne pas changer" : "6 caractères minimum"}"></div>
  </form>`;
  showPopup({
    title: editing ? "Modifier l'utilisateur" : "Nouvel utilisateur", icon: editing ? "user-pen" : "user-plus", message: form,
    confirmText: editing ? "Enregistrer" : "Créer le compte",
    onConfirm: async () => {
      const val = (id) => document.getElementById(id).value.trim();
      const data = { name: val("ufName"), email: val("ufEmail"), approved: document.getElementById("ufStatus").value === "approved" };
      const pwd = document.getElementById("ufPassword").value;
      if (!data.name) { showNotification("Le nom est obligatoire", "warning"); return false; }
      if (!/^\S+@\S+\.\S+$/.test(data.email)) { showNotification("Email invalide", "warning"); return false; }
      if (!editing && pwd.length < 6) { showNotification("Mot de passe : 6 caractères minimum", "warning"); return false; }
      if (editing && pwd && pwd.length < 6) { showNotification("Mot de passe : 6 caractères minimum", "warning"); return false; }
      if (!editing || data.email !== (u.email || "")) {
        const existing = await getUserByEmail(data.email);
        if (existing && existing.id !== u.id) { showNotification("Cet email est déjà utilisé", "error"); return false; }
      }
      if (pwd) data.password = pwd;
      if (editing) {
        await updateUser(u.id, data);
        await addActivity({ type: "user_updated", userId: u.id, description: `Compte modifié : ${data.name}` });
        showNotification("Utilisateur modifié", "success");
      } else {
        const saved = await saveUser({ ...data, company: getCurrentUser()?.company || "", role: "user" }); // l'entreprise du salarié = celle de l'admin
        await addActivity({ type: "user_created", userId: saved?.id, description: `Compte créé par l'admin : ${data.name}` });
        showNotification("Compte créé", "success");
      }
      loadUsersList(); loadAdminStats();
    },
  });
}

window.deleteUserConfirm = function(id) {
  showPopup({ title: "Supprimer", message: "Supprimer cet utilisateur ? Cette action est définitive.", icon: "trash", confirmText: "Supprimer", onConfirm: async () => { await deleteUser(id); showNotification("Utilisateur supprimé", "success"); loadUsersList(); loadAdminStats(); } });
};

// ===== ADMIN : types de panne & diagnostics =====
async function loadFaultTypesList() {
  const c = document.getElementById("faultTypesList"); if (!c) return;
  const list = await getFaultTypes();
  faultTypesCache = list;
  if (!list.length) { c.innerHTML = '<p>Aucun type de panne. Cliquez sur « Nouvelle panne » pour créer le premier avec son diagnostic.</p>'; return; }
  c.innerHTML = `<table class="data-table"><thead><tr><th>Panne</th><th>Catégorie</th><th>Moteur</th><th>Tests</th><th>Actions</th></tr></thead><tbody>${list.map((f) => `<tr><td><strong>${esc(f.name)}</strong>${f.description ? `<br><small>${esc(f.description)}</small>` : ""}</td><td>${esc(FAULT_CATEGORIES[f.category] || "-")}</td><td>${esc(FAULT_MOTOR_LABELS[f.motorType] || "-")}</td><td><span class="badge">${f.diagnostic?.length || 0} test(s)</span></td><td class="row-actions"><button class="action-btn ft-view" data-id="${f.id}" title="Voir" aria-label="Voir"><i class="fas fa-eye"></i></button><button class="action-btn ft-edit" data-id="${f.id}" title="Modifier" aria-label="Modifier"><i class="fas fa-pen"></i></button><button class="action-btn ft-del" data-id="${f.id}" title="Supprimer" aria-label="Supprimer"><i class="fas fa-trash"></i></button></td></tr>`).join("")}</tbody></table>`;
  const byId = (id) => list.find((f) => f.id === id);
  c.querySelectorAll(".ft-view").forEach((b) => b.addEventListener("click", () => showFaultTypeDetails(byId(b.dataset.id))));
  c.querySelectorAll(".ft-edit").forEach((b) => b.addEventListener("click", () => showFaultTypeForm(byId(b.dataset.id))));
  c.querySelectorAll(".ft-del").forEach((b) => b.addEventListener("click", () => {
    const f = byId(b.dataset.id);
    showPopup({ title: "Supprimer la panne", message: `Supprimer « ${esc(f?.name)} » et son diagnostic ? Les moteurs déjà enregistrés gardent leur copie du diagnostic.`, icon: "trash", confirmText: "Supprimer", onConfirm: async () => { await deleteFaultType(b.dataset.id); showNotification("Panne supprimée", "success"); loadFaultTypesList(); } });
  }));
}

function showFaultTypeDetails(f) {
  if (!f) return;
  showPopup({
    title: f.name, icon: "stethoscope", confirmText: "Modifier", cancelText: "Fermer", onConfirm: () => { setTimeout(() => showFaultTypeForm(f), 0); },
    message: `<div class="detail-list"><div class="detail-row"><span>Catégorie</span><strong>${esc(FAULT_CATEGORIES[f.category] || "-")}</strong></div><div class="detail-row"><span>Moteur concerné</span><strong>${esc(FAULT_MOTOR_LABELS[f.motorType] || "-")}</strong></div>${f.description ? `<div class="detail-row"><span>Description</span><strong>${esc(f.description)}</strong></div>` : ""}</div><h5 class="popup-subtitle">Diagnostic (${f.diagnostic?.length || 0} test${f.diagnostic?.length > 1 ? "s" : ""})</h5>${diagnosticListHtml(f.diagnostic)}`,
  });
}

function diagRowHtml(d = {}) {
  return `<div class="diag-row"><span class="diag-num"></span><div class="diag-fields"><input type="text" class="dg-title" placeholder="Test à effectuer (ex. Mesurer l'isolement)" value="${esc(d.title || "")}"><input type="text" class="dg-expected" placeholder="Résultat attendu (ex. supérieur à 1 MΩ)" value="${esc(d.expected || "")}"></div><button type="button" class="action-btn dg-del" title="Retirer ce test" aria-label="Retirer ce test"><i class="fas fa-times"></i></button></div>`;
}

// Création (f absent) et modification d'un type de panne avec son diagnostic
function showFaultTypeForm(f) {
  const editing = !!f; f = f || {};
  const opt = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${v}</option>`).join("");
  const rows = (f.diagnostic?.length ? f.diagnostic : [{}, {}]).map(diagRowHtml).join("");
  showPopup({
    title: editing ? "Modifier la panne" : "Nouvelle panne", icon: editing ? "pen" : "stethoscope", confirmText: editing ? "Enregistrer" : "Créer la panne",
    message: `<div class="ft-form">
      <div class="form-field"><label for="ftName">Nom de la panne *</label><input id="ftName" type="text" placeholder="Ex. Moteur qui ne démarre pas" value="${esc(f.name || "")}"></div>
      <div class="form-row"><div class="form-field"><label for="ftCategory">Catégorie</label><select id="ftCategory">${opt(FAULT_CATEGORIES, f.category || "electrical")}</select></div>
      <div class="form-field"><label for="ftMotor">Moteur concerné</label><select id="ftMotor">${opt(FAULT_MOTOR_LABELS, f.motorType || "all")}</select></div></div>
      <div class="form-field"><label for="ftDesc">Description (symptômes)</label><textarea id="ftDesc" rows="2" placeholder="Symptômes observés, causes fréquentes…">${esc(f.description || "")}</textarea></div>
      <h5 class="popup-subtitle">Diagnostic à effectuer</h5>
      <div id="diagRows" class="diag-rows">${rows}</div>
      <button type="button" class="cyber-button secondary small" id="addDiagRow"><i class="fas fa-plus"></i> Ajouter un test</button>
    </div>`,
    onConfirm: async () => {
      const name = document.getElementById("ftName").value.trim();
      const diagnostic = [...document.querySelectorAll("#diagRows .diag-row")].map((r) => ({ id: "d_" + Math.random().toString(36).slice(2, 9), title: r.querySelector(".dg-title").value.trim(), expected: r.querySelector(".dg-expected").value.trim() })).filter((d) => d.title);
      if (!name) { showNotification("Le nom de la panne est obligatoire", "warning"); return false; }
      if (!diagnostic.length) { showNotification("Ajoutez au moins un test de diagnostic", "warning"); return false; }
      const data = { name, category: document.getElementById("ftCategory").value, motorType: document.getElementById("ftMotor").value, description: document.getElementById("ftDesc").value.trim(), diagnostic };
      if (editing) await updateFaultType(f.id, data); else await saveFaultType(data);
      showNotification(editing ? "Panne modifiée" : "Panne créée", "success");
      loadFaultTypesList();
    },
  });
  const box = document.getElementById("diagRows");
  const renumber = () => box.querySelectorAll(".diag-row").forEach((r, i) => { r.querySelector(".diag-num").textContent = i + 1; });
  renumber();
  document.getElementById("addDiagRow").addEventListener("click", () => { box.insertAdjacentHTML("beforeend", diagRowHtml()); renumber(); box.lastElementChild.querySelector(".dg-title").focus(); box.lastElementChild.scrollIntoView({ block: "nearest" }); });
  box.addEventListener("click", (e) => {
    const del = e.target.closest(".dg-del"); if (!del) return;
    if (box.querySelectorAll(".diag-row").length <= 1) { box.querySelector(".dg-title").value = ""; box.querySelector(".dg-expected").value = ""; return; }
    del.closest(".diag-row").remove(); renumber();
  });
}

async function loadAllMotors() {
  const filter = document.getElementById("motorFilterStatus")?.value || "all";
  let motors = await getMotors();
  if (filter !== "all") motors = motors.filter(m => m.status === filter);
  const c = document.getElementById("allMotorsList"); if (!c) return;
  c.innerHTML = `<table class="data-table"><thead><tr><th>Client</th><th>Type</th><th>Puissance</th><th>Statut</th><th>Progression</th><th>Actions</th></tr></thead><tbody>${motors.map(m => `<tr><td>${esc(m.clientName||"-")}</td><td>${motorTypeLabel(m, true)}</td><td>${m.power||"-"} kW</td><td><span class="motor-status status-${m.status}">${getStatusLabel(m.status)}</span></td><td>${m.steps?.filter(s=>s.validated).length||0}/${m.steps?.length||0}</td><td><button class="action-btn view" data-id="${m.id}"><i class="fas fa-eye"></i></button></td></tr>`).join('')}</tbody></table>`;
  c.querySelectorAll(".view").forEach(b => b.addEventListener("click", () => viewAdminMotorDetail(b.dataset.id)));
}

window.viewAdminMotorDetail = async function(motorId) {
  const motor = await getMotorById(motorId); if(!motor) return showNotification('Moteur non trouvé','error');
  showAdminView('motorDetail');
  document.getElementById('adminMotorDetailTitle').textContent = `DÉTAIL - ${motor.clientName||'Sans nom'}`;
  const content = document.getElementById('adminMotorDetailContent'); if(!content) return;
  let html = `<div class="motor-info-card"><p><strong>Client:</strong> ${motor.clientName||'-'} | <strong>Tél:</strong> ${motor.clientPhone||'-'}</p><p><strong>Technicien:</strong> ${motor.technicianName||'-'} (${motor.technicianEmail||'-'})</p><p><strong>Type:</strong> ${motorTypeLabel(motor)}${motor.templateCustom ? ` | <strong>Modèle:</strong> ${esc(motor.templateCustom)}` : ''} | <strong>Puissance:</strong> ${motor.power||'-'} kW</p><p><strong>Statut:</strong> <span class="motor-status status-${motor.status}">${getStatusLabel(motor.status)}</span></p><p><strong>Panne:</strong> ${motor.faultDescription||'-'}</p><p><strong>Créé:</strong> ${formatDate(motor.createdAt)} | <strong>MAJ:</strong> ${formatDate(motor.updatedAt)}</p></div><div class="steps-container">`;
  html += diagnosticSectionHtml(motor);
  motor.steps.forEach(step => {
    if (!step.substepsCompleted) step.substepsCompleted = new Array(step.substeps.length).fill(step.completed || false);
    html += `<div class="step-card ${step.validated?'validated':step.completed?'completed':''}"><div class="step-header"><h4>${step.name}</h4><div class="step-status">${step.validated?'<span class="badge success"><i class="fas fa-check-circle"></i> Validé</span>':step.completed?'<span class="badge warning"><i class="fas fa-clock"></i> En attente</span>':'<span class="badge">Non commencé</span>'}</div></div><div class="step-substeps">${step.substeps.map((sub,si) => `<label class="checkbox-label disabled"><input type="checkbox" ${step.substepsCompleted[si]?'checked':''} disabled><span>${sub}</span></label>`).join('')}</div>${step.completed&&!step.validated?`<button class="cyber-button small validate-step" data-motor-id="${motor.id}" data-step-id="${step.id}"><i class="fas fa-check"></i> Valider</button>`:''}${step.completedAt?`<small>Complété le ${formatDate(step.completedAt)}</small>`:''}${step.validatedAt?`<small>Validé le ${formatDate(step.validatedAt)}</small>`:''}</div>`;
  });
  html += `</div>`; content.innerHTML = html;
  content.querySelectorAll('.validate-step').forEach(btn => btn.addEventListener('click', function(e) { e.stopPropagation(); validateStep(this.dataset.motorId, this.dataset.stepId); }));
};

window.validateStep = async function(motorId, stepId) {
  const admin = getCurrentUser();
  showPopup({ title: "Valider étape", message: "Confirmer la validation ?", icon: "check-circle", onConfirm: async () => { await validateMotorStep(motorId, stepId, admin.id); showNotification("Étape validée", "success"); viewAdminMotorDetail(motorId); loadAdminStats(); } });
};

async function loadCompletedMotors() {
  const motors = (await getMotors()).filter(m => m.status === 'completed');
  const tbody = document.getElementById('completedMotorsList');
  document.getElementById('totalCompletedMotors').textContent = motors.length;
  const now = new Date();
  document.getElementById('completedThisMonth').textContent = motors.filter(m => { const d = new Date(m.updatedAt?.toDate?.() || m.updatedAt || m.createdAt?.toDate?.() || m.createdAt); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); }).length;
  let td = 0; motors.forEach(m => { if(m.createdAt && (m.updatedAt||m.completedAt)) { const s=new Date(m.createdAt.toDate?.()||m.createdAt), e=new Date((m.updatedAt||m.completedAt).toDate?.()||(m.updatedAt||m.completedAt)); td+=Math.ceil((e-s)/(1000*60*60*24)); } });
  document.getElementById('avgCompletionTime').textContent = motors.length>0?Math.round(td/motors.length):0;
  if(!motors.length){ tbody.innerHTML='<tr><td colspan="8">Aucun moteur terminé</td></tr>'; return; }
  tbody.innerHTML = motors.map(m => { const sd=new Date(m.createdAt.toDate?.()||m.createdAt), ed=new Date((m.updatedAt||m.completedAt).toDate?.()||(m.updatedAt||m.completedAt)); const dd=Math.ceil((ed-sd)/(1000*60*60*24)); return `<tr><td><strong>${esc(m.clientName||'-')}</strong><br><small>${esc(m.clientCompany||'')}</small></td><td>${esc(m.technicianName||'-')}</td><td>${motorTypeLabel(m)}</td><td>${m.power||'-'} kW</td><td>${sd.toLocaleDateString('fr-FR')}</td><td>${ed.toLocaleDateString('fr-FR')}</td><td><span class="badge success">${dd} jours</span></td><td><button class="action-btn view-comp" data-id="${m.id}"><i class="fas fa-eye"></i></button><button class="action-btn print-motor" data-id="${m.id}"><i class="fas fa-print"></i></button></td></tr>`; }).join('');
  tbody.querySelectorAll('.view-comp').forEach(b=>b.addEventListener('click',()=>viewAdminMotorDetail(b.dataset.id)));
  tbody.querySelectorAll('.print-motor').forEach(b=>b.addEventListener('click',async(e)=>{ e.stopPropagation(); const motor=await getMotorById(b.dataset.id); if(motor) printMotorPDF(motor); }));
}

// === PDF ===
function printMotorPDF(motor) {
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDF) { showNotification('Module PDF non disponible', 'error'); return; }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight(), margin = 15, usableWidth = pageWidth - (2 * margin);
  let yPos = 25;
  doc.setFontSize(22); doc.setTextColor(37, 99, 235); doc.text('FORTICO REWIND', pageWidth / 2, yPos, { align: 'center' }); yPos += 12;
  doc.setFontSize(14); doc.setTextColor(30, 41, 59); doc.text('FICHE TECHNIQUE MOTEUR', pageWidth / 2, yPos, { align: 'center' }); yPos += 8;
  doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' }); yPos += 12;
  doc.setDrawColor(200, 200, 200); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 15;
  doc.setFontSize(12); doc.setTextColor(37, 99, 235); doc.text('INFORMATIONS CLIENT', margin, yPos); yPos += 10;
  doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  doc.text(`Client : ${motor.clientName || '-'}`, margin, yPos); yPos += 7;
  doc.text(`Téléphone : ${motor.clientPhone || '-'}`, margin, yPos); yPos += 7;
  doc.text(`Entreprise : ${motor.clientCompany || '-'}`, margin, yPos); yPos += 7;
  doc.text(`Adresse : ${motor.clientAddress || '-'}`, margin, yPos); yPos += 7;
  doc.text(`Panne décrite :`, margin, yPos); yPos += 6;
  const faultLines = doc.splitTextToSize(motor.faultDescription || 'Aucune', usableWidth - 10);
  doc.text(faultLines, margin + 5, yPos); yPos += (faultLines.length * 5) + 10;
  doc.setFontSize(12); doc.setTextColor(37, 99, 235); doc.text('TECHNICIEN', margin, yPos); yPos += 10;
  doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  doc.text(`Nom : ${motor.technicianName || '-'}`, margin, yPos); yPos += 7;
  doc.text(`Email : ${motor.technicianEmail || '-'}`, margin, yPos); yPos += 7;
  doc.text(`Entreprise : ${motor.technicianCompany || '-'}`, margin, yPos); yPos += 15;
  doc.setDrawColor(200, 200, 200); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 12;
  doc.setFontSize(12); doc.setTextColor(37, 99, 235); doc.text('CARACTÉRISTIQUES', margin, yPos); yPos += 10;
  doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  const specs = [`Type : ${motorTypeLabel(motor, false, true)}`,`Puissance : ${motor.power||'-'} kW`,`Tension : ${motor.voltage||'-'} V`,`Courant : ${motor.current||'-'} A`,`Fréquence : ${motor.frequency||'-'} Hz`,`Vitesse : ${motor.rpm||'-'} RPM`,`Cos φ : ${motor.powerFactor||'-'}`,`Classe : ${motor.insulationClass||'-'}`,`Couplage : ${motor.couplingType==='star'?'Étoile':motor.couplingType==='delta'?'Triangle':'-'}`,`Pôles : ${motor.poles||'-'}`];
  specs.forEach((spec, i) => { const x=margin+(i%2)*(usableWidth/2), ly=yPos+Math.floor(i/2)*7; if(ly>pageHeight-30){doc.addPage();yPos=20;} doc.text(spec, x, yPos+Math.floor(i/2)*7); });
  yPos += Math.ceil(specs.length/2)*7+15;
  if(yPos>pageHeight-40){doc.addPage();yPos=20;}
  const sd=motor.createdAt?new Date(motor.createdAt.toDate?.()||motor.createdAt).toLocaleDateString('fr-FR'):'-', ed=(motor.updatedAt||motor.completedAt)?new Date((motor.updatedAt||motor.completedAt).toDate?.()||(motor.updatedAt||motor.completedAt)).toLocaleDateString('fr-FR'):'-';
  let dd='-'; if(motor.createdAt&&(motor.updatedAt||motor.completedAt)){const s=new Date(motor.createdAt.toDate?.()||motor.createdAt),e=new Date((motor.updatedAt||motor.completedAt).toDate?.()||(motor.updatedAt||motor.completedAt)); dd=Math.ceil((e-s)/(1000*60*60*24));}
  doc.setFontSize(10); doc.setTextColor(100,116,139); doc.text(`Créé : ${sd}`,margin,yPos); doc.text(`Fin : ${ed}`,margin+100,yPos); yPos+=8; doc.text(`Durée : ${dd} ${typeof dd==='number'?'jours':''}`,margin,yPos);
  const pc=doc.internal.getNumberOfPages(); for(let i=1;i<=pc;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(148,163,184);doc.text(`Page ${i}/${pc}`,pageWidth/2,pageHeight-10,{align:'center'});}
  doc.save(`fiche_${motor.clientName||motor.id}.pdf`); showNotification('PDF généré','success');
}

async function exportCompletedPDF() {
  const motors = (await getMotors()).filter(m => m.status === 'completed');
  if (!motors.length) { showNotification('Aucun moteur terminé', 'warning'); return; }
  if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') { showNotification('Chargement PDF...', 'info'); const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; document.head.appendChild(s); await new Promise(r=>s.onload=r); }
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF; if (!jsPDF) { showNotification('Erreur PDF', 'error'); return; }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw=doc.internal.pageSize.getWidth(), ph=doc.internal.pageSize.getHeight(), m=20; let y=25;
  doc.setFontSize(22); doc.setTextColor(37,99,235); doc.text('FORTICO REWIND',pw/2,y,{align:'center'}); y+=12;
  doc.setFontSize(14); doc.setTextColor(30,41,59); doc.text('Moteurs terminés',pw/2,y,{align:'center'}); y+=8;
  doc.setFontSize(10); doc.setTextColor(100,116,139); doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`,pw/2,y,{align:'center'}); y+=15;
  const nm=new Date(), tm=nm.getMonth(), ty=nm.getFullYear(), thisMonth=Math.round(motors.filter(m=>{const d=new Date((m.updatedAt||m.completedAt||m.createdAt).toDate?.()||(m.updatedAt||m.completedAt||m.createdAt)); return d.getMonth()===tm&&d.getFullYear()===ty;}).length);
  let td=0,mc=0; motors.forEach(m=>{if(m.createdAt&&(m.updatedAt||m.completedAt)){const s=new Date(m.createdAt.toDate?.()||m.createdAt),e=new Date((m.updatedAt||m.completedAt).toDate?.()||(m.updatedAt||m.completedAt)); td+=Math.ceil((e-s)/(1000*60*60*24)); mc++;}});
  doc.setFontSize(11); doc.setTextColor(30,41,59); doc.text(`Total: ${motors.length} | Mois: ${thisMonth} | Moy: ${mc>0?Math.round(td/mc):0} jours`,m,y); y+=15;
  doc.setDrawColor(200,200,200); doc.line(m,y,pw-m,y); y+=12;
  motors.forEach((motor,i)=>{ if(y>ph-80){doc.addPage();y=25;}
    const sd=motor.createdAt?new Date(motor.createdAt.toDate?.()||motor.createdAt).toLocaleDateString('fr-FR'):'-', ed=(motor.updatedAt||motor.completedAt)?new Date((motor.updatedAt||motor.completedAt).toDate?.()||(motor.updatedAt||motor.completedAt)).toLocaleDateString('fr-FR'):'-';
    let dd='-'; if(motor.createdAt&&(motor.updatedAt||motor.completedAt)){const s=new Date(motor.createdAt.toDate?.()||motor.createdAt),e=new Date((motor.updatedAt||motor.completedAt).toDate?.()||(motor.updatedAt||motor.completedAt)); dd=Math.ceil((e-s)/(1000*60*60*24));}
    doc.setFontSize(12); doc.setTextColor(37,99,235); doc.text(`${i+1}. ${motor.clientName||'Inconnu'}`,m,y);
    doc.setFontSize(9); doc.setTextColor(255,255,255); doc.setFillColor(16,185,129); const dt=typeof dd==='number'?`${dd} jours`:'-', bw=doc.getTextWidth(dt)+10; doc.roundedRect(pw-m-bw,y-5,bw,7,3,3,'F'); doc.text(dt,pw-m-bw/2,y,{align:'center'}); y+=10;
    doc.setFontSize(10); doc.setTextColor(30,41,59);
    [`Client: ${motor.clientName||'-'}`,`Entreprise: ${motor.clientCompany||'-'}`,`Tél: ${motor.clientPhone||'-'}`,`Adresse: ${motor.clientAddress||'-'}`,`Tech: ${motor.technicianName||'-'}`,`Type: ${motorTypeLabel(motor, true, true)} | ${motor.power||'-'} kW | ${motor.voltage||'-'} V`,`Créé: ${sd} | Fin: ${ed}`].forEach(l=>{doc.text(l,m+5,y);y+=7;});
    if(motor.faultDescription){doc.text('Panne:',m+5,y);y+=6; doc.splitTextToSize(motor.faultDescription,pw-2*m-10).forEach(l=>{doc.text(l,m+10,y);y+=5;});} else {doc.text('Panne: -',m+5,y);y+=7;}
    y+=5; doc.setDrawColor(220,220,220); doc.line(m,y,pw-m,y); y+=12;
  });
  const pc=doc.internal.getNumberOfPages(); for(let i=1;i<=pc;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(148,163,184);doc.text(`Page ${i}/${pc}`,pw/2,ph-10,{align:'center'});}
  doc.save(`termines_${new Date().toISOString().split('T')[0]}.pdf`); showNotification('PDF exporté','success');
}

// === TYPES MOTEURS ===
async function loadMotorTypesList() {
  const types = await getMotorTypes(); const c = document.getElementById("motorTypesList"); if (!c) return;
  if (!types.length) { c.innerHTML = '<p style="padding:40px;">Aucun type</p>'; return; }
  c.innerHTML = `<table class="data-table"><thead><tr><th>Nom</th><th>Type</th><th>Puissance</th><th>Tension</th><th>Étapes</th><th>Actions</th></tr></thead><tbody>${types.map(t => `<tr><td>${esc(t.name)}</td><td>${t.motorType==="three_phase"?"Triphasé":"Monophasé"}</td><td>${t.power||"-"} kW</td><td>${t.voltage||"-"} V</td><td>${t.customSteps?.length||0} étapes</td><td><button class="action-btn view-type" data-id="${t.id}"><i class="fas fa-eye"></i></button><button class="action-btn edit-type" data-id="${t.id}"><i class="fas fa-edit"></i></button><button class="action-btn steps-type" data-id="${t.id}"><i class="fas fa-list-check"></i></button><button class="action-btn delete-type" data-id="${t.id}"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table>`;
  c.querySelectorAll(".view-type").forEach(b => b.addEventListener("click", () => viewMotorTypeDetails(b.dataset.id)));
  c.querySelectorAll(".edit-type").forEach(b => b.addEventListener("click", () => editMotorType(b.dataset.id)));
  c.querySelectorAll(".steps-type").forEach(b => b.addEventListener("click", () => manageTypeSteps(b.dataset.id)));
  c.querySelectorAll(".delete-type").forEach(b => b.addEventListener("click", () => deleteMotorTypeConfirm(b.dataset.id)));
}

window.viewMotorTypeDetails = async function(typeId) {
  const type = await getMotorTypeById(typeId); if (!type) return;
  let html = `<div><h4 class="popup-title-sm">${type.name}</h4>`;
  html += `<p>Type: ${type.motorType==="three_phase"?"Triphasé":"Monophasé"} | Puissance: ${type.power||"-"} kW | Tension: ${type.voltage||"-"} V</p>`;
  html += `<p>Courant: ${type.current||"-"} A | Fréquence: ${type.frequency||"-"} Hz | Vitesse: ${type.rpm||"-"} RPM</p>`;
  html += `<p>Cos φ: ${type.powerFactor||"-"} | Classe: ${type.insulationClass||"-"} | Couplage: ${type.couplingType||"-"} | Pôles: ${type.poles||"-"}</p>`;
  html += `<h5 class="popup-subtitle">Étapes (${type.customSteps?.length||0})</h5>`;
  if (type.customSteps?.length) type.customSteps.forEach((step,i) => html += `<div class="step-item"><strong>${i+1}. ${step.name}</strong><br><small>${step.substeps?.join(" • ")||""}</small></div>`);
  else html += "<p>Aucune étape</p>";
  html += "</div>";
  showPopup({ title: "Détails", message: html, icon: "info-circle", confirmText: "Fermer", cancelText: null });
};

window.editMotorType = async function(typeId) {
  const type = await getMotorTypeById(typeId); if (!type) return;
  const formHtml = `<div><div class="form-field"><label>Nom *</label><input id="editName" value="${type.name||''}"></div><div class="form-field"><label>Type *</label><select id="editMotorType"><option value="three_phase" ${type.motorType==='three_phase'?'selected':''}>Triphasé</option><option value="single_phase" ${type.motorType==='single_phase'?'selected':''}>Monophasé</option></select></div><div class="form-field"><label>Puissance (kW)</label><input id="editPower" value="${type.power||''}" type="number" step="0.01"></div><div class="form-field"><label>Tension (V)</label><input id="editVoltage" value="${type.voltage||''}" type="number"></div><div class="form-field"><label>Courant (A)</label><input id="editCurrent" value="${type.current||''}" type="number" step="0.1"></div><div class="form-field"><label>Fréquence (Hz)</label><input id="editFrequency" value="${type.frequency||''}" type="number"></div><div class="form-field"><label>Vitesse (RPM)</label><input id="editRpm" value="${type.rpm||''}" type="number"></div><div class="form-field"><label>Cos φ</label><input id="editPowerFactor" value="${type.powerFactor||''}" type="number" step="0.01"></div><div class="form-field"><label>Classe isolation</label><select id="editInsulation">${['','A','B','F','H'].map(v=>`<option ${type.insulationClass===v?'selected':''}>${v||'--'}</option>`).join('')}</select></div><div class="form-field"><label>Couplage</label><select id="editCoupling">${['','star','delta'].map(v=>`<option value="${v}" ${type.couplingType===v?'selected':''}>${v==='star'?'Étoile':v==='delta'?'Triangle':'--'}</option>`).join('')}</select></div><div class="form-field"><label>Pôles</label><input id="editPoles" value="${type.poles||''}" type="number"></div></div>`;
  showPopup({ title: "Modifier", message: formHtml, icon: "edit", confirmText: "Enregistrer", onConfirm: async () => {
    const name = document.getElementById("editName")?.value; if (!name) return showNotification("Nom requis", "error");
    await updateMotorType(typeId, { name, motorType: document.getElementById("editMotorType")?.value, power: document.getElementById("editPower")?.value, voltage: document.getElementById("editVoltage")?.value, current: document.getElementById("editCurrent")?.value, frequency: document.getElementById("editFrequency")?.value, rpm: document.getElementById("editRpm")?.value, powerFactor: document.getElementById("editPowerFactor")?.value, insulationClass: document.getElementById("editInsulation")?.value, couplingType: document.getElementById("editCoupling")?.value, poles: document.getElementById("editPoles")?.value });
    showNotification("Modifié", "success"); loadMotorTypesList(); loadMotorTemplates();
  }});
};

window.manageTypeSteps = async function(typeId) {
  const type = await getMotorTypeById(typeId); if (!type) return;
  let stepsHtml = `<div><h4>${type.name}</h4>`;
  if (type.customSteps?.length) type.customSteps.forEach(step => stepsHtml += `<div class="step-item step-item-row"><div><strong>${step.name}</strong><br><small>${step.substeps?.length||0} sous-étapes</small></div><div><button class="action-btn edit-step" data-type="${typeId}" data-step="${step.id}"><i class="fas fa-edit"></i></button><button class="action-btn delete-step" data-type="${typeId}" data-step="${step.id}"><i class="fas fa-trash"></i></button></div></div>`);
  else stepsHtml += "<p>Aucune étape</p>";
  stepsHtml += `<button class="cyber-button small" id="addNewStepBtn" style="margin-top:15px;"><i class="fas fa-plus"></i> Nouvelle étape</button></div>`;
  showPopup({ title: "Gérer étapes", message: stepsHtml, icon: "list", confirmText: "Fermer", cancelText: null });
  setTimeout(() => {
    document.getElementById("addNewStepBtn")?.addEventListener("click", () => showAddStepForm(typeId));
    document.querySelectorAll(".edit-step").forEach(b => b.addEventListener("click", () => showEditStepForm(b.dataset.type, b.dataset.step)));
    document.querySelectorAll(".delete-step").forEach(b => b.addEventListener("click", () => showPopup({ title:"Supprimer", message:"Supprimer cette étape ?", icon:"trash", confirmText:"Supprimer", onConfirm: async () => { await deleteStepFromMotorType(b.dataset.type, b.dataset.step); showNotification("Supprimée","success"); manageTypeSteps(typeId); loadMotorTypesList(); }})));
  }, 100);
};

function showAddStepForm(typeId) {
  showPopup({ title:"Nouvelle étape", message:`<div class="form-field"><label>Nom</label><input id="stepName" placeholder="Ex: DIAGNOSTIC"></div><div class="form-field"><label>Sous-étapes (une par ligne)</label><textarea id="stepSubsteps" rows="5" placeholder="Identifier type&#10;Vérifier panne"></textarea></div>`, icon:"plus", confirmText:"Ajouter", onConfirm: async () => {
    const name=document.getElementById("stepName")?.value; if(!name) return showNotification("Nom requis","error");
    const substeps=document.getElementById("stepSubsteps")?.value.split("\n").filter(s=>s.trim());
    await addStepToMotorType(typeId,{name,substeps}); showNotification("Ajoutée","success"); manageTypeSteps(typeId); loadMotorTypesList();
  }});
}

function showEditStepForm(typeId, stepId) {
  getMotorTypeById(typeId).then(type => {
    const step=type?.customSteps?.find(s=>s.id===stepId); if(!step) return;
    showPopup({ title:"Modifier", message:`<div class="form-field"><label>Nom</label><input id="editStepName" value="${step.name}"></div><div class="form-field"><label>Sous-étapes</label><textarea id="editStepSubsteps" rows="5">${step.substeps?.join("\n")||""}</textarea></div>`, icon:"edit", confirmText:"Enregistrer", onConfirm: async () => {
      const name=document.getElementById("editStepName")?.value; if(!name) return showNotification("Nom requis","error");
      const substeps=document.getElementById("editStepSubsteps")?.value.split("\n").filter(s=>s.trim());
      await updateStepInMotorType(typeId,stepId,{name,substeps}); showNotification("Modifiée","success"); manageTypeSteps(typeId); loadMotorTypesList();
    }});
  });
}

function showAddMotorTypeForm() {
  showPopup({ title:"Nouveau type", message:`<div><div class="form-field"><label>Nom *</label><input id="popName"></div><div class="form-field"><label>Type *</label><select id="popType"><option value="three_phase">Triphasé</option><option value="single_phase">Monophasé</option></select></div><div class="form-field"><label>Puissance (kW)</label><input id="popPower" type="number" step="0.01"></div><div class="form-field"><label>Tension (V)</label><input id="popVoltage" type="number"></div><div class="form-field"><label>Courant (A)</label><input id="popCurrent" type="number" step="0.1"></div><div class="form-field"><label>Fréquence (Hz)</label><input id="popFreq" type="number"></div><div class="form-field"><label>Vitesse (RPM)</label><input id="popRpm" type="number"></div><div class="form-field"><label>Cos φ</label><input id="popPf" type="number" step="0.01"></div><div class="form-field"><label>Classe isolation</label><select id="popIns"><option value="">--</option><option>A</option><option>B</option><option>F</option><option>H</option></select></div><div class="form-field"><label>Couplage</label><select id="popCoup"><option value="">--</option><option value="star">Étoile</option><option value="delta">Triangle</option></select></div><div class="form-field"><label>Pôles</label><input id="popPoles" type="number"></div></div>`, icon:"plus-circle", confirmText:"Créer", onConfirm: async () => {
    const name=document.getElementById("popName")?.value; if(!name) return showNotification("Nom requis","error");
    await saveMotorType({name,motorType:document.getElementById("popType")?.value,power:document.getElementById("popPower")?.value,voltage:document.getElementById("popVoltage")?.value,current:document.getElementById("popCurrent")?.value,frequency:document.getElementById("popFreq")?.value,rpm:document.getElementById("popRpm")?.value,powerFactor:document.getElementById("popPf")?.value,insulationClass:document.getElementById("popIns")?.value,couplingType:document.getElementById("popCoup")?.value,poles:document.getElementById("popPoles")?.value});
    showNotification("Créé","success"); loadMotorTypesList(); loadMotorTemplates();
  }});
}

window.deleteMotorTypeConfirm = function(id) {
  showPopup({ title:"Supprimer", message:"Supprimer ce type ?", icon:"trash", confirmText:"Supprimer", onConfirm: async () => { await deleteMotorType(id); showNotification("Supprimé","success"); loadMotorTypesList(); loadMotorTemplates(); }});
};

function loadAdminProfile() { const a = getCurrentUser(); if (a) { document.getElementById("adminProfileName").value = a.name || ""; document.getElementById("adminProfileEmail").value = a.email || ""; } }

async function saveAdminProfile() {
  const a = getCurrentUser(); if (!a) return;
  const cp = document.getElementById("adminCurrentPassword").value, np = document.getElementById("adminNewPassword").value, conf = document.getElementById("adminConfirmNewPassword").value;
  if (np) { const fresh = await getUserByEmail(a.email); if (!fresh || cp !== fresh.password) return showNotification("Mot de passe actuel incorrect", "error"); if (np !== conf) return showNotification("Mots de passe différents", "error"); }
  const updates = { name: document.getElementById("adminProfileName").value, email: document.getElementById("adminProfileEmail").value };
  if (np) updates.password = np;
  const upd = await updateUser(a.id, updates);
  if (upd) { const { password, ...changes } = upd; updateCurrentUser(changes); showNotification("Profil mis à jour", "success"); setActiveNav("navAdminDashboard"); showAdminView("dashboard"); }
}
// === MESSAGES / DEMANDES DEVIS WEB ===
// === MESSAGES / DEMANDES DEVIS WEB ===
async function loadMessagesList() {
  const filter = document.getElementById('messageFilterStatus')?.value || 'all';
  const container = document.getElementById('messagesList');
  if (!container) return;
  
  try {
    // Importer dynamiquement les fonctions Firebase nécessaires
    const { getDocs, query, where, orderBy, collection, doc, updateDoc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    
    // Utiliser window.db
    const db = window.db;
    if (!db) {
      container.innerHTML = '<p style="text-align:center;padding:40px;">Base de données non connectée</p>';
      return;
    }
    
    let q;
    if (filter !== 'all') {
      q = query(collection(db, 'fortico_web_requests'), where('status', '==', filter), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'fortico_web_requests'), orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const messages = [];
    snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
    
    if (!messages.length) {
      container.innerHTML = '<p style="text-align:center;padding:40px;">Aucune demande de devis</p>';
      return;
    }
    
    container.innerHTML = `
      <div class="messages-cards">
        ${messages.map(msg => {
          const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt || Date.now());
          const dateStr = date.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
          const statusLabels = { new: 'Nouveau', read: 'Lu', replied: 'Répondu', archived: 'Archivé' };
          const statusColors = { new: 'warning', read: 'info', replied: 'success', archived: '' };
          
          return `
            <div class="message-card ${msg.status === 'new' ? 'unread' : ''}">
              <div class="message-card-header">
                <div>
                  <h4><i class="fas fa-user"></i> ${esc(msg.clientName || 'Inconnu')}</h4>
                  <p><i class="fas fa-envelope"></i> ${esc(msg.clientEmail || '-')} | <i class="fas fa-phone"></i> ${esc(msg.clientPhone || '-')}</p>
                  ${msg.clientCompany ? `<p><i class="fas fa-building"></i> ${esc(msg.clientCompany)}</p>` : ''}
                  ${msg.clientAddress ? `<p><i class="fas fa-map-marker-alt"></i> ${esc(msg.clientAddress)}</p>` : ''}
                </div>
                <span class="badge ${statusColors[msg.status] || ''}">${statusLabels[msg.status] || msg.status}</span>
              </div>
              <div class="message-card-body">
                <p><strong>Type moteur :</strong> ${msg.motorType === 'three_phase' ? 'Triphasé' : msg.motorType === 'single_phase' ? 'Monophasé' : '-'}</p>
                <p><strong>Puissance :</strong> ${esc(msg.power || '-')} kW | <strong>Tension :</strong> ${esc(msg.voltage || '-')} V</p>
                <p><strong>Courant :</strong> ${esc(msg.current || '-')} A | <strong>Fréquence :</strong> ${esc(msg.frequency || '-')} Hz</p>
                <p><strong>Vitesse :</strong> ${esc(msg.rpm || '-')} RPM | <strong>Cos φ :</strong> ${esc(msg.powerFactor || '-')}</p>
                <p><strong>Classe :</strong> ${esc(msg.insulationClass || '-')} | <strong>Couplage :</strong> ${msg.couplingType === 'star' ? 'Étoile' : msg.couplingType === 'delta' ? 'Triangle' : '-'}</p>
                <p><strong>Panne :</strong> ${esc(msg.description || '-')}</p>
                <p><strong>Date :</strong> ${dateStr}</p>
              </div>
              <div class="message-card-actions">
                ${msg.status === 'new' ? `<button class="cyber-button small" onclick="markMessageRead('${msg.id}')"><i class="fas fa-check"></i> Marquer lu</button>` : ''}
                ${msg.status === 'read' ? `<button class="cyber-button small success" onclick="markMessageReplied('${msg.id}')"><i class="fas fa-reply"></i> Marquer répondu</button>` : ''}
                ${msg.status !== 'archived' ? `<button class="cyber-button small" onclick="archiveMessage('${msg.id}')"><i class="fas fa-archive"></i> Archiver</button>` : ''}
                <a href="mailto:${esc(msg.clientEmail)}?subject=Fortico%20Rewind%20-%20Votre%20demande%20de%20devis&body=Bonjour%20${encodeURIComponent(msg.clientName || '')}%2C%0A%0ANous%20avons%20bien%20re%C3%A7u%20votre%20demande%20de%20devis.%0A%0ANotre%20%C3%A9quipe%20vous%20contactera%20dans%20les%20plus%20brefs%20d%C3%A9lais.%0A%0ACordialement%2C%0A%0AFortico%20Rewind" 
                   class="cyber-button small" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
                  <i class="fas fa-envelope"></i> Répondre
                </a>
                <a href="tel:${esc(msg.clientPhone)}" class="cyber-button small" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
                  <i class="fas fa-phone"></i> Appeler
                </a>
                <button class="action-btn delete-msg" data-id="${msg.id}" title="Supprimer">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    // Événements suppression
    container.querySelectorAll('.delete-msg').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        showPopup({
          title: 'Supprimer la demande',
          message: 'Voulez-vous vraiment supprimer cette demande de devis ?',
          icon: 'trash',
          confirmText: 'Supprimer',
          onConfirm: async () => {
            await deleteDoc(doc(db, 'fortico_web_requests', btn.dataset.id));
            showNotification('Demande supprimée', 'success');
            loadMessagesList();
          }
        });
      });
    });
    
  } catch (error) {
    console.error('Erreur loadMessagesList:', error);
    container.innerHTML = '<p style="text-align:center;padding:40px;">Erreur de chargement</p>';
  }
}

window.markMessageRead = async function(msgId) {
  const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  await updateDoc(doc(window.db, 'fortico_web_requests', msgId), { status: 'read' });
  showNotification('Demande marquée comme lue', 'success');
  loadMessagesList();
};

window.markMessageReplied = async function(msgId) {
  const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  await updateDoc(doc(window.db, 'fortico_web_requests', msgId), { status: 'replied' });
  showNotification('Demande marquée comme répondue', 'success');
  loadMessagesList();
};

window.archiveMessage = async function(msgId) {
  const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  await updateDoc(doc(window.db, 'fortico_web_requests', msgId), { status: 'archived' });
  showNotification('Demande archivée', 'success');
  loadMessagesList();
};



// === INIT ===
window.addEventListener("load", async () => {
  try {
    await initializeStorage();
  } catch(e) {
    console.warn('initializeStorage déjà appelé ou erreur:', e.message);
  }
  setTimeout(() => document.querySelector(".cyber-loader")?.classList.add("hidden"), 800);
});

console.log('🚀 App Firebase Fortico Rewind chargée');