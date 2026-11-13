import { useState, type FormEvent } from "react";
import { authenticate, sendPasswordReset } from "../../lib/session";
import type { Role } from "../../lib/types";
import { Button } from "../ui/Button";
import { IconInput, RememberMe } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { AuthCard } from "./AuthCard";

interface LoginFormProps {
  role: Role;
  icon: string;
  title: string;
  subtitle?: string;
  note?: string;
}

/** Écran de connexion (technicien ou admin). La session est mise à jour en cas de succès. */
export function LoginForm({ role, icon, title, subtitle, note }: LoginFormProps) {
  const notify = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const admin = role === "admin";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const r = await authenticate(role, email, password, remember);
    setBusy(false);
    if (r.success) notify(admin ? "Accès autorisé" : "Connexion réussie", "success");
    else notify(r.message, "error");
  };

  const forgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return notify("Saisissez d'abord votre email", "warning");
    // message identique que le compte existe ou non (pas d'énumération des comptes)
    await sendPasswordReset(email).catch(() => undefined);
    notify("Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé", "info");
  };

  return (
    <AuthCard icon={icon} title={title} subtitle={subtitle} accent={admin ? "warning" : "primary"}>
      <form onSubmit={submit}>
        <IconInput
          icon={admin ? "user-shield" : "envelope"}
          type="email"
          placeholder={admin ? "Email administrateur" : "Email"}
          aria-label="Email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <IconInput
          icon={admin ? "key" : "lock"}
          password
          placeholder="Mot de passe"
          aria-label="Mot de passe"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <RememberMe checked={remember} onChange={setRemember} />
        <Button type="submit" block iconRight="arrow-right" loading={busy}>
          Se connecter
        </Button>
      </form>
      <button type="button" onClick={forgot} className="mt-4 block w-full text-center text-[0.88rem] text-ink-2 underline-offset-2 hover:underline">
        Mot de passe oublié ?
      </button>
      {note && <p className="mt-5 text-center text-[0.88rem] text-ink-2">{note}</p>}
    </AuthCard>
  );
}
