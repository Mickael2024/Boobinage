import { useLayoutEffect, useRef, type InputHTMLAttributes } from "react";

/** Séparateur de milliers : espace fine insécable (U+202F), typographie française. */
const SEP = " ";

/** 1250000 → « 1 250 000 » (entier, sans devise). */
export function formatThousands(n: number) {
  return String(Math.trunc(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, SEP);
}

export interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> {
  /** Montant entier en Ariary ; null = champ vide. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Suffixe affiché à droite (par défaut « Ar »). */
  suffix?: string;
  invalid?: boolean;
}

/** Saisie d'un montant entier en Ariary : séparateur de milliers pendant la frappe, suffixe « Ar ». */
export function MoneyInput({ value, onChange, suffix = "Ar", invalid, className = "", ...rest }: MoneyInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  // nombre de chiffres à gauche du curseur, pour le replacer après reformatage
  const caretDigits = useRef<number | null>(null);
  const display = value === null || Number.isNaN(value) ? "" : formatThousands(value);

  useLayoutEffect(() => {
    const el = ref.current;
    const digits = caretDigits.current;
    if (!el || digits === null || document.activeElement !== el) return;
    caretDigits.current = null;
    let pos = 0;
    for (let seen = 0; pos < display.length && seen < digits; pos++) if (/\d/.test(display[pos])) seen++;
    el.setSelectionRange(pos, pos);
  }, [display]);

  return (
    <div className="relative">
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        value={display}
        onChange={(e) => {
          const raw = e.target.value;
          const caret = e.target.selectionStart ?? raw.length;
          caretDigits.current = raw.slice(0, caret).replace(/\D/g, "").length;
          const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
          onChange(digits ? Number(digits) : null);
        }}
        className={`field-input pr-12 text-right font-mono tabular-nums ${invalid ? "border-danger" : ""} ${className}`}
      />
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[0.85rem] font-semibold text-ink-2">
        {suffix}
      </span>
    </div>
  );
}
