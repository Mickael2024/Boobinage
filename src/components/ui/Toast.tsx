import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export type ToastType = "success" | "error" | "warning" | "info";
type Toast = { id: number; message: string; type: ToastType; leaving?: boolean };

const ICONS: Record<ToastType, string> = { success: "check-circle", error: "times-circle", warning: "exclamation-triangle", info: "info-circle" };
const COLORS: Record<ToastType, string> = {
  success: "border-l-success [&>i]:text-success",
  error: "border-l-danger [&>i]:text-danger",
  warning: "border-l-warning [&>i]:text-warning",
  info: "border-l-primary [&>i]:text-primary",
};

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), 4000);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4300);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" className="fixed top-3 right-3 left-3 z-[10000] flex flex-col items-end gap-2.5 sm:top-5 sm:left-auto sm:right-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={`flex w-full max-w-[380px] animate-slide-in items-center gap-3 rounded-xl border border-l-4 border-line bg-white px-5 py-3.5 text-ink shadow-pop transition-opacity duration-300 ${COLORS[t.type]} ${t.leaving ? "opacity-0" : ""}`}
          >
            <Icon name={ICONS[t.type]} className="text-xl" />
            <span className="text-[0.92rem]">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
