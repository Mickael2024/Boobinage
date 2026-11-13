import { useId, useRef, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { FOCUS_RING } from "./styles";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  /** Libellé accessible (par défaut « Rechercher »). */
  label?: string;
  /** Largeur compacte pour les en-têtes de page. */
  inline?: boolean;
}

/** Champ de recherche avec loupe, bouton d'effacement et Échap pour vider. */
export function SearchInput({ value, onChange, label = "Rechercher", placeholder = "Rechercher…", inline, className = "", id, ...rest }: SearchInputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div role="search" className={`group relative ${inline ? "w-full sm:w-[260px]" : "w-full"} ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[0.9rem] text-ink-3 transition group-focus-within:text-primary-dark" />
      <input
        {...rest}
        ref={ref}
        id={inputId}
        type="search"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            e.stopPropagation();
            onChange("");
          }
          rest.onKeyDown?.(e);
        }}
        className={`field-input pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden ${inline ? "min-h-10 py-2" : ""}`}
      />
      {value && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          className={`absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-3 transition hover:bg-mist hover:text-ink ${FOCUS_RING}`}
        >
          <Icon name="times" />
        </button>
      )}
    </div>
  );
}
