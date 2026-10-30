import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import atelier from "../assets/images/atelier.jpg";
import hero from "../assets/images/hero.png";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { saveWebRequest } from "../lib/db";

const PHONE = "+33 1 23 45 67 89";
const PHONE_HREF = "tel:+33123456789";
const EMAIL = "contact@forticorewind.com";
const ADDRESS = "123 Avenue de l'Industrie, Paris";
const DARK_KEY = "fortico_dark_mode";

const SECTIONS = [
  ["home", "Accueil"],
  ["services", "Services"],
  ["why-us", "Pourquoi nous"],
  ["request", "Devis"],
  ["contact", "Contact"],
] as const;

const SERVICES = [
  ["search", "Diagnostic Gratuit", "Analyse complète de votre moteur sans engagement."],
  ["tools", "Rebobinage", "Triphasé, monophasé, haute tension. Fil de cuivre premium."],
  ["balance-scale", "Équilibrage", "Équilibrage dynamique de précision."],
  ["shield-alt", "Vernissage", "Imprégnation sous vide pour isolation parfaite."],
  ["tachometer-alt", "Contrôle Qualité", "Tests rigoureux : isolement, vibration, intensité."],
  ["truck", "Maintenance", "Programmes préventifs personnalisés."],
];

const STATS = [
  ["industry", "15+", "Années d'expérience"],
  ["cogs", "5000+", "Moteurs réparés"],
  ["smile", "98%", "Clients satisfaits"],
  ["clock", "48h", "Intervention"],
];

const WHY = [
  ["Expertise reconnue", "Plus de 15 ans d'expérience."],
  ["Économie garantie", "Jusqu'à 60% d'économie."],
  ["Intervention rapide", "Diagnostic sous 24h, intervention 48h."],
  ["Garantie 1 an", "Pièces et main d'œuvre."],
];

// Les ancres classiques (#services) entreraient en conflit avec le routeur : on fait défiler en JS.
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
}

type RevealFrom = "up" | "left" | "right" | "zoom";
const HIDDEN: Record<RevealFrom, string> = { up: "translate-y-10", left: "-translate-x-15", right: "translate-x-15", zoom: "scale-[0.85]" };

/** Apparition au défilement. */
function Reveal({ from = "up", delay = 0, className = "", children }: { from?: RevealFrom; delay?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { rootMargin: "0px 0px -100px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${shown ? "translate-none scale-100 opacity-100" : `opacity-0 ${HIDDEN[from]}`} ${className}`}>
      {children}
    </div>
  );
}

/** Légère inclinaison 3D au survol (souris uniquement, si les animations sont autorisées). */
const tiltEnabled = () => window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches;
const tilt = {
  onMouseMove(e: MouseEvent<HTMLElement>) {
    if (!tiltEnabled()) return;
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    card.style.transform = `perspective(1000px) rotateX(${(e.clientY - r.top - r.height / 2) / 20}deg) rotateY(${(r.width / 2 - (e.clientX - r.left)) / 20}deg) translateY(-8px)`;
  },
  onMouseLeave(e: MouseEvent<HTMLElement>) {
    e.currentTarget.style.transform = "";
  },
};

const EMPTY_REQUEST = { clientName: "", clientEmail: "", clientPhone: "", clientCompany: "", clientAddress: "", motorType: "", power: "", voltage: "", current: "", description: "" };

function RequestForm() {
  const notify = useToast();
  const [form, setForm] = useState(EMPTY_REQUEST);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY_REQUEST) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !e.currentTarget.reportValidity()) return;
    setBusy(true);
    try {
      await saveWebRequest({ ...form, frequency: "", rpm: "", insulationClass: "", couplingType: "" });
      notify("✅ Demande envoyée ! Réponse sous 24h.", "success");
      setForm(EMPTY_REQUEST);
    } catch {
      notify("❌ Erreur. Réessayez.", "error");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-md border border-[#e5e2da] bg-white px-4 py-3 text-[0.95rem] text-ink focus:border-primary focus:outline-none dark:border-[#30363d] dark:bg-[#2c313a] dark:text-[#e1e4e8]";
  const label = "mb-1.5 block text-[0.9rem] font-medium dark:text-[#8b949e]";
  const field = (k: keyof typeof EMPTY_REQUEST, text: string, props: Record<string, unknown> = {}, full = false) => (
    <div className={full ? "sm:col-span-2" : ""}>
      <label htmlFor={`req-${k}`} className={label}>
        {text}
      </label>
      <input id={`req-${k}`} className={input} value={form[k]} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} className="mx-auto max-w-[800px] rounded-2xl bg-white px-4 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.12)] sm:p-10 dark:bg-[#21252b]">
      <div className="grid gap-5 sm:grid-cols-2">
        {field("clientName", "Nom *", { required: true, autoComplete: "name" })}
        {field("clientEmail", "Email *", { type: "email", required: true, autoComplete: "email" })}
        {field("clientPhone", "Téléphone *", { type: "tel", required: true, autoComplete: "tel" })}
        {field("clientCompany", "Entreprise", { autoComplete: "organization" })}
        {field("clientAddress", "Adresse", {}, true)}
        <div>
          <label htmlFor="req-motorType" className={label}>
            Type de moteur *
          </label>
          <select id="req-motorType" required className={input} value={form.motorType} onChange={set("motorType")}>
            <option value="">Sélectionner</option>
            <option value="three_phase">Triphasé</option>
            <option value="single_phase">Monophasé</option>
          </select>
        </div>
        {field("power", "Puissance (kW)", { type: "number", step: "0.01" })}
        {field("voltage", "Tension (V)", { type: "number" })}
        {field("current", "Courant (A)", { type: "number", step: "0.1" })}
        <div className="sm:col-span-2">
          <label htmlFor="req-description" className={label}>
            Description de la panne *
          </label>
          <textarea id="req-description" required className={`${input} min-h-[100px] resize-y`} value={form.description} onChange={set("description")} />
        </div>
      </div>
      <button type="submit" disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-md bg-primary px-8 py-4 font-bold text-white transition hover:bg-primary-dark disabled:opacity-70">
        <Icon name={busy ? "spinner fa-spin" : "paper-plane"} /> {busy ? "Envoi..." : "Envoyer la demande"}
      </button>
    </form>
  );
}

