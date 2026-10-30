import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Libellé + champ. */
export function Field({ label, htmlFor, className = "", children }: { label: ReactNode; htmlFor?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`mb-4 min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Champ mot de passe avec bouton afficher / masquer. */
export function PasswordInput({ className = "field-input", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  const label = show ? "Masquer le mot de passe" : "Afficher le mot de passe";
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={label}
        aria-pressed={show}
        title={label}
        className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-3 transition hover:bg-mist hover:text-ink"
      >
        <Icon name={show ? "eye-slash" : "eye"} />
      </button>
    </div>
  );
}

/** Champ avec icône à gauche (écrans de connexion). */
export function IconInput({ icon, password, ...props }: { icon: string; password?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const cls = "field-input pl-11";
  return (
    <div className="group relative mb-5">
      <Icon name={icon} className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-ink-3 transition group-focus-within:text-primary" />
      {password ? <PasswordInput {...props} className={cls} /> : <input {...props} className={cls} />}
    </div>
  );
}

export function RememberMe({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="group -mt-1 mb-[18px] inline-flex cursor-pointer items-center gap-2.5 text-[0.88rem] text-ink-2 select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] border-line-strong bg-white text-[11px] text-transparent transition group-hover:border-primary peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-primary/25"
      >
        <Icon name="check" />
      </span>
      <span>Se souvenir de moi</span>
    </label>
  );
}
