import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/Icon";

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

function GateCard({ to, icon, title, text, features, action, accent }: { to: string; icon: string; title: string; text: string; features: string[]; action: string; accent: "primary" | "warning" }) {
  const color = accent === "warning" ? "bg-warning" : "bg-primary";
  return (
    <Link
      to={to}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white px-5 pt-6 text-ink shadow-pop transition duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] hover:-translate-y-1.5 hover:border-primary/55 sm:px-8 sm:pt-8 ${accent === "warning" ? "before:bg-warning" : "before:bg-primary"}`}
    >
      <div className={`mb-5 grid size-16 place-items-center rounded-[14px] text-[28px] text-white ${color}`}>
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
      <div className="-mx-5 mt-auto flex items-center justify-between border-t border-line bg-canvas px-5 py-[18px] text-[0.85rem] font-semibold tracking-[0.04em] text-primary-dark sm:-mx-8 sm:px-8 sm:py-5">
        <span>{action}</span>
        <Icon name="arrow-right" className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export function Home() {
  const { text, reduced } = useTyping();
  return (
    <div className="relative min-h-dvh bg-anthracite bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-fixed text-white before:pointer-events-none before:fixed before:inset-0 before:bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(28,31,35,0.6))] before:opacity-50 before:content-['']">
      <div className="relative mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
        <header className="mb-14 text-center">
          <div className="mx-auto mb-6 grid size-[72px] place-items-center rounded-2xl bg-primary text-[36px] shadow-card">
            <Icon name="bolt" />
          </div>
          <h1 className="text-[clamp(2.2rem,5vw,3.4rem)] font-bold">
            Jeff<span className="text-primary-light">Elec</span>
          </h1>
          <p className="mt-3 min-h-[1.8em] text-[1.15rem] text-[#b0b6bd]">
            <span className="font-medium text-white">{text}</span>
            {!reduced && <span className="animate-pulse text-white">|</span>}
          </p>
        </header>

        <div className="mx-auto mb-12 grid max-w-[880px] gap-6 md:grid-cols-2 md:gap-8">
          <GateCard
            to="/user"
            icon="microchip"
            accent="primary"
            title="ESPACE TECHNIQUE"
            text="Accédez aux procédures de rebobinage, enregistrez les moteurs et suivez chaque étape technique"
            features={["Diagnostic complet", "Tests électriques", "Relevé bobinage"]}
            action="CONNEXION REQUISE"
          />
          <GateCard
            to="/admin"
            icon="shield-halved"
            accent="warning"
            title="SUPERVISION"
            text="Validez les procédures, gérez les utilisateurs et supervisez l'ensemble des opérations"
            features={["Validation étapes", "Gestion utilisateurs", "Rapports détaillés"]}
            action="ACCÈS SÉCURISÉ"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {[
            ["list-check", "SUIVI PAR ÉTAPES"],
            ["lock", "ACCÈS SÉCURISÉ"],
            ["sync-alt", "SYNC TEMPS RÉEL"],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2.5 rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-[0.8rem] font-semibold tracking-[0.04em] backdrop-blur-md">
              <Icon name={icon} className="text-primary-light" />
              <span className="text-[#d4d7db]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
