// ==========================================
// UI - Dropdown personnalisé (remplace tous les <select>)
// Le <select> natif reste dans le DOM (caché) : .value, "change",
// la validation et le remplissage dynamique des <option> continuent de marcher.
// ==========================================
(function () {
  'use strict';

  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const indexDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
  let uid = 0;
  let openDd = null;
  let openedAt = 0;

  function closeOpen(focusToggle) {
    if (!openDd) return;
    const d = openDd;
    openDd = null;
    d.menu.remove();
    d.wrap.classList.remove('open');
    d.toggle.setAttribute('aria-expanded', 'false');
    if (focusToggle) d.toggle.focus();
  }

  function enhance(select) {
    if (select.dataset.dd || select.multiple || select.size > 1) return;
    select.dataset.dd = '1';
    const id = 'dd' + ++uid;

    const wrap = document.createElement('div');
    wrap.className = 'dd' + (select.classList.contains('cyber-select') ? ' dd-inline' : '');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'dd-toggle';
    toggle.setAttribute('role', 'combobox');
    toggle.setAttribute('aria-haspopup', 'listbox');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', id);
    toggle.innerHTML = '<span class="dd-label"></span><i class="fas fa-chevron-down dd-caret" aria-hidden="true"></i>';
    const menu = document.createElement('ul');
    menu.className = 'dd-menu';
    menu.id = id;
    menu.setAttribute('role', 'listbox');

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    wrap.appendChild(toggle);
    select.classList.add('dd-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    // un <label for="..."> doit pouvoir focus le bouton
    if (select.id) {
      toggle.dataset.for = select.id;
      const lbl = document.querySelector('label[for="' + select.id + '"]');
      if (lbl) { if (!lbl.id) lbl.id = id + '-l'; toggle.setAttribute('aria-labelledby', lbl.id); }
    }

    const dd = { select, wrap, toggle, menu, active: -1, position: null };

    function options() { return Array.from(select.options); }

    function refresh() {
      const sel = select.options[select.selectedIndex];
      const label = dd.wrap.querySelector('.dd-label');
      label.textContent = sel ? sel.textContent.trim() : '';
      const isPlaceholder = !sel || sel.value === '';
      toggle.classList.toggle('placeholder', isPlaceholder);
      toggle.disabled = select.disabled;
      wrap.classList.toggle('disabled', select.disabled);
    }

    function build() {
      menu.innerHTML = '';
      const frag = document.createDocumentFragment();
      let group = null;
      options().forEach((opt, i) => {
        if (opt.parentElement.tagName === 'OPTGROUP' && opt.parentElement !== group) {
          group = opt.parentElement;
          const g = document.createElement('li');
          g.className = 'dd-group';
          g.setAttribute('role', 'presentation');
          g.textContent = group.label;
          frag.appendChild(g);
        }
        const li = document.createElement('li');
        li.className = 'dd-option' + (i === select.selectedIndex ? ' selected' : '') + (opt.disabled ? ' disabled' : '');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', i === select.selectedIndex);
        li.dataset.index = i;
        li.innerHTML = '<span></span><i class="fas fa-check" aria-hidden="true"></i>';
        li.firstChild.textContent = opt.textContent.trim() || ' ';
        if (opt.value === '') li.classList.add('empty');
        frag.appendChild(li);
      });
      menu.appendChild(frag);
    }

    function setActive(i, scroll) {
      const items = menu.querySelectorAll('.dd-option');
      items.forEach((li) => li.classList.remove('active'));
      dd.active = i;
      const li = menu.querySelector('.dd-option[data-index="' + i + '"]');
      if (li) {
        li.classList.add('active');
        toggle.setAttribute('aria-activedescendant', id + '-o' + i);
        li.id = id + '-o' + i;
        if (scroll) li.scrollIntoView({ block: 'nearest' });
      }
    }

    function position() {
      const r = toggle.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const menuH = Math.min(menu.scrollHeight, 280);
      const up = below < menuH + 12 && r.top > below;
      menu.style.minWidth = r.width + 'px';
      menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)) + 'px';
      menu.style.maxHeight = Math.max(120, Math.min(280, (up ? r.top : below) - 16)) + 'px';
      menu.classList.toggle('up', up);
      if (up) { menu.style.top = 'auto'; menu.style.bottom = (window.innerHeight - r.top + 6) + 'px'; }
      else { menu.style.bottom = 'auto'; menu.style.top = (r.bottom + 6) + 'px'; }
    }

    dd.position = position;

    function open() {
      if (select.disabled || openDd === dd) return;
      closeOpen();
      build();
      document.body.appendChild(menu);
      wrap.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      openDd = dd;
      openedAt = Date.now();
      position();
      setActive(select.selectedIndex, true);
    }

    function choose(i) {
      const opt = select.options[i];
      if (!opt || opt.disabled) return;
      const changed = select.selectedIndex !== i;
      indexDesc.set.call(select, i);
      refresh();
      closeOpen(true);
      if (changed) {
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    function move(delta) {
      const opts = options();
      let i = dd.active;
      do { i += delta; } while (i >= 0 && i < opts.length && opts[i].disabled);
      if (i >= 0 && i < opts.length) setActive(i, true);
    }

    toggle.addEventListener('click', () => (openDd === dd ? closeOpen() : open()));
    toggle.addEventListener('keydown', (e) => {
      const isOpen = openDd === dd;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) open(); else move(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) open(); else choose(dd.active);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeOpen(true);
      } else if (e.key === 'Home' && isOpen) { e.preventDefault(); setActive(0, true); }
      else if (e.key === 'End' && isOpen) { e.preventDefault(); setActive(select.options.length - 1, true); }
      else if (e.key === 'Tab' && isOpen) closeOpen();
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ch = e.key.toLowerCase();
        const opts = options();
        for (let k = 1; k <= opts.length; k++) {
          const i = (Math.max(select.selectedIndex, dd.active) + k) % opts.length;
          if (!opts[i].disabled && opts[i].textContent.trim().toLowerCase().startsWith(ch)) {
            if (isOpen) setActive(i, true); else choose(i);
            break;
          }
        }
      }
    });
    menu.addEventListener('mousedown', (e) => e.preventDefault()); // garde le focus sur le bouton
    menu.addEventListener('click', (e) => {
      const li = e.target.closest('.dd-option');
      if (li) choose(+li.dataset.index);
    });
    menu.addEventListener('mousemove', (e) => {
      const li = e.target.closest('.dd-option');
      if (li && +li.dataset.index !== dd.active) setActive(+li.dataset.index, false);
    });

    // Synchronisation quand le code fait select.value = ... / selectedIndex = ...
    Object.defineProperty(select, 'value', {
      configurable: true,
      get() { return valueDesc.get.call(this); },
      set(v) { valueDesc.set.call(this, v); refresh(); },
    });
    Object.defineProperty(select, 'selectedIndex', {
      configurable: true,
      get() { return indexDesc.get.call(this); },
      set(v) { indexDesc.set.call(this, v); refresh(); },
    });

    // Options ajoutées / modifiées dynamiquement, disabled
    new MutationObserver(() => { refresh(); if (openDd === dd) { build(); position(); } })
      .observe(select, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'selected'] });
    select.addEventListener('change', refresh);
    if (select.form) select.form.addEventListener('reset', () => setTimeout(refresh, 0));
    // validation native : afficher l'état invalide sur le bouton
    select.addEventListener('invalid', () => { toggle.classList.add('invalid'); toggle.focus(); });
    select.addEventListener('change', () => toggle.classList.remove('invalid'));

    refresh();
  }

  // ---- Mot de passe : bouton afficher / masquer ----
  function enhancePassword(input) {
    if (input.dataset.pw) return;
    input.dataset.pw = '1';
    const wrap = document.createElement('div');
    wrap.className = 'pw';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle';
    btn.setAttribute('aria-label', 'Afficher le mot de passe');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Afficher le mot de passe';
    btn.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i>';
    wrap.appendChild(btn);
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show);
      const label = show ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.firstChild.className = 'fas ' + (show ? 'fa-eye-slash' : 'fa-eye');
      input.focus();
    });
    // après un envoi/reset du formulaire, on repasse en masqué
    if (input.form) input.form.addEventListener('reset', () => {
      input.type = 'password';
      btn.setAttribute('aria-pressed', 'false');
      btn.firstChild.className = 'fas fa-eye';
    });
  }

  function scan(root) {
    const r = root.querySelectorAll ? root : document;
    r.querySelectorAll('select:not([data-dd])').forEach(enhance);
    r.querySelectorAll('input[type="password"]:not([data-pw])').forEach(enhancePassword);
  }

  document.addEventListener('mousedown', (e) => {
    if (openDd && !openDd.menu.contains(e.target) && !openDd.wrap.contains(e.target)) closeOpen();
  });
  window.addEventListener('resize', () => { if (openDd) openDd.position(); });
  window.addEventListener('scroll', (e) => {
    if (openDd && Date.now() - openedAt > 200 && !openDd.menu.contains(e.target)) closeOpen();
  }, true);

  function init() {
    scan(document);
    // selects créés plus tard (popups, vues injectées via innerHTML)
    new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'SELECT') enhance(n); else if (n.tagName === 'INPUT' && n.type === 'password') enhancePassword(n); else scan(n);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ---- Boutons : état "chargement" automatique ----
  // Tout listener click/submit (sur un bouton ou un formulaire) qui renvoie une Promise
  // met le bouton en chargement jusqu'à la fin, et bloque les doubles envois.
  function btnLoading(btn, on) {
    if (!btn || !btn.classList) return;
    if (on) {
      if (btn.classList.contains('is-loading')) return;
      btn.style.minWidth = btn.offsetWidth + 'px';
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
      btn.style.minWidth = '';
    }
  }
  window.btnLoading = btnLoading;

  const wrappers = new WeakMap();
  const nativeAdd = EventTarget.prototype.addEventListener;
  const nativeRemove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    const isBtn = this instanceof HTMLButtonElement;
    const isForm = this instanceof HTMLFormElement;
    if (typeof fn === 'function' && ((type === 'click' && isBtn) || (type === 'submit' && isForm))) {
      let w = wrappers.get(fn);
      if (!w) {
        w = function (e) {
          const btn = type === 'submit' ? (e.submitter || this.querySelector('button[type="submit"]')) : this;
          if (btn && btn.classList.contains('is-loading')) { e.preventDefault(); return; }
          const r = fn.call(this, e);
          if (r && typeof r.then === 'function') {
            btnLoading(btn, true);
            const done = () => btnLoading(btn, false);
            r.then(done, done);
          }
          return r;
        };
        wrappers.set(fn, w);
      }
      return nativeAdd.call(this, type, w, opts);
    }
    return nativeAdd.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) {
    return nativeRemove.call(this, type, (fn && wrappers.get(fn)) || fn, opts);
  };

  // Boutons avec onclick="maFonction('id')" (ex. rapports, messages) : on enveloppe la fonction à la volée
  let pendingBtn = null;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[onclick]');
    if (!b) return;
    pendingBtn = b;
    const m = /^\s*([A-Za-z_$][\w$]*)\s*\(/.exec(b.getAttribute('onclick'));
    const name = m && m[1];
    const fn = name && window[name];
    if (typeof fn === 'function' && !fn.__wrapped) {
      const wrapped = function () {
        const target = pendingBtn;
        const r = fn.apply(this, arguments);
        if (r && typeof r.then === 'function' && target) {
          btnLoading(target, true);
          const done = () => btnLoading(target, false);
          r.then(done, done);
        }
        return r;
      };
      wrapped.__wrapped = true;
      window[name] = wrapped;
    }
  }, true);

  // ---- Menu mobile : se referme après un clic sur un lien, en dehors, ou avec Échap ----
  function setNav(open) {
    const menu = document.getElementById('navMenu');
    const toggle = document.getElementById('navToggle');
    if (!menu) return;
    menu.classList.toggle('active', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open);
      toggle.classList.toggle('open', open);
    }
    document.body.classList.toggle('nav-open', open);
  }
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('navMenu');
    if (!menu || !menu.classList.contains('active')) return;
    if (e.target.closest('#navMenu a')) { setNav(false); window.scrollTo({ top: 0 }); }
    else if (!e.target.closest('#navToggle') && !menu.contains(e.target)) setNav(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1024) setNav(false); });
  // synchronise aria-expanded avec le bouton (le basculement lui-même est géré par app-firebase.js)
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#navToggle')) return;
    setTimeout(() => {
      const menu = document.getElementById('navMenu');
      const open = !!menu && menu.classList.contains('active');
      e.target.closest('#navToggle').setAttribute('aria-expanded', open);
      document.body.classList.toggle('nav-open', open);
    }, 0);
  });

  // Sécurité : le loader ne doit jamais bloquer la page si Firebase est lent ou injoignable
  window.addEventListener('load', () => setTimeout(() => {
    document.querySelector('.cyber-loader')?.classList.add('hidden');
  }, 2000));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