function SectionHeader({ title, text }: { title: string; text: string }) {
  return (
    <Reveal className="mb-12 text-center">
      <h2 className="mb-3 text-[1.7rem] font-bold text-anthracite sm:text-[2.2rem] dark:text-[#e1e4e8]">{title}</h2>
      <p className="mx-auto max-w-[550px] text-ink-2 dark:text-[#8b949e]">{text}</p>
    </Reveal>
  );
}

export default function Site() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(DARK_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");

  useEffect(() => {
    try {
      localStorage.setItem(DARK_KEY, String(dark));
    } catch {
      /* ignore */
    }
    document.body.style.background = dark ? "#1a1d23" : "";
    return () => {
      document.body.style.background = "";
    };
  }, [dark]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50);
        const pos = window.scrollY + 120;
        for (const [id] of SECTIONS) {
          const el = document.getElementById(id);
          if (el && pos >= el.offsetTop && pos < el.offsetTop + el.offsetHeight) setActive(id);
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    setMenuOpen(false);
    scrollToSection(id);
  };

  const heroBtn = "inline-flex w-full items-center justify-center gap-2.5 rounded-md px-8 py-4 font-bold transition sm:w-auto";

  return (
    <div className={`overflow-x-clip text-ink ${dark ? "dark bg-[#1a1d23] text-[#e1e4e8]" : "bg-white"}`}>
      {/* Barre d'infos */}
      <div className="bg-anthracite py-2.5 text-[0.85rem] text-white/80 dark:bg-[#161b22]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-2.5 px-6 text-center sm:justify-between sm:text-left [&_i]:mr-1.5 [&_i]:text-primary">
          <span>
            <Icon name="map-marker-alt" /> {ADDRESS}
          </span>
          <span className="flex flex-wrap justify-center gap-x-4">
            <a href={PHONE_HREF} className="text-white hover:text-primary">
              <Icon name="phone" /> {PHONE}
            </a>
            <a href={`mailto:${EMAIL}`} className="text-white hover:text-primary">
              <Icon name="envelope" /> {EMAIL}
            </a>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`sticky top-0 z-[1000] border-b border-[#e5e2da] bg-white transition dark:border-[#30363d] dark:bg-[#21252b] ${scrolled ? "shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]" : ""}`}>
        <div className="mx-auto flex h-[70px] max-w-[1280px] items-center justify-between px-6">
          <button type="button" onClick={() => go("home")} className="flex items-center gap-2.5 text-2xl font-bold text-anthracite dark:text-[#e1e4e8]">
            <Icon name="bolt" className="text-[30px] text-primary" />
            Jeff <span className="text-primary">Elec</span>
          </button>
          <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen} aria-controls="site-links" className="flex flex-col gap-[5px] p-2.5 md:hidden">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-0.5 w-6 rounded bg-anthracite dark:bg-[#e1e4e8]" />
            ))}
          </button>
          <ul
            id="site-links"
            className={`fixed inset-x-0 top-[70px] flex-col items-center gap-7 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.12)] md:static md:flex md:flex-row md:bg-transparent md:p-0 md:shadow-none dark:bg-[#21252b] md:dark:bg-transparent ${menuOpen ? "flex" : "hidden"}`}
          >
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => go(id)}
                  className={`text-[0.95rem] transition hover:text-primary ${active === id ? "font-semibold text-primary" : "font-medium text-ink dark:text-[#8b949e]"}`}
                >
                  {label}
                </button>
              </li>
            ))}
            <li>
              <Link to="/" className="rounded-md bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark">
                Espace Client
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="scroll-mt-20 bg-cover bg-center px-4 py-16 text-center text-white sm:px-6 sm:py-[100px]" style={{ backgroundImage: `linear-gradient(rgba(28,31,35,0.88), rgba(28,31,35,0.85)), url(${hero})` }}>
        <div className="mx-auto max-w-[700px]">
          <h1 className="mb-5 animate-[rise_0.8s_ease_both] text-[2rem] leading-[1.15] font-extrabold sm:text-5xl">
            Rebobinage <span className="text-primary">Professionnel</span>
          </h1>
          <p className="mb-8 animate-[rise_0.8s_ease_0.2s_both] text-[1.15rem]">Expert en réparation de moteurs électriques depuis 2009. Diagnostic gratuit, intervention rapide en 48h, garantie 1 an.</p>
          <div className="flex animate-[rise_0.8s_ease_0.4s_both] flex-wrap justify-center gap-4">
            <button type="button" onClick={() => go("request")} className={`${heroBtn} bg-primary text-white hover:bg-primary-dark`}>
              <Icon name="paper-plane" /> Demander un devis
            </button>
            <button type="button" onClick={() => go("services")} className={`${heroBtn} border-2 border-white/50 font-semibold text-white hover:border-white hover:bg-white/10`}>
              <Icon name="cogs" /> Nos services
            </button>
          </div>
        </div>
      </section>

      {/* Chiffres clés */}
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="relative z-10 mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:-mt-[50px] lg:grid-cols-4">
          {STATS.map(([icon, value, label], i) => (
            <Reveal key={label} delay={i * 100}>
              <div {...tilt} className="rounded-2xl bg-white px-5 py-7 text-center shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:bg-[#21252b]">
                <Icon name={icon} className="mb-2.5 text-[32px] text-primary" />
                <h3 className="text-[2.2rem] font-extrabold text-anthracite dark:text-primary">{value}</h3>
                <p className="mt-1 font-medium text-ink-2 dark:text-[#8b949e]">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Services */}
      <section id="services" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeader title="Nos Services" text="Des solutions adaptées à tous vos besoins industriels" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(([icon, title, text], i) => (
              <Reveal key={title} delay={(i + 1) * 100}>
                <div {...tilt} className="group h-full rounded-2xl border border-[#e5e2da] bg-white p-8 text-center transition duration-300 hover:-translate-y-1.5 hover:border-primary hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:border-[#30363d] dark:bg-[#21252b]">
                  <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-primary/12 transition group-hover:bg-primary dark:bg-primary/18">
                    <Icon name={icon} className="text-[28px] text-primary transition group-hover:text-white" />
                  </div>
                  <h3 className="mb-2.5 text-[1.2rem] font-semibold dark:text-[#e1e4e8]">{title}</h3>
                  <p className="text-[0.9rem] text-ink-2 dark:text-[#8b949e]">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Bandeau */}
      <Reveal from="zoom">
        <div className="bg-primary px-6 py-12 text-center text-white dark:bg-primary-dark">
          <h2 className="mb-3 text-[2rem] font-bold">Économisez jusqu'à 60% par rapport au neuf</h2>
          <p className="mb-6 opacity-90">Demandez votre devis gratuit en ligne et obtenez une réponse sous 24h.</p>
          <button type="button" onClick={() => go("request")} className={`${heroBtn} bg-white text-primary hover:bg-[#f1f1f1]`}>
            <Icon name="paper-plane" /> Demander un devis gratuit
          </button>
        </div>
      </Reveal>

      {/* Pourquoi nous */}
      <section id="why-us" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 md:grid-cols-2">
          <Reveal from="left">
            <img src={atelier} alt="Atelier Jeff Elec" className="w-full rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.12)]" />
          </Reveal>
          <Reveal from="right">
            <h2 className="mb-5 text-[2rem] font-bold text-anthracite dark:text-[#e1e4e8]">Pourquoi nous choisir</h2>
            <ul>
              {WHY.map(([title, text]) => (
                <li key={title} className="flex gap-3 border-b border-[#e5e2da] py-4 dark:border-[#30363d]">
                  <Icon name="check-circle" className="mt-[3px] text-lg text-success" />
                  <div>
                    <strong className="mb-1 block dark:text-[#e1e4e8]">{title}</strong>
                    <span className="text-[0.9rem] text-ink-2 dark:text-[#8b949e]">{text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Devis */}
      <section id="request" className="scroll-mt-20 bg-canvas px-4 py-14 sm:px-6 sm:py-20 dark:bg-[#1a1d23]">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeader title="Demande de Devis" text="Remplissez le formulaire, réponse sous 24h" />
          <Reveal from="zoom">
            <RequestForm />
          </Reveal>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeader title="Contactez-nous" text="Une question ? Notre équipe est à votre écoute" />
          <div className="grid gap-12 md:grid-cols-2">
            <Reveal from="left">
              {[
                ["map-marker-alt", "Adresse", "123 Av. de l'Industrie, Paris"],
                ["phone", "Téléphone", <a href={PHONE_HREF}>{PHONE}</a>],
                ["envelope", "Email", <a href={`mailto:${EMAIL}`}>{EMAIL}</a>],
                ["clock", "Horaires", "Lun-Ven : 8h-18h | Sam : 8h-12h"],
              ].map(([icon, title, value]) => (
                <div key={title as string} className="mb-5 flex items-center gap-4 rounded-lg bg-[#f0eee8] p-4 dark:bg-[#21252b] [&_a]:font-medium [&_a]:text-primary">
                  <Icon name={icon as string} className="w-10 text-center text-2xl text-primary" />
                  <div>
                    <strong className="dark:text-[#e1e4e8]">{title}</strong>
                    <br />
                    {value}
                  </div>
                </div>
              ))}
            </Reveal>
            <Reveal from="right">
              <div className="min-h-[350px] overflow-hidden rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                <iframe
                  title="Plan d'accès"
                  className="block h-[350px] w-full border-0"
                  loading="lazy"
                  allowFullScreen
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2624.9916256937595!2d2.292292615674389!3d48.85837007928746!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e2964e34e2d%3A0x8ddca9ee380ef7e0!2sTour%20Eiffel!5e0!3m2!1sfr!2sfr!4v1680000000000!5m2!1sfr!2sfr"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="bg-anthracite px-6 pt-12 pb-5 text-white/80 dark:bg-[#161b22]">
        <div className="mx-auto grid max-w-[1280px] gap-10 md:grid-cols-[2fr_1fr_1fr_1fr] [&_h3]:mb-4 [&_h3]:text-[1.1rem] [&_h3]:text-white [&_.flink]:block [&_.flink]:text-left [&_.flink]:text-[0.9rem] [&_.flink]:leading-loose [&_.flink]:text-white/70 [&_.flink:hover]:text-primary">
          <div>
            <h3>
              <Icon name="bolt" /> Jeff Elec
            </h3>
            <p>Expert en rebobinage depuis 2009.</p>
            <div className="mt-3 flex gap-3">
              {[
                ["fab facebook-f", "Facebook"],
                ["fab linkedin-in", "LinkedIn"],
                ["fab whatsapp", "WhatsApp"],
              ].map(([icon, label]) => (
                <a key={label} href="#" onClick={(e) => e.preventDefault()} aria-label={label} className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-primary">
                  <Icon name={icon} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3>Services</h3>
            {["Diagnostic", "Rebobinage", "Équilibrage"].map((s) => (
              <button key={s} type="button" className="flink" onClick={() => go("services")}>
                {s}
              </button>
            ))}
          </div>
          <div>
            <h3>Liens</h3>
            {(["home", "services", "request"] as const).map((id) => (
              <button key={id} type="button" className="flink" onClick={() => go(id)}>
                {SECTIONS.find(([s]) => s === id)?.[1]}
              </button>
            ))}
          </div>
          <div>
            <h3>Contact</h3>
            <a className="flink" href={PHONE_HREF}>
              {PHONE}
            </a>
            <a className="flink" href={`mailto:${EMAIL}`}>
              Email
            </a>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-[1280px] border-t border-white/10 pt-5 text-center text-[0.85rem]">&copy; 2026 Jeff Elec. Tous droits réservés.</div>
      </footer>

      {/* Boutons flottants */}
      <button
        type="button"
        onClick={() => setDark((d) => !d)}
        title="Mode sombre / Mode clair"
        aria-label="Basculer le mode sombre"
        className="fixed right-5 bottom-40 z-[997] grid size-[46px] place-items-center rounded-full bg-anthracite text-lg text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition hover:scale-110 hover:bg-primary active:scale-90 md:right-2.5 md:bottom-[100px]"
      >
        <Icon name={dark ? "sun" : "moon"} />
      </button>
      <BackToTop />
    </div>
  );
}

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Retour en haut"
      className="fixed right-5 bottom-[100px] z-[997] grid size-[46px] place-items-center rounded-full bg-anthracite text-lg text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition hover:bg-primary md:right-[100px] md:bottom-[30px]"
    >
      <Icon name="chevron-up" />
    </button>
  );
}
