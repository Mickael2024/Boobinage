import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AppShell, type NavItem } from "../../components/layout/AppShell";
import { LoginForm } from "../../components/layout/LoginForm";
import { Loading } from "../../components/ui/Display";
import { useToast } from "../../components/ui/Toast";
import { watchUnreadReports, watchValidationRequests } from "../../lib/db";
import { logout, useAuthReady, useCurrentUser } from "../../lib/session";
import { AdminDashboard } from "./AdminDashboard";
import { AdminMotorDetail } from "./AdminMotorDetail";
import { AdminProfile } from "./AdminProfile";
import { ClientDetail } from "./ClientDetail";
import { Clients } from "./Clients";
import { InvoiceDetail } from "./InvoiceDetail";
import { Invoices } from "./Invoices";
import { QuoteEditor } from "./QuoteEditor";
import { Quotes } from "./Quotes";
import { Settings } from "./Settings";
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

/** Nombre de moteurs dont le technicien a demandé la validation, en temps réel. */
function useValidationRequests(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => (enabled ? watchValidationRequests(setCount) : undefined), [enabled]);
  return count;
}

export default function AdminApp() {
  const admin = useCurrentUser();
  const navigate = useNavigate();
  const ready = useAuthReady();
  const isAdmin = admin?.role === "admin";
  const unread = useUnreadReports(isAdmin);
  const validations = useValidationRequests(isAdmin);

  // Firebase Auth restaure la session (et vérifie le profil) avant l'affichage
  if (!ready) return <Loading />;
  if (!isAdmin) return <LoginForm role="admin" icon="shield-halved" title="Administration" subtitle="Accès restreint" />;

  const nav: NavItem[] = [
    { to: "/admin", label: "Tableau de bord", icon: "chart-pie", end: true },
    { to: "/admin/motors", label: "Moteurs", icon: "microchip", badge: validations, badgeLabel: (n) => `${n} demande${n > 1 ? "s" : ""} de validation` },
    { to: "/admin/completed", label: "Moteurs terminés", icon: "check-circle" },
    { to: "/admin/reports", label: "Rapports", icon: "file-alt", badge: unread },
    { to: "/admin/clients", label: "Clients", icon: "address-book" },
    { to: "/admin/quotes", label: "Devis", icon: "file-signature" },
    { to: "/admin/invoices", label: "Factures", icon: "file-invoice-dollar" },
    { to: "/admin/messages", label: "Demandes du site", icon: "envelope" },
    { to: "/admin/types", label: "Types de moteurs", icon: "cubes" },
    { to: "/admin/faults", label: "Pannes et diagnostics", icon: "stethoscope" },
    { to: "/admin/users", label: "Utilisateurs", icon: "users" },
    { to: "/admin/settings", label: "Paramètres", icon: "building" },
    { to: "/admin/profile", label: "Mon profil", icon: "user-shield" },
  ];

  return (
    <AppShell
      brandIcon="shield-halved"
      brandSuffix="Elec"
      items={nav}
      onLogout={() => {
        void logout();
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
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/new" element={<QuoteEditor />} />
        <Route path="quotes/:id" element={<QuoteEditor />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceDetail />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<AdminProfile admin={admin} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppShell>
  );
}
