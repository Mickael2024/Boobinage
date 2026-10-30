import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/Display";
import { Field, PasswordInput } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { useToast } from "../../components/ui/Toast";
import { getUserByEmail, updateUser } from "../../lib/db";
import { updateCurrentUser } from "../../lib/session";
import type { SessionUser } from "../../lib/types";

export function AdminProfile({ admin }: { admin: SessionUser }) {
  const navigate = useNavigate();
  const notify = useToast();
  const [name, setName] = useState(admin.name || "");
  const [email, setEmail] = useState(admin.email || "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !email.trim()) return notify("Nom et email requis", "error");
    setBusy(true);
    try {
      if (next) {
        const fresh = await getUserByEmail(admin.email);
        if (!fresh || current !== fresh.password) return notify("Mot de passe actuel incorrect", "error");
        if (next !== confirmPwd) return notify("Mots de passe différents", "error");
      }
      const updates = { name: name.trim(), email: email.trim(), ...(next ? { password: next } : {}) };
      await updateUser(admin.id, updates);
      updateCurrentUser({ name: updates.name, email: updates.email });
      notify("Profil mis à jour", "success");
      navigate("/admin");
    } catch (err) {
      console.error(err);
      notify("Erreur lors de l'enregistrement", "error");
    } finally {
      setBusy(false);
    }
  };

  const section = "mb-6 border-b border-line pb-3 text-base font-semibold";

  return (
    <>
      <PageHeader title="PROFIL ADMINISTRATEUR" icon="user-shield" />
      <div className="panel mx-auto max-w-[640px] p-6 shadow-card sm:p-8">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-warning-soft text-3xl text-[#b56d1c]">
          <Icon name="crown" />
        </div>
        <form onSubmit={submit} noValidate>
          <h3 className={section}>INFORMATIONS</h3>
          <Field label="NOM" htmlFor="ap-name">
            <input id="ap-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <h3 className={section}>IDENTIFIANTS</h3>
          <Field label="EMAIL" htmlFor="ap-email">
            <input id="ap-email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </Field>
          <h3 className={section}>CHANGER MOT DE PASSE</h3>
          <Field label="ACTUEL" htmlFor="ap-current">
            <PasswordInput id="ap-current" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="NOUVEAU" htmlFor="ap-new">
              <PasswordInput id="ap-new" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="CONFIRMER" htmlFor="ap-confirm">
              <PasswordInput id="ap-confirm" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          <p className="-mt-2 mb-6 text-[0.85rem] text-ink-3">Laissez vide pour ne pas changer</p>
          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => navigate("/admin")}>
              ANNULER
            </Button>
            <Button type="submit" iconRight="save" loading={busy}>
              ENREGISTRER
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
