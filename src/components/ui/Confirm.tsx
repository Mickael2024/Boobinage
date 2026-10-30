import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Modal } from "./Modal";

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  icon?: string;
  confirmText?: string;
  cancelText?: string | null;
  danger?: boolean;
  onConfirm?: () => unknown;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => void>(() => {});

/** Fenêtre de confirmation : confirm({ title, message, onConfirm: async () => ... }) */
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const close = useCallback(() => setOpts(null), []);
  return (
    <ConfirmContext.Provider value={setOpts}>
      {children}
      <Modal
        open={!!opts}
        onClose={close}
        title={opts?.title}
        icon={opts?.icon}
        confirmText={opts?.confirmText}
        cancelText={opts?.cancelText}
        confirmVariant={opts?.danger ? "danger" : "primary"}
        onConfirm={opts?.onConfirm}
      >
        <p className="text-center">{opts?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}
