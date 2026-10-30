import { lazy, Suspense, useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ConfirmProvider } from "./components/ui/Confirm";
import { Loading } from "./components/ui/Display";
import { ToastProvider } from "./components/ui/Toast";
import { initializeStorage } from "./lib/db";
import { Home } from "./pages/Home";

// chaque espace est chargé à la demande
const Site = lazy(() => import("./pages/Site"));
const UserApp = lazy(() => import("./pages/user/UserApp"));
const AdminApp = lazy(() => import("./pages/admin/AdminApp"));

const TITLES: [string, string][] = [
  ["/site", "Jeff Elec • Expert en Rebobinage de Moteurs Électriques"],
  ["/user", "Jeff Elec • Espace Technique"],
  ["/admin", "Jeff Elec • Administration"],
];

function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Jeff Elec • Gestion de Rebobinage";
  }, [pathname]);
  return null;
}

export function App() {
  useEffect(() => {
    void initializeStorage();
  }, []);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <HashRouter>
          <DocumentTitle />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/site" element={<Site />} />
              <Route path="/user/*" element={<UserApp />} />
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}
