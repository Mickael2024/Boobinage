import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/Display";
import { Field, PasswordInput } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { useToast } from "../../components/ui/Toast";
import { updateUser } from "../../lib/db";
import { accountErrorMessage, changeOwnEmail, changeOwnPassword, updateCurrentUser } from "../../lib/session";
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
    const newName = name.trim();
    const newEmail = email.trim();
    if (!newName || !newEmail) return notify("Nom et email requis", "error");
    const emailChanged = newEmail !== admin.email;
    if ((next || emailChanged) && !current) return notify("Saisissez le mot de passe actuel", "error");
    if (next && next !== confirmPwd) return notify("Mots de passe différents", "error");
    if (next && next.length < 6) return notify("Mot de passe : 6 caractères minimum", "error");
    setBusy(true);
    try {
      // Firebase Auth exige une réauthentification avant de changer mot de passe ou email
      if (next) await changeOwnPassword(current, next);
      if (emailChanged) await changeOwnEmail(current, newEmail);
      if (newName !== admin.name) {
        await updateUser(admin.id, { name: newName });
        updateCurrentUser({ name: newName });
      }
      notify(emailChanged ? `Profil mis à jour. Confirmez le nouvel email via le lien envoyé à ${newEmail}.` : "Profil mis à jour", "success");
      navigate("/admin");
    } catch (err) {
      console.error(err);
      notify(accountErrorMessage(err, "Erreur lors de l'enregistrement"), "error");
    } finally {
      setBusy(false);
    }
  };

  const section = "mb-6 border-b border-line pb-3 text-base font-semibold";

  return (
    <>
      <PageHeader title="Profil administrateur" icon="user-shield" />
      <div className="panel mx-auto max-w-[640px] p-6 shadow-card sm:p-8">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-warning-soft text-3xl text-warning-dark">
          <Icon name="crown" />
        </div>
        <form onSubmit={submit} noValidate>
          <h3 className={section}>Informations</h3>
          <Field label="Nom" htmlFor="ap-name">
            <input id="ap-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <h3 className={section}>Identifiants</h3>
          <Field label="Email" htmlFor="ap-email">
            <input id="ap-email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </Field>
          <h3 className={section}>Changer le mot de passe</h3>
          <Field label="Mot de passe actuel" htmlFor="ap-current">
            <PasswordInput id="ap-current" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Nouveau mot de passe" htmlFor="ap-new">
              <PasswordInput id="ap-new" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirmer" htmlFor="ap-confirm">
              <PasswordInput id="ap-confirm" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          <p className="-mt-2 mb-6 text-[0.85rem] text-ink-3">Laissez vide pour ne pas changer. Le mot de passe actuel est demandé pour changer de mot de passe ou d'email.</p>
          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => navigate("/admin")}>
              Annuler
            </Button>
            <Button type="submit" iconRight="save" loading={busy}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
