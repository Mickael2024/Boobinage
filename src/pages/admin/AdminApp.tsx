import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AppShell, type NavItem } from "../../components/layout/AppShell";
import { LoginForm } from "../../components/layout/LoginForm";
import { Loading } from "../../components/ui/Display";
import { useToast } from "../../components/ui/Toast";
import { watchUnreadReports } from "../../lib/db";
import { logout, useCurrentUser, validateRememberedSession } from "../../lib/session";
import { AdminDashboard } from "./AdminDashboard";
import { AdminMotorDetail } from "./AdminMotorDetail";
import { AdminProfile } from "./AdminProfile";
import { CompletedMotors } from "./CompletedMotors";
import { FaultTypes } from "./FaultTypes";
import { Messages } from "./Messages";
import { MotorTypes } from "./MotorTypes";
import { Motors } from "./Motors";
import { Reports } from "./Reports";
import { Users } from "./Users";

/** Pastille « rapports non lus » en temps réel, avec notification à l'arrivée d'un rapport. */
function useUnreadReports(enabled: boolean) {
  const notify = useToast();
  const [count, setCount] = useState(0);
  const previous = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    previous.current = null;
    return watchUnreadReports((n) => {
      const prev = previous.current;
      if (prev !== null && n > prev) {
        const diff = n - prev;
        notify(`${diff} nouveau${diff > 1 ? "x" : ""} rapport${diff > 1 ? "s" : ""} reçu${diff > 1 ? "s" : ""}`, "info");
      }
      previous.current = n;
      setCount(n);
    });
  }, [enabled, notify]);
  return count;
}

export default function AdminApp() {
  const admin = useCurrentUser();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const isAdmin = admin?.role === "admin";
  const unread = useUnreadReports(isAdmin);

  useEffect(() => {
    validateRememberedSession("admin").finally(() => setChecking(false));
  }, []);

  if (checking) return <Loading />;
  if (!isAdmin) return <LoginForm role="admin" icon="shield-halved" title="ADMINISTRATION" subtitle="Accès restreint" />;

  const nav: NavItem[] = [
    { to: "/admin", label: "TABLEAU DE BORD", icon: "chart-pie", end: true },
    { to: "/admin/users", label: "UTILISATEURS", icon: "users" },
    { to: "/admin/motors", label: "MOTEURS", icon: "microchip" },
    { to: "/admin/completed", label: "MOTEURS TERMINÉS", icon: "check-circle" },
    { to: "/admin/types", label: "TYPES MOTEURS", icon: "cubes" },
    { to: "/admin/faults", label: "PANNES & DIAGNOSTICS", icon: "stethoscope" },
    { to: "/admin/reports", label: "RAPPORTS", icon: "file-alt", badge: unread },
    { to: "/admin/messages", label: "MESSAGES", icon: "envelope" },
    { to: "/admin/profile", label: "PROFIL ADMIN", icon: "user-shield" },
  ];

  return (
    <AppShell
      brandIcon="shield-halved"
      brandSuffix="Elec"
      items={nav}
      onLogout={() => {
        logout();
        navigate("/admin");
      }}
    >
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<Users admin={admin} />} />
        <Route path="motors" element={<Motors />} />
        <Route path="motors/:id" element={<AdminMotorDetail admin={admin} />} />
        <Route path="completed" element={<CompletedMotors />} />
        <Route path="types" element={<MotorTypes />} />
        <Route path="faults" element={<FaultTypes />} />
        <Route path="reports" element={<Reports />} />
        <Route path="messages" element={<Messages />} />
        <Route path="profile" element={<AdminProfile admin={admin} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppShell>
  );
}
