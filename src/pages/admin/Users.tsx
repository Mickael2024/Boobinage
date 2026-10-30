import { useState } from "react";
import { Button, IconButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { DetailList, Empty, Loading, PageHeader, StatusPill, Table } from "../../components/ui/Display";
import { Field, PasswordInput } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { addActivity, deleteUser, getUserByEmail, getUsers, saveUser, updateUser } from "../../lib/db";
import { formatDate } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import type { SessionUser, User } from "../../lib/types";

const STATUS = { approved: "Approuvé", pending: "En attente" };

/** Création (user absent) et modification d'un compte technicien. */
function UserFormModal({ user, open, onClose, onSaved, company }: { user?: User; open: boolean; onClose: () => void; onSaved: () => void; company: string }) {
  const notify = useToast();
  const editing = !!user;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("approved");
  const [password, setPassword] = useState("");

  // réinitialise le formulaire à chaque ouverture
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setStatus(user?.approved === false ? "pending" : "approved");
      setPassword("");
    }
  }

  const save = async () => {
    const data = { name: name.trim(), email: email.trim(), approved: status === "approved" };
    if (!data.name) return notify("Le nom est obligatoire", "warning"), false;
    if (!/^\S+@\S+\.\S+$/.test(data.email)) return notify("Email invalide", "warning"), false;
    if ((!editing || password) && password.length < 6) return notify("Mot de passe : 6 caractères minimum", "warning"), false;
    if (!editing || data.email !== user.email) {
      const existing = await getUserByEmail(data.email);
      if (existing && existing.id !== user?.id) return notify("Cet email est déjà utilisé", "error"), false;
    }
    const payload = password ? { ...data, password } : data;
    if (editing) {
      await updateUser(user.id, payload);
      await addActivity({ type: "user_updated", userId: user.id, description: `Compte modifié : ${data.name}` });
      notify("Utilisateur modifié", "success");
    } else {
      // l'entreprise du salarié = celle de l'admin
      const saved = await saveUser({ ...payload, company, role: "user" });
      await addActivity({ type: "user_created", userId: saved.id, description: `Compte créé par l'admin : ${data.name}` });
      notify("Compte créé", "success");
    }
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"} icon={editing ? "user-pen" : "user-plus"} wide confirmText={editing ? "Enregistrer" : "Créer le compte"} onConfirm={save}>
      <Field label="Nom complet *" htmlFor="uf-name">
        <input id="uf-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Email *" htmlFor="uf-email">
        <input id="uf-email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Statut du compte" htmlFor="uf-status">
        <Select
          id="uf-status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "approved", label: "Approuvé (peut se connecter)" },
            { value: "pending", label: "En attente (accès bloqué)" },
          ]}
        />
      </Field>
      <Field label={editing ? "Nouveau mot de passe" : "Mot de passe *"} htmlFor="uf-password">
        <PasswordInput id="uf-password" autoComplete="new-password" placeholder={editing ? "Laisser vide pour ne pas changer" : "6 caractères minimum"} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function Users({ admin }: { admin: SessionUser }) {
  const notify = useToast();
  const confirm = useConfirm();
  const { data, loading, reload } = useAsync(async () => (await getUsers()).filter((u) => u.role === "user"));
  const [form, setForm] = useState<{ open: boolean; user?: User }>({ open: false });
  const [details, setDetails] = useState<User | null>(null);

  return (
    <>
      <PageHeader title="GESTION UTILISATEURS" icon="users-cog">
        <Button variant="secondary" icon="sync-alt" onClick={reload}>
          ACTUALISER
        </Button>
        <Button icon="user-plus" onClick={() => setForm({ open: true })}>
          NOUVEL UTILISATEUR
        </Button>
      </PageHeader>

      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>Aucun utilisateur. Cliquez sur « Nouvel utilisateur » pour en créer un.</Empty>
      ) : (
        <Table head={["Nom", "Email", "Statut", "Actions"]}>
          {data.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
              </td>
              <td>{u.email}</td>
              <td>
                <StatusPill status={u.approved ? "completed" : "pending"} label={u.approved ? STATUS.approved : STATUS.pending} />
              </td>
              <td>
                <div className="flex gap-1.5">
                  <IconButton icon="eye" label="Voir" onClick={() => setDetails(u)} />
                  <IconButton icon="pen" label="Modifier" onClick={() => setForm({ open: true, user: u })} />
                  {!u.approved && (
                    <IconButton
                      icon="check"
                      label="Approuver"
                      tone="success"
                      onClick={async () => {
                        await updateUser(u.id, { approved: true });
                        notify("Utilisateur approuvé", "success");
                        await reload();
                      }}
                    />
                  )}
                  <IconButton
                    icon="trash"
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      confirm({
                        title: "Supprimer",
                        message: "Supprimer cet utilisateur ? Cette action est définitive.",
                        icon: "trash",
                        confirmText: "Supprimer",
                        danger: true,
                        onConfirm: async () => {
                          await deleteUser(u.id);
                          notify("Utilisateur supprimé", "success");
                          void reload();
                        },
                      })
                    }
                  />
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title="Détails utilisateur"
        icon="user"
        confirmText="Modifier"
        cancelText="Fermer"
        onConfirm={() => {
          const u = details!;
          setTimeout(() => setForm({ open: true, user: u }), 0);
        }}
      >
        {details && (
          <DetailList
            rows={[
              ["Nom", details.name],
              ["Email", details.email],
              ["Statut", details.approved ? STATUS.approved : STATUS.pending],
              ["Créé le", formatDate(details.createdAt)],
              ["Dernière modification", formatDate(details.updatedAt)],
            ]}
          />
        )}
      </Modal>

      <UserFormModal
        open={form.open}
        user={form.user}
        company={admin.company || ""}
        onClose={() => setForm({ open: false })}
        onSaved={() => void reload()}
      />
    </>
  );
}
