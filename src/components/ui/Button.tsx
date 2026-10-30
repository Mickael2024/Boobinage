import { useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

type Variant = "primary" | "secondary" | "success" | "danger";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "border-primary-dark bg-primary text-white shadow-[0_1px_2px_rgba(37,42,48,0.12)] hover:bg-primary-dark hover:shadow-[0_6px_14px_-4px_rgba(217,115,26,0.4)] enabled:hover:-translate-y-px",
  secondary: "border-line-strong bg-white text-ink shadow-xs hover:bg-mist",
  success: "border-success-dark bg-success text-white hover:bg-success-dark",
  danger: "border-danger bg-danger text-white hover:brightness-95",
};
const SIZES: Record<Size, string> = {
  md: "min-h-11 px-5 py-2.5 text-[0.95rem]",
  sm: "px-3.5 py-1.5 text-[0.8rem]",
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  variant?: Variant;
  size?: Size;
  icon?: string;
  /** Icône après le texte (ex. flèche). */
  iconRight?: string;
  loading?: boolean;
  block?: boolean;
  /** Si le handler renvoie une Promise, le bouton passe en chargement jusqu'à la fin (anti double-clic). */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => unknown;
  children?: ReactNode;
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-[18px] animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />;
}

export function Button({ variant = "primary", size = "md", icon, iconRight, loading, block, onClick, className = "", children, disabled, type = "button", ...rest }: ButtonProps) {
  const [pending, setPending] = useState(false);
  const busy = loading || pending;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (busy || !onClick) return;
    const r = onClick(e);
    if (r instanceof Promise) {
      setPending(true);
      r.finally(() => setPending(false));
    }
  };

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold tracking-[0.01em] whitespace-nowrap transition duration-150 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${busy ? "cursor-progress disabled:opacity-90" : ""} ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`}
    >
      <span className={`inline-flex items-center gap-2 ${busy ? "invisible" : ""}`}>
        {icon && <Icon name={icon} />}
        {children}
        {iconRight && <Icon name={iconRight} />}
      </span>
      {busy && <Spinner className="absolute inset-0 m-auto" />}
    </button>
  );
}

type Tone = "default" | "danger" | "success";
const TONES: Record<Tone, string> = {
  default: "hover:border-primary hover:bg-primary-soft hover:text-primary-dark",
  danger: "hover:border-danger hover:bg-danger-soft hover:text-danger",
  success: "hover:border-success hover:bg-success-soft hover:text-success-dark",
};

/** Petit bouton carré à icône (actions de tableau). */
export function IconButton({ icon, label, tone = "default", className = "", onClick, ...rest }: { icon: string; label: string; tone?: Tone } & Pick<ButtonProps, "onClick" | "className" | "disabled">) {
  const [pending, setPending] = useState(false);
  return (
    <button
      {...rest}
      type="button"
      title={label}
      aria-label={label}
      disabled={pending || rest.disabled}
      onClick={(e) => {
        const r = onClick?.(e);
        if (r instanceof Promise) {
          setPending(true);
          r.finally(() => setPending(false));
        }
      }}
      className={`inline-grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-2 transition ${TONES[tone]} ${className}`}
    >
      {pending ? <Spinner className="size-3.5" /> : <Icon name={icon} />}
    </button>
  );
}
