import { useState, type FormEvent } from "react";
import { authenticate } from "../../lib/session";
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

  return (
    <AuthCard icon={icon} title={title} subtitle={subtitle} accent={admin ? "warning" : "primary"}>
      <form onSubmit={submit}>
        <IconInput
          icon={admin ? "user-shield" : "envelope"}
          type="email"
          placeholder={admin ? "EMAIL ADMINISTRATEUR" : "EMAIL"}
          aria-label="Email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <IconInput
          icon={admin ? "key" : "lock"}
          password
          placeholder="MOT DE PASSE"
          aria-label="Mot de passe"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <RememberMe checked={remember} onChange={setRemember} />
        <Button type="submit" block iconRight="arrow-right" loading={busy}>
          AUTHENTIFICATION
        </Button>
      </form>
      {note && <p className="mt-5 text-center text-[0.88rem] text-ink-2">{note}</p>}
    </AuthCard>
  );
}
