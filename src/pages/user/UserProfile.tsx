import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { DetailList, PageHeader } from "../../components/ui/Display";
import { Icon } from "../../components/ui/Icon";
import type { SessionUser } from "../../lib/types";

/** Profil technicien en consultation uniquement : les modifications passent par l'administrateur. */
export function UserProfile({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="MON PROFIL" subtitle="Informations de votre compte" icon="user-gear" />
      <div className="panel mx-auto max-w-[640px] p-6 shadow-card sm:p-8">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-primary-soft text-3xl text-primary">
          <Icon name="user" />
        </div>
        <DetailList
          rows={[
            ["Nom complet", user.name || "-"],
            ["Email", user.email || "-"],
            ["Entreprise", user.company || "-"],
            ["Statut du compte", user.approved ? "Actif" : "En attente"],
          ]}
        />
        <div className="mt-5 flex items-start gap-3 rounded-[10px] border border-primary-line bg-primary-soft px-4 py-3.5 text-[0.88rem] text-primary-dark">
          <Icon name="lock" className="mt-1" />
          <p>Ces informations sont gérées par votre administrateur. Pour les modifier (nom, email, mot de passe), contactez-le.</p>
        </div>
        <div className="mt-5">
          <Button variant="secondary" icon="arrow-left" onClick={() => navigate("/user")}>
            RETOUR
          </Button>
        </div>
      </div>
    </>
  );
}
