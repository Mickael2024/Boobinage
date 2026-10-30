import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../ui/Icon";

/** Carte de connexion centrée (technicien / admin). */
export function AuthCard({ icon, title, subtitle, accent = "primary", children }: { icon: string; title: string; subtitle?: string; accent?: "primary" | "warning"; children: ReactNode }) {
  const bg = accent === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className={`relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-pop before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] sm:p-10 ${accent === "warning" ? "before:bg-warning" : "before:bg-primary"}`}>
        <Link to="/" className="group -mt-2 -ml-2 mb-4 inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[0.85rem] font-medium text-ink-2 transition hover:bg-mist hover:text-primary">
          <Icon name="arrow-left" className="text-xs transition group-hover:-translate-x-[3px]" />
          <span>Retour à l'accueil</span>
        </Link>
        <div className="mb-8 text-center">
          <div className={`mx-auto mb-5 grid size-16 place-items-center rounded-[14px] text-[32px] text-white ${bg}`}>
            <Icon name={icon} />
          </div>
          <h2 className="mb-1.5 text-2xl font-semibold">{title}</h2>
          {subtitle && <p className="text-[0.9rem] text-ink-2">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
