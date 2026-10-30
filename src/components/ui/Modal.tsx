import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: string;
  wide?: boolean;
  children?: ReactNode;
  /** Bouton principal. Renvoyer false garde la fenêtre ouverte (ex. validation échouée). */
  onConfirm?: () => unknown;
  confirmText?: string;
  confirmVariant?: "primary" | "danger" | "success";
  /** null : pas de bouton d'annulation. */
  cancelText?: string | null;
}

export function Modal({ open, onClose, title, icon = "question", wide, children, onConfirm, confirmText = "Confirmer", confirmVariant = "primary", cancelText = "Annuler" }: ModalProps) {
  const notify = useToast();
  const titleId = useId();
  const panel = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  // onClose est souvent une fonction recréée à chaque rendu : on la lit via une ref
  // pour ne pas relancer l'effet (et perdre le focus) à chaque frappe
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && closeRef.current();
    document.addEventListener("keydown", onKey);
    // focus sur le premier champ, sinon sur le bouton principal
    requestAnimationFrame(() => {
      const el = panel.current;
      (el?.querySelector<HTMLElement>("[data-body] input:not([type=hidden]), [data-body] textarea") || el?.querySelector<HTMLElement>("[data-confirm]"))?.focus();
    });
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!onConfirm) return onClose();
    try {
      setBusy(true);
      const r = await onConfirm();
      if (r !== false) onClose();
    } catch (err) {
      console.error(err);
      notify("Une erreur est survenue", "error");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[5000] grid place-items-center p-4">
      <div className="absolute inset-0 animate-[fade-in_0.15s_ease] bg-[rgba(28,31,35,0.55)] backdrop-blur-sm" onClick={onClose} />
      <form
        ref={panel}
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-[calc(100dvh-32px)] w-full animate-fade-in flex-col rounded-[20px] bg-white px-[18px] pt-[22px] pb-[18px] shadow-modal sm:px-7 sm:pt-7 sm:pb-[22px] ${wide ? "max-w-[640px]" : "max-w-[460px]"}`}
      >
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute top-3.5 right-3.5 grid size-[34px] place-items-center rounded-lg text-ink-2 transition hover:bg-mist hover:text-ink">
          <Icon name="times" />
        </button>
        <div className="mx-auto mb-3.5 grid size-[52px] shrink-0 place-items-center rounded-[14px] bg-primary text-2xl text-white">
          <Icon name={icon} />
        </div>
        <h3 id={titleId} className="mb-3.5 shrink-0 text-center text-xl font-semibold">
          {title}
        </h3>
        <div data-body className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-1 text-left text-[0.9rem]">
          {children}
        </div>
        <div className="mt-[18px] flex shrink-0 flex-col-reverse justify-center gap-3 border-t border-line pt-4 sm:flex-row">
          {cancelText !== null && (
            <Button variant="secondary" onClick={onClose}>
              {cancelText}
            </Button>
          )}
          <Button data-confirm type="submit" variant={confirmVariant} loading={busy} className={cancelText === null ? "sm:min-w-[140px]" : ""}>
            {confirmText}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

/** Sous-titre de section dans une fenêtre. */
export function ModalSubtitle({ children }: { children: ReactNode }) {
  return <h5 className="mt-[18px] mb-2.5 text-[0.78rem] font-semibold tracking-[0.06em] text-ink-2 uppercase">{children}</h5>;
}
