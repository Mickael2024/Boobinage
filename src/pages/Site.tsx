import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import atelier from "../assets/images/atelier.jpg";
import hero from "../assets/images/hero.png";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Icon } from "../components/ui/Icon";
import { Logo } from "../components/ui/Logo";
import { Select } from "../components/ui/Select";
import { FOCUS_RING_DARK as RING_DARK } from "../components/ui/styles";
import { useToast } from "../components/ui/Toast";
import DEFAULT_BRAND, { brandFromSettings, phoneHref, type Brand } from "../lib/brand";
import { getCompanySettings, saveWebRequest } from "../lib/db";

const DARK_KEY = "jeffelec_dark_mode";

/** Valeurs dérivées de la marque (coordonnées lues dans settings/company, repli sur la marque par défaut). */
function brandView(BRAND: Brand) {
  const [BRAND_FIRST, ...BRAND_REST] = BRAND.name.split(" ");
  return {
    PHONE_HREF: phoneHref(BRAND.phone),
    BRAND_FIRST,
    BRAND_REST,
    // La carte n'est affichée que pour une URL « embed » Google Maps renseignée
    MAP_URL: BRAND.mapEmbedUrl && /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(BRAND.mapEmbedUrl) ? BRAND.mapEmbedUrl : "",
    SOCIALS: (
      [
        ["fab facebook-f", "Facebook", BRAND.socials.facebook],
        ["fab linkedin-in", "LinkedIn", BRAND.socials.linkedin],
        ["fab whatsapp", "WhatsApp", BRAND.socials.whatsapp],
      ] as const
    ).filter(([, , href]) => !!href?.trim()),
  };
}

const MOTOR_KINDS = [
  { value: "", label: "Sélectionner" },
  { value: "three_phase", label: "Triphasé" },
  { value: "single_phase", label: "Monophasé" },
];

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
  const [kindMissing, setKindMissing] = useState(false);
  const set = (k: keyof typeof EMPTY_REQUEST) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !e.currentTarget.reportValidity()) return;
    // la liste déroulante du design system n'est pas un <select> natif : validation manuelle
    if (!form.motorType) {
      setKindMissing(true);
      notify("Veuillez choisir le type de moteur.", "warning");
      document.getElementById("req-motorType")?.focus();
      return;
    }
    setBusy(true);
    try {
      await saveWebRequest({ ...form, frequency: "", rpm: "", insulationClass: "", couplingType: "" });
      notify("Demande envoyée. Réponse sous 24 h.", "success");
      setForm(EMPTY_REQUEST);
    } catch {
      notify("Erreur lors de l'envoi. Veuillez réessayer.", "error");
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof EMPTY_REQUEST, text: ReactNode, props: Record<string, unknown> = {}, full = false) => (
    <Field label={text} htmlFor={`req-${k}`} className={`mb-0 ${full ? "sm:col-span-2" : ""}`}>
      <input id={`req-${k}`} className="field-input" value={form[k]} onChange={set(k)} {...props} />
    </Field>
  );

  return (
    <form
      onSubmit={submit}
      aria-label="Demande de devis"
      className="mx-auto max-w-[800px] rounded-2xl bg-white px-4 py-6 shadow-float sm:p-10 dark:bg-dark-surface dark:[&_.field-input]:border-dark-line dark:[&_.field-input]:bg-dark-field dark:[&_.field-input]:text-dark-text dark:[&_.field-label]:text-dark-text dark:[&_[role=combobox]]:border-dark-line dark:[&_[role=combobox]]:bg-dark-field dark:[&_[role=combobox]_span]:text-dark-text"
    >
      <p className="mb-5 text-[0.85rem] text-ink-2 dark:text-dark-muted">Les champs marqués * sont obligatoires.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("clientName", "Nom *", { required: true, autoComplete: "name" })}
        {field("clientEmail", "Email *", { type: "email", required: true, autoComplete: "email" })}
        {field("clientPhone", "Téléphone *", { type: "tel", required: true, autoComplete: "tel" })}
        {field("clientCompany", "Entreprise", { autoComplete: "organization" })}
        {field("clientAddress", "Adresse", { autoComplete: "street-address" }, true)}
        <Field label="Type de moteur *" htmlFor="req-motorType" className="mb-0">
          <Select
            id="req-motorType"
            value={form.motorType}
            invalid={kindMissing && !form.motorType}
            onChange={(v) => {
              setKindMissing(false);
              setForm((f) => ({ ...f, motorType: v }));
            }}
            options={MOTOR_KINDS}
          />
        </Field>
        {field("power", <>Puissance <span className="normal-case">(kW)</span></>, { type: "number", step: "0.01", inputMode: "decimal", className: "field-input font-mono" })}
        {field("voltage", <>Tension <span className="normal-case">(V)</span></>, { type: "number", inputMode: "numeric", className: "field-input font-mono" })}
        {field("current", <>Courant <span className="normal-case">(A)</span></>, { type: "number", step: "0.1", inputMode: "decimal", className: "field-input font-mono" })}
        <Field label="Description de la panne *" htmlFor="req-description" className="mb-0 sm:col-span-2">
          <textarea id="req-description" required className="field-input min-h-[100px]" value={form.description} onChange={set("description")} />
        </Field>
      </div>
      <Button type="submit" block icon="paper-plane" loading={busy} className="mt-6 min-h-13 text-base">
        Envoyer la demande
      </Button>
    </form>
  );
}

