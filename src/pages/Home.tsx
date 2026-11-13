import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { Logo } from "../components/ui/Logo";
import BRAND from "../lib/brand";

const [BRAND_FIRST, ...BRAND_REST] = BRAND.name.split(" ");

const TEXTS = ["Diagnostic électrique avancé", "Rebobinage professionnel", "Traçabilité complète"];

/** Effet machine à écrire (statique si l'utilisateur préfère moins d'animations). */
function useTyping() {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [text, setText] = useState(reduced ? TEXTS[0] : "");
  useEffect(() => {
    if (reduced) return;
    let textIndex = 0;
    let charIndex = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = TEXTS[textIndex];
      if (!erasing) {
        setText(t.slice(0, ++charIndex));
        if (charIndex === t.length) {
          erasing = true;
          timer = setTimeout(tick, 2000);
        } else timer = setTimeout(tick, 80);
      } else {
        setText(t.slice(0, --charIndex));
        if (charIndex === 0) {
          erasing = false;
          textIndex = (textIndex + 1) % TEXTS.length;
          timer = setTimeout(tick, 400);
        } else timer = setTimeout(tick, 40);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, [reduced]);
  return { text, reduced };
}

/** Carte d'accès à un espace (technicien / supervision). */
function GateCard({ to, icon, title, text, features, action, accent }: { to: string; icon: string; title: string; text: string; features: string[]; action: string; accent: "primary" | "warning" }) {
  const color = accent === "warning" ? "bg-warning" : "bg-primary";
  return (
    <Link
      to={to}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white px-5 pt-6 text-ink shadow-pop transition duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] hover:-translate-y-1.5 hover:border-primary/55 sm:px-8 sm:pt-8 ${accent === "warning" ? "before:bg-warning" : "before:bg-primary"}`}
    >
      <div aria-hidden className={`mb-5 grid size-16 place-items-center rounded-[14px] text-[28px] text-on-primary ${color}`}>
        <Icon name={icon} />
      </div>
      <h2 className="mb-2.5 text-xl font-bold tracking-[-0.01em]">{title}</h2>
      <p className="mb-5 text-[0.95rem] text-ink-2">{text}</p>
      <ul className="mb-6 flex flex-col gap-2 text-[0.9rem] text-ink-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5">
            <Icon name="check" className="text-success" /> {f}
          </li>
        ))}
      </ul>
      <div className="-mx-5 mt-auto flex items-center justify-between border-t border-line bg-canvas px-5 py-[18px] text-[0.85rem] font-semibold tracking-[0.04em] text-primary-dark uppercase sm:-mx-8 sm:px-8 sm:py-5">
        <span>{action}</span>
        <Icon name="arrow-right" className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export function Home() {
  const { text, reduced } = useTyping();
  return (
    <div className="on-dark bg-blueprint relative min-h-dvh bg-anthracite bg-fixed text-white before:pointer-events-none before:fixed before:inset-0 before:bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--color-overlay))] before:opacity-50 before:content-['']">
      <div className="relative mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
        <header className="mb-14 text-center">
          <Logo size={72} className="mx-auto mb-6 block rounded-2xl shadow-card" />
          <h1 className="text-[clamp(2.2rem,5vw,3.4rem)] font-bold">
            {BRAND_FIRST} <span className="text-primary-light">{BRAND_REST.join(" ")}</span>
          </h1>
          <p className="mt-3 min-h-[1.8em] text-[1.15rem] text-fog">
            <span className="sr-only">{TEXTS.join(" · ")}</span>
            <span aria-hidden className="font-medium text-white">
              {text}
            </span>
            {!reduced && (
              <span aria-hidden className="animate-pulse text-white">
                |
              </span>
            )}
          </p>
        </header>

        <div className="mx-auto mb-12 grid max-w-[880px] gap-6 md:grid-cols-2 md:gap-8">
          <GateCard
            to="/user"
            icon="microchip"
            accent="primary"
            title="Espace technique"
            text="Accédez aux procédures de rebobinage, enregistrez les moteurs et suivez chaque étape technique"
            features={["Diagnostic complet", "Tests électriques", "Relevé bobinage"]}
            action="Connexion requise"
          />
          <GateCard
            to="/admin"
            icon="shield-halved"
            accent="warning"
            title="Supervision"
            text="Validez les procédures, gérez les utilisateurs et supervisez l'ensemble des opérations"
            features={["Validation étapes", "Gestion utilisateurs", "Rapports détaillés"]}
            action="Accès sécurisé"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {[
            ["list-check", "Suivi par étapes"],
            ["lock", "Accès sécurisé"],
            ["camera", "Rapports photo"],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2.5 rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-[0.8rem] font-semibold tracking-[0.04em] uppercase backdrop-blur-md">
              <Icon name={icon} className="text-primary-light" />
              <span className="text-fog-light">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
