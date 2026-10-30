import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  /** Variante compacte pour les filtres d'en-tête. */
  inline?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Liste déroulante accessible (combobox + listbox), au style de l'application. */
export function Select({ id, value, onChange, options, inline, invalid, disabled, "aria-label": ariaLabel }: SelectProps) {
  const autoId = useId();
  const listId = `${id || autoId}-list`;
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<CSSProperties>({});
  const openedAt = useRef(0);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  const place = () => {
    const r = toggle.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const menuH = Math.min(menu.current?.scrollHeight ?? 280, 280);
    const up = below < menuH + 12 && r.top > below;
    setPos({
      minWidth: r.width,
      left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
      maxHeight: Math.max(120, Math.min(280, (up ? r.top : below) - 16)),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  };

  const show = () => {
    if (disabled) return;
    openedAt.current = Date.now();
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  };
  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) toggle.current?.focus();
  };
  const choose = (i: number) => {
    const opt = options[i];
    if (!opt) return;
    close(true);
    if (opt.value !== value) onChange(opt.value);
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !toggle.current?.contains(t)) close();
    };
    const onScroll = (e: Event) => {
      if (Date.now() - openedAt.current > 200 && !menu.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show();
      setActive((a) => Math.min(options.length - 1, Math.max(0, a + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) show();
      else choose(active);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Tab" && open) close();
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // saut à la première option commençant par la lettre tapée
      const ch = e.key.toLowerCase();
      for (let k = 1; k <= options.length; k++) {
        const i = (Math.max(selectedIndex, active) + k) % options.length;
        if (options[i].label.toLowerCase().startsWith(ch)) {
          if (open) setActive(i);
          else choose(i);
          break;
        }
      }
    }
  };

  const isPlaceholder = !selected || selected.value === "";

  return (
    <div className={inline ? "min-w-[180px]" : "w-full"}>
      <button
        ref={toggle}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-3 rounded-[10px] border bg-white text-left text-[0.95rem] transition focus:outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-mist disabled:opacity-70 ${inline ? "min-h-10 px-3.5 py-2" : "min-h-11 px-4 py-2.5"} ${invalid ? "border-danger" : open ? "border-primary ring-3 ring-primary/20" : "border-line-strong hover:border-[#d9b48c]"}`}
      >
        <span className={`truncate ${isPlaceholder ? "text-ink-3" : "text-ink"}`}>{selected?.label ?? ""}</span>
        <Icon name="chevron-down" className={`text-xs text-ink-3 transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
      </button>
      {open &&
        createPortal(
          <ul
            ref={menu}
            id={listId}
            role="listbox"
            style={pos}
            onMouseDown={(e) => e.preventDefault()}
            className="fixed z-[6000] animate-fade-in overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-pop"
          >
            {options.map((o, i) => (
              <li
                key={o.value + i}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === selectedIndex}
                onClick={() => choose(i)}
                onMouseMove={() => i !== active && setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2 text-[0.92rem] ${i === active ? "bg-primary-soft" : ""} ${i === selectedIndex ? "font-semibold text-primary-dark" : o.value === "" ? "text-ink-3" : "text-ink"}`}
              >
                <span>{o.label || " "}</span>
                <Icon name="check" className={`text-xs ${i === selectedIndex ? "" : "invisible"}`} />
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
