import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { createClient, updateClient } from "../../lib/db";
import type { Client } from "../../lib/types";

type ClientForm = Required<Pick<Client, "name" | "company" | "phone" | "email" | "address" | "nif" | "stat" | "notes">>;
const EMPTY: ClientForm = { name: "", company: "", phone: "", email: "", address: "", nif: "", stat: "", notes: "" };

interface Props {
  open: boolean;
  onClose: () => void;
  /** Client à modifier ; absent = création. */
  client?: Client | null;
  /** Valeurs initiales d'une création (ex. demande de devis du site). */
  initial?: Partial<ClientForm>;
  onSaved: (client: Client) => void;
  /** Formulaire réduit (technicien : sans NIF / STAT / notes). */
  compact?: boolean;
}

/** Création / modification d'une fiche client. */
export function ClientFormModal({ open, onClose, client, initial, onSaved, compact }: Props) {
  const notify = useToast();
  const [form, setForm] = useState<ClientForm>(EMPTY);
  const set = (patch: Partial<ClientForm>) => setForm((f) => ({ ...f, ...patch }));

  // valeurs initiales lues à l'ouverture seulement (initial peut être recréé à chaque rendu du parent)
  const initialRef = useRef(initial);
  initialRef.current = initial;
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY, ...(initialRef.current ?? {}), ...Object.fromEntries(Object.entries(client ?? {}).filter(([k]) => k in EMPTY)) });
  }, [open, client]);

  const save = async () => {
    const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as ClientForm;
    if (!data.name) {
      notify("Le nom du client est obligatoire", "error");
      return false;
    }
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
      notify("Email invalide", "error");
      return false;
    }
    try {
      if (client) {
        await updateClient(client.id, data);
        onSaved({ ...client, ...data });
        notify("Client mis à jour", "success");
      } else {
        const created = await createClient(data);
        onSaved(created as Client);
        notify("Client créé", "success");
      }
    } catch (e) {
      console.error(e);
      notify("Enregistrement du client impossible", "error");
      return false;
    }
  };

  const input = (key: keyof ClientForm, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} htmlFor={`cl-${key}`}>
      <input id={`cl-${key}`} className="field-input" value={form[key]} onChange={(e) => set({ [key]: e.target.value })} {...props} />
    </Field>
  );

  return (
    <Modal open={open} onClose={onClose} title={client ? "Modifier le client" : "Nouveau client"} icon="address-card" wide confirmText="Enregistrer" onConfirm={save}>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {input("name", "Nom *", { required: true, autoComplete: "off", maxLength: 200 })}
        {input("company", "Société", { maxLength: 200 })}
        {input("phone", "Téléphone", { type: "tel", placeholder: "+261 34 …" })}
        {input("email", "Email", { type: "email" })}
      </div>
      {input("address", "Adresse")}
      {!compact && (
        <>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {input("nif", "NIF")}
            {input("stat", "STAT")}
          </div>
          <Field label="Notes internes" htmlFor="cl-notes">
            <textarea id="cl-notes" rows={2} className="field-input" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </>
      )}
    </Modal>
  );
}
