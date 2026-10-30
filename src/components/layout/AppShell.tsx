import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "../ui/Icon";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  badge?: number;
}

interface AppShellProps {
  brandIcon: string;
  /** Mot mis en couleur après « Jeff » (ex. « Elec », ou « Elec USER »). */
  brandSuffix: string;
  brandPrefix?: string;
  items: NavItem[];
  onLogout: () => void;
  children: ReactNode;
}

/** Barre latérale (≥1025px) / tiroir avec hamburger (mobile, tablette). */
export function AppShell({ brandIcon, brandSuffix, brandPrefix = "Jeff", items, onLogout, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const badgeTotal = items.reduce((n, i) => n + (i.badge || 0), 0);

  // le tiroir se referme à chaque changement de page, avec Échap, ou en passant en grand écran
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth > 1024 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3.5 py-3.5 text-[0.85rem] font-medium leading-tight tracking-[0.02em] transition lg:py-3 lg:text-[0.8rem] ${
      isActive ? "bg-primary/12 text-primary-light shadow-[inset_3px_0_0_var(--color-primary)]" : "text-[#b8bcc2] hover:bg-white/8 hover:text-white"
    }`;

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <nav className="sticky top-0 z-[1000] bg-anthracite py-2.5 shadow-[0_6px_20px_-8px_rgba(28,31,35,0.5)] lg:fixed lg:inset-y-0 lg:left-0 lg:w-[264px] lg:overflow-y-auto lg:border-r lg:border-white/6 lg:py-0">
        <div className="flex items-center gap-3 px-4 lg:min-h-full lg:flex-col lg:items-stretch lg:gap-3.5 lg:px-3.5 lg:pt-[22px] lg:pb-[18px]">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="app-nav"
            className="relative z-[1200] flex flex-col gap-[5px] p-2.5 lg:hidden"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-0.5 w-6 rounded bg-white transition ${open && i === 0 ? "translate-y-[7px] rotate-45" : ""} ${open && i === 1 ? "opacity-0" : ""} ${open && i === 2 ? "-translate-y-[7px] -rotate-45" : ""}`}
              />
            ))}
            {badgeTotal > 0 && !open && (
              <span className="absolute -top-0.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1.5 text-[0.65rem] font-bold text-white shadow-[0_0_0_2px_var(--color-night)]">
                {badgeTotal > 9 ? "9+" : badgeTotal}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2.5 font-bold text-white lg:order-first lg:ml-0 lg:border-b lg:border-white/8 lg:px-2.5 lg:pt-1 lg:pb-[18px] lg:text-[1.15rem]">
            <span className="grid size-9 place-items-center rounded-[10px] bg-primary text-lg">
              <Icon name={brandIcon} />
            </span>
            <span>
              {brandPrefix} <span className="text-primary-light">{brandSuffix}</span>
            </span>
          </div>

          <ul
            id="app-nav"
            className={`fixed inset-y-0 left-0 z-[1100] flex w-[min(300px,86vw)] flex-col gap-1 overflow-y-auto border-r border-white/8 bg-anthracite px-3 pt-[76px] pb-5 shadow-[12px_0_40px_rgba(28,31,35,0.45)] transition-[transform,visibility] duration-250 lg:visible lg:static lg:w-auto lg:flex-1 lg:translate-x-0 lg:overflow-visible lg:border-0 lg:p-0 lg:shadow-none ${open ? "visible translate-x-0" : "invisible -translate-x-[105%]"}`}
          >
            {items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={linkCls}>
                  <Icon name={item.icon} className="w-5 shrink-0 text-center" />
                  <span className="flex-1">{item.label}</span>
                  {!!item.badge && (
                    <span
                      key={item.badge}
                      role="status"
                      aria-label={`${item.badge} non lu${item.badge > 1 ? "s" : ""}`}
                      className="grid h-[22px] min-w-[22px] animate-pop place-items-center rounded-full bg-danger px-[7px] text-[0.72rem] leading-none font-bold text-white shadow-[0_0_0_3px_rgba(217,75,69,0.25)]"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
            <li className="mt-3 border-t border-white/8 pt-3 lg:mt-auto">
              <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3.5 text-left text-[0.85rem] font-medium tracking-[0.02em] text-[#efa7a3] transition hover:bg-danger/18 hover:text-white lg:py-3 lg:text-[0.8rem]">
                <Icon name="power-off" className="w-5 shrink-0 text-center" />
                DÉCONNEXION
              </button>
            </li>
          </ul>
        </div>
      </nav>
      {open && <div className="fixed inset-0 z-[900] bg-[rgba(28,31,35,0.45)] lg:hidden" onClick={() => setOpen(false)} />}
      <main className="mx-auto min-h-[calc(100dvh-60px)] max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:min-h-dvh">{children}</main>
    </div>
  );
}
