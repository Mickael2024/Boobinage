import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LoginForm } from "../../components/layout/LoginForm";
import { Loading } from "../../components/ui/Display";
import { logout, useCurrentUser, validateRememberedSession } from "../../lib/session";
import { MotorDetail } from "./MotorDetail";
import { MotorForm } from "./MotorForm";
import { UserDashboard } from "./UserDashboard";
import { UserProfile } from "./UserProfile";

const NAV = [
  { to: "/user", label: "TABLEAU DE BORD", icon: "chart-line", end: true },
  { to: "/user/new", label: "NOUVEAU MOTEUR", icon: "plus-circle" },
  { to: "/user/profile", label: "MON PROFIL", icon: "user-gear" },
];

export default function UserApp() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    validateRememberedSession("user").finally(() => setChecking(false));
  }, []);

  if (checking) return <Loading />;

  if (user?.role !== "user")
    return <LoginForm role="user" icon="microchip" title="ACCÈS TECHNICIEN" note="Pas de compte ? Contactez votre administrateur pour en obtenir un." />;

  return (
    <AppShell
      brandIcon="bolt"
      brandPrefix="Jeff Elec"
      brandSuffix="USER"
      items={NAV}
      onLogout={() => {
        logout();
        navigate("/user");
      }}
    >
      <Routes>
        <Route index element={<UserDashboard user={user} />} />
        <Route path="new" element={<MotorForm user={user} />} />
        <Route path="profile" element={<UserProfile user={user} />} />
        <Route path="motors/:id" element={<MotorDetail user={user} />} />
        <Route path="*" element={<Navigate to="/user" replace />} />
      </Routes>
    </AppShell>
  );
}