function SectionHeader({ title, text }: { title: string; text: string }) {
  return (
    <Reveal className="mb-12 text-center">
      <h2 className="mb-3 text-[1.7rem] font-bold text-anthracite sm:text-[2.2rem] dark:text-dark-text">{title}</h2>
      <p className="mx-auto max-w-[550px] text-ink-2 dark:text-dark-muted">{text}</p>
    </Reveal>
  );
}

export default function Site() {
  // coordonnées saisies dans les paramètres entreprise ; marque par défaut si hors ligne / erreur
  const [BRAND, setBrand] = useState<Brand>(DEFAULT_BRAND);
  useEffect(() => {
    let alive = true;
    getCompanySettings()
      .then((settings) => alive && setBrand(brandFromSettings(settings)))
      .catch((e) => console.warn("Paramètres entreprise indisponibles, coordonnées par défaut :", e));
    return () => {
      alive = false;
    };
  }, []);
  const { PHONE_HREF, BRAND_FIRST, BRAND_REST, MAP_URL, SOCIALS } = brandView(BRAND);
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
    document.body.style.background = dark ? "var(--color-dark-bg)" : "";
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

  const heroBase = "inline-flex w-full items-center justify-center gap-2.5 rounded-md px-8 py-4 font-bold transition sm:w-auto";
  const heroBtn = `${heroBase} ${RING_DARK}`;
  const year = new Date().getFullYear();

  const contactCards: [string, string, ReactNode][] = [
    ["map-marker-alt", "Adresse", BRAND.address],
    ["phone", "Téléphone", <a href={PHONE_HREF}>{BRAND.phone}</a>],
    ["envelope", "Email", <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>],
    ["clock", "Horaires", BRAND.openingHours],
  ];

  return (
    <div className={`overflow-x-clip text-ink ${dark ? "dark bg-dark-bg text-dark-text" : "bg-white"}`}>
      <a href="#request" onClick={(e) => (e.preventDefault(), go("request"))} className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-ink focus:shadow-pop">
        Aller au formulaire de devis
      </a>

      {/* Barre d'infos */}
      <div className="on-dark bg-anthracite py-2.5 text-[0.85rem] text-fog-light dark:bg-dark-deep">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-2.5 px-6 text-center sm:justify-between sm:text-left [&_i]:mr-1.5 [&_i]:text-primary">
          <span>
            <Icon name="map-marker-alt" /> {BRAND.address}
          </span>
          <span className="flex flex-wrap justify-center gap-x-4">
            <a href={PHONE_HREF} className="rounded-sm text-white hover:text-primary-light">
              <Icon name="phone" /> {BRAND.phone}
            </a>
            <a href={`mailto:${BRAND.email}`} className="rounded-sm text-white hover:text-primary-light">
              <Icon name="envelope" /> {BRAND.email}
            </a>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Navigation principale" className={`sticky top-0 z-[1000] border-b border-line bg-white transition dark:border-dark-line dark:bg-dark-surface ${scrolled ? "shadow-float dark:shadow-float-dark" : ""}`}>
        <div className="mx-auto flex h-[70px] max-w-[1280px] items-center justify-between px-6">
          <button type="button" onClick={() => go("home")} aria-label={`${BRAND.name} — retour en haut`} className="flex items-center gap-2.5 rounded-md text-2xl font-bold text-anthracite dark:text-dark-text">
            <Logo size={36} />
            <span>
              {BRAND_FIRST} <span className="text-primary-dark dark:text-primary">{BRAND_REST.join(" ")}</span>
            </span>
          </button>
          <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen} aria-controls="site-links" className="flex flex-col gap-[5px] rounded-md p-2.5 md:hidden">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-0.5 w-6 rounded bg-anthracite dark:bg-dark-text" />
            ))}
          </button>
          <ul
            id="site-links"
            className={`fixed inset-x-0 top-[70px] flex-col items-center gap-7 bg-white p-5 shadow-float md:static md:flex md:flex-row md:bg-transparent md:p-0 md:shadow-none dark:bg-dark-surface md:dark:bg-transparent ${menuOpen ? "flex" : "hidden"}`}
          >
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active === id ? "true" : undefined}
                  className={`rounded-sm text-[0.95rem] transition hover:text-primary-dark dark:hover:text-primary ${active === id ? "font-semibold text-primary-dark dark:text-primary" : "font-medium text-ink dark:text-dark-muted"}`}
                >
                  {label}
                </button>
              </li>
            ))}
            <li>
              <Link to="/" className="inline-flex items-center gap-2 rounded-md border border-primary-border bg-primary px-6 py-3 font-semibold text-on-primary transition hover:bg-primary-light">
                <Icon name="user-gear" /> Espace équipe
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <section
        id="home"
        className="on-dark scroll-mt-20 bg-cover bg-center px-4 py-16 text-center text-white sm:px-6 sm:py-[100px]"
        style={{ backgroundImage: `linear-gradient(color-mix(in srgb, var(--color-night) 88%, transparent), color-mix(in srgb, var(--color-night) 85%, transparent)), url(${hero})` }}
      >
        <div className="mx-auto max-w-[700px]">
          <h1 className="mb-5 animate-[rise_0.8s_ease_both] text-[2rem] leading-[1.15] font-extrabold sm:text-5xl">
            Rebobinage <span className="text-primary">Professionnel</span>
          </h1>
          <p className="mb-8 animate-[rise_0.8s_ease_0.2s_both] text-[1.15rem]">Expert en réparation de moteurs électriques depuis {BRAND.since}. Diagnostic gratuit, intervention rapide en 48 h, garantie 1 an.</p>
          <div className="flex animate-[rise_0.8s_ease_0.4s_both] flex-wrap justify-center gap-4">
            <button type="button" onClick={() => go("request")} className={`${heroBtn} bg-primary text-on-primary hover:bg-primary-light`}>
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
              <div {...tilt} className="rounded-2xl bg-white px-5 py-7 text-center shadow-float transition duration-300 hover:-translate-y-2 hover:shadow-float-lg dark:bg-dark-surface">
                <Icon name={icon} className="mb-2.5 text-[32px] text-primary" />
                <p className="font-mono text-[2.2rem] leading-tight font-extrabold text-anthracite tabular-nums dark:text-primary">{value}</p>
                <p className="mt-1 font-medium text-ink-2 dark:text-dark-muted">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Services */}
      <section id="services" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeader title="Nos services" text="Des solutions adaptées à tous vos besoins industriels" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(([icon, title, text], i) => (
              <Reveal key={title} delay={(i + 1) * 100}>
                <div {...tilt} className="group h-full rounded-2xl border border-line bg-white p-8 text-center transition duration-300 hover:-translate-y-1.5 hover:border-primary hover:shadow-float dark:border-dark-line dark:bg-dark-surface">
                  <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-primary/12 transition group-hover:bg-primary dark:bg-primary/18">
                    <Icon name={icon} className="text-[28px] text-primary-dark transition group-hover:text-on-primary dark:text-primary" />
                  </div>
                  <h3 className="mb-2.5 text-[1.2rem] font-semibold dark:text-dark-text">{title}</h3>
                  <p className="text-[0.9rem] text-ink-2 dark:text-dark-muted">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Bandeau */}
      <Reveal from="zoom">
        <div className="bg-primary px-6 py-12 text-center text-on-primary">
          <h2 className="mb-3 text-[2rem] font-bold">Économisez jusqu'à 60 % par rapport au neuf</h2>
          <p className="mb-6">Demandez votre devis gratuit en ligne et obtenez une réponse sous 24 h.</p>
          <button type="button" onClick={() => go("request")} className={`${heroBase} bg-night text-white hover:bg-anthracite-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night focus-visible:ring-offset-2 focus-visible:ring-offset-primary`}>
            <Icon name="paper-plane" /> Demander un devis gratuit
          </button>
        </div>
      </Reveal>

      {/* Pourquoi nous */}
      <section id="why-us" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 md:grid-cols-2">
          <Reveal from="left">
            <img src={atelier} alt={`Atelier ${BRAND.name}`} className="w-full rounded-2xl shadow-float" />
          </Reveal>
          <Reveal from="right">
            <h2 className="mb-5 text-[2rem] font-bold text-anthracite dark:text-dark-text">Pourquoi nous choisir</h2>
            <ul>
              {WHY.map(([title, text]) => (
                <li key={title} className="flex gap-3 border-b border-line py-4 dark:border-dark-line">
                  <Icon name="check-circle" className="mt-[3px] text-lg text-success" />
                  <div>
                    <strong className="mb-1 block dark:text-dark-text">{title}</strong>
                    <span className="text-[0.9rem] text-ink-2 dark:text-dark-muted">{text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Devis */}
      <section id="request" className="scroll-mt-20 bg-canvas px-4 py-14 sm:px-6 sm:py-20 dark:bg-dark-bg">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeader title="Demande de devis" text="Remplissez le formulaire, réponse sous 24 h" />
          <Reveal from="zoom">
            <RequestForm />
          </Reveal>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeader title="Contactez-nous" text="Une question ? Notre équipe est à votre écoute" />
          <div className={`grid gap-12 ${MAP_URL ? "md:grid-cols-2" : ""}`}>
            <Reveal from="left">
              <div className={MAP_URL ? "" : "grid gap-x-6 sm:grid-cols-2"}>
                {contactCards.map(([icon, title, value]) => (
                  <div key={title} className="mb-5 flex items-center gap-4 rounded-lg bg-mist p-4 dark:bg-dark-surface [&_a]:rounded-sm [&_a]:font-medium [&_a]:text-primary-dark [&_a]:[overflow-wrap:anywhere] dark:[&_a]:text-primary">
                    <Icon name={icon} className="w-10 shrink-0 text-center text-2xl text-primary-dark dark:text-primary" />
                    <div className="min-w-0">
                      <strong className="dark:text-dark-text">{title}</strong>
                      <br />
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
            {MAP_URL && (
              <Reveal from="right">
                <div className="min-h-[350px] overflow-hidden rounded-2xl shadow-float">
                  <iframe title={`Plan d'accès — ${BRAND.name}`} className="block h-[350px] w-full border-0" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={MAP_URL} />
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="on-dark bg-anthracite px-6 pt-12 pb-5 text-fog-light dark:bg-dark-deep">
        <div className="mx-auto grid max-w-[1280px] gap-10 md:grid-cols-[2fr_1fr_1fr_1fr] [&_h3]:mb-4 [&_h3]:text-[1.1rem] [&_h3]:text-white [&_.flink]:block [&_.flink]:rounded-sm [&_.flink]:text-left [&_.flink]:text-[0.9rem] [&_.flink]:leading-loose [&_.flink]:text-fog [&_.flink:hover]:text-primary-light">
          <div>
            <h3 className="flex items-center gap-2.5">
              <Logo size={28} /> {BRAND.name}
            </h3>
            <p>
              {BRAND.description} Depuis {BRAND.since}.
            </p>
            {SOCIALS.length > 0 && (
              <div className="mt-3 flex gap-3">
                {SOCIALS.map(([icon, label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${BRAND.name} sur ${label}`} className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-primary hover:text-on-primary">
                    <Icon name={icon} />
                  </a>
                ))}
              </div>
            )}
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
            <Link to="/" className="flink">
              Espace équipe
            </Link>
          </div>
          <div>
            <h3>Contact</h3>
            <a className="flink" href={PHONE_HREF}>
              {BRAND.phone}
            </a>
            <a className="flink [overflow-wrap:anywhere]" href={`mailto:${BRAND.email}`}>
              {BRAND.email}
            </a>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-[1280px] border-t border-white/10 pt-5 text-center text-[0.85rem]">
          &copy; {year} {BRAND.name}. Tous droits réservés.
        </div>
      </footer>

      {/* Boutons flottants */}
      <button
        type="button"
        onClick={() => setDark((d) => !d)}
        title={dark ? "Passer en mode clair" : "Passer en mode sombre"}
        aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
        aria-pressed={dark}
        className={`${FLOAT_BTN} right-5 bottom-40 md:right-2.5 md:bottom-[100px]`}
      >
        <Icon name={dark ? "sun" : "moon"} />
      </button>
      <BackToTop />
    </div>
  );
}

const FLOAT_BTN = `fixed z-[997] grid size-[46px] place-items-center rounded-full bg-anthracite text-lg text-white shadow-float transition hover:bg-primary hover:text-on-primary ${RING_DARK}`;

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
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Retour en haut" className={`${FLOAT_BTN} right-5 bottom-[100px] md:right-[100px] md:bottom-[30px]`}>
      <Icon name="chevron-up" />
    </button>
  );
}
