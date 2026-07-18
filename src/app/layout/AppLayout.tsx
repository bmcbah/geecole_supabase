import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { useAuth } from "../../modules/auth/components/auth-context";
import { useAcademicSession } from "../../modules/academic-session/components/academic-session-context";

type NavigationItem = { label: string; icon: string; to: string };
type NavigationGroup = {
  label: string;
  icon: string;
  match: string;
  to?: string;
  items?: NavigationItem[];
};

const navigation: NavigationGroup[] = [
  {
    label: "Scolarité",
    icon: "pi-graduation-cap",
    match: "/scolarite",
    items: [
      { label: "Élèves", icon: "pi-users", to: "/scolarite/eleves" },
      { label: "Nouvelle inscription", icon: "pi-user-plus", to: "/scolarite/inscriptions/nouvelle" },
      { label: "Réinscriptions groupées", icon: "pi-refresh", to: "/scolarite/reinscriptions" },
    ],
  },
  {
    label: "Paramétrage",
    icon: "pi-cog",
    match: "/parametrage",
    to: "/parametrage/etablissement",
  },
];

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors",
    isActive
      ? "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
  ].join(" ");

export function AppLayout() {
  const { user, signOut } = useAuth();
  const {
    institutions,
    institution,
    institutionId,
    setInstitutionId,
    years,
    year,
    yearId,
    setYearId,
    canChangeYear,
  } = useAcademicSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const routeGroup = navigation.find((group) => location.pathname.startsWith(group.match)) ?? navigation[0];
  const initialGroup = routeGroup.items?.length ? routeGroup : navigation.find((group) => group.items?.length) ?? navigation[0];
  const [selectedGroupLabel, setSelectedGroupLabel] = useState(initialGroup.label);
  const [secondaryMenuOpen, setSecondaryMenuOpen] = useState(Boolean(routeGroup.items?.length));
  const selectedGroup = navigation.find((group) => group.label === selectedGroupLabel && group.items?.length) ?? initialGroup;

  const activePage = useMemo(() => {
    for (const group of navigation) {
      const item = group.items?.find((entry) => location.pathname.startsWith(entry.to));
      if (item) return { group: group.label, page: item.label };
      if (group.to && location.pathname.startsWith(group.match)) {
        return { group: group.label, page: "Administration" };
      }
    }
    return { group: "GeeCole", page: "Tableau de bord" };
  }, [location.pathname]);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  const handleGroupClick = (group: NavigationGroup) => {
    if (group.to) {
      setSecondaryMenuOpen(false);
      void navigate(group.to);
      closeMobileSidebar();
      return;
    }

    setSelectedGroupLabel(group.label);
    setSecondaryMenuOpen(true);
  };

  const sidebar = (
    <div className="flex h-full bg-slate-50 text-slate-900">
      <div className="flex w-[76px] shrink-0 flex-col bg-brand-950 text-white">
        <button
          type="button"
          className="grid h-[72px] place-items-center border-b border-white/10"
          aria-label="Accueil GeeCole"
          onClick={() => {
            void navigate("/scolarite/eleves");
            closeMobileSidebar();
          }}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-accent-500 text-lg font-extrabold text-brand-950">G</span>
        </button>

        <nav aria-label="Rubriques principales" className="flex flex-1 flex-col gap-2 px-2 py-4">
          {navigation.map((group) => {
            const active = location.pathname.startsWith(group.match);
            const selected = secondaryMenuOpen && selectedGroup.label === group.label;
            return (
              <button
                key={group.label}
                type="button"
                className={[
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-colors",
                  active || selected
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-brand-100 hover:bg-white/10 hover:text-white",
                ].join(" ")}
                aria-pressed={active || selected}
                title={group.label}
                onClick={() => handleGroupClick(group)}
              >
                <i className={`pi ${group.icon} text-base`} />
                <span className="text-[10px] font-semibold leading-tight">{group.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {secondaryMenuOpen ? (
        <div className="flex min-w-0 w-[244px] flex-col border-r border-slate-200 bg-white">
          <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-4">
            <div className="min-w-0">
              <strong className="block truncate text-sm font-semibold text-slate-950">GeeCole</strong>
              <small className="block truncate text-xs text-slate-500">{institution?.name ?? "Gestion scolaire"}</small>
            </div>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Réduire le menu secondaire"
              title="Réduire le menu"
              onClick={() => setSecondaryMenuOpen(false)}
            >
              <i className="pi pi-angle-left" />
            </button>
          </div>

          <div className="border-b border-slate-200 p-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg bg-brand-700 px-3 py-2.5 text-left font-semibold text-white shadow-sm transition hover:bg-brand-800"
              onClick={() => {
                void navigate("/scolarite/inscriptions/nouvelle");
                closeMobileSidebar();
              }}
            >
              <i className="pi pi-user-plus" />
              <span className="flex-1 text-sm">Inscrire un élève</span>
              <i className="pi pi-arrow-right text-xs" />
            </button>
          </div>

          <nav aria-label={`Menu ${selectedGroup.label}`} className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-3 px-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Module</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">{selectedGroup.label}</h2>
            </div>
            <div className="space-y-1">
              {selectedGroup.items?.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClassName} onClick={closeMobileSidebar}>
                  {({ isActive }) => (
                    <>
                      <i className={`pi ${item.icon} ${isActive ? "text-brand-700" : "text-slate-400 group-hover:text-slate-700"}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {isActive ? <span className="size-1.5 rounded-full bg-brand-700" aria-hidden="true" /> : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{user?.email ?? "Utilisateur"}</p>
                <p className="text-xs text-slate-500">Session active</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden lg:block ${secondaryMenuOpen ? "w-[320px]" : "w-[76px]"}`}>{sidebar}</aside>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer la navigation" className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm" onClick={closeMobileSidebar} />
          <aside className={`relative h-full shadow-2xl ${secondaryMenuOpen ? "w-[min(94vw,320px)]" : "w-[76px]"}`}>{sidebar}</aside>
        </div>
      ) : null}

      <section className={`min-w-0 transition-[padding] duration-200 ${secondaryMenuOpen ? "lg:pl-[320px]" : "lg:pl-[76px]"}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[72px] items-center gap-3 px-4 md:px-6 xl:px-8">
            <button
              type="button"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
              aria-label="Ouvrir la navigation"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <i className="pi pi-bars" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <span>{activePage.group}</span>
                <i className="pi pi-chevron-right text-[9px]" />
                <span className="truncate text-brand-700">{activePage.page}</span>
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{institution?.name ?? "Espace de gestion"}</p>
            </div>

            <div className="hidden items-center gap-2 xl:flex">
              <Button label="Nouvelle inscription" icon="pi pi-user-plus" size="small" onClick={() => void navigate("/scolarite/inscriptions/nouvelle")} />
              <Button label="Réinscriptions" icon="pi pi-refresh" severity="secondary" outlined size="small" onClick={() => void navigate("/scolarite/reinscriptions")} />
            </div>

            <div className="hidden h-8 w-px bg-slate-200 md:block" />

            <div className="hidden items-center gap-2 md:flex">
              {institutions.length > 1 ? (
                <Dropdown
                  className="w-52"
                  value={institutionId}
                  options={institutions}
                  optionLabel="name"
                  optionValue="id"
                  aria-label="Établissement de la session"
                  onChange={(event) => {
                    const value = event.value as unknown;
                    if (typeof value === "string") setInstitutionId(value);
                  }}
                />
              ) : null}
              <Dropdown
                className="w-44"
                value={yearId}
                options={years}
                optionLabel="name"
                optionValue="id"
                placeholder="Aucune année"
                aria-label="Année scolaire de la session"
                disabled={!canChangeYear}
                onChange={(event) => {
                  const value = event.value as unknown;
                  if (typeof value === "string") setYearId(value);
                }}
              />
              {year ? <Tag value={year.status === "open" ? "En cours" : year.status} severity={year.status === "open" ? "success" : "secondary"} /> : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 pr-2 text-left shadow-sm hover:bg-slate-50"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((value) => !value)}
              >
                <span className="grid size-8 place-items-center rounded-md bg-brand-700 text-sm font-bold text-white">{(user?.email?.[0] ?? "U").toUpperCase()}</span>
                <i className="pi pi-chevron-down hidden text-[9px] text-slate-400 sm:block" />
              </button>

              {profileOpen ? (
                <div className="absolute right-0 top-11 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{user?.email}</p>
                    <p className="text-xs text-slate-500">Compte utilisateur</p>
                  </div>
                  <button type="button" className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setProfileOpen(false); void navigate("/parametrage/utilisateurs-roles"); }}>
                    <i className="pi pi-users" /> Personnes et accès
                  </button>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setProfileOpen(false); void navigate("/parametrage/etablissement"); }}>
                    <i className="pi pi-cog" /> Paramètres
                  </button>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => void signOut()}>
                    <i className="pi pi-sign-out" /> Déconnexion
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
            {institutions.length > 1 ? (
              <Dropdown className="min-w-52" value={institutionId} options={institutions} optionLabel="name" optionValue="id" onChange={(event) => { const value = event.value as unknown; if (typeof value === "string") setInstitutionId(value); }} />
            ) : null}
            <Dropdown className="min-w-44" value={yearId} options={years} optionLabel="name" optionValue="id" placeholder="Aucune année" disabled={!canChangeYear} onChange={(event) => { const value = event.value as unknown; if (typeof value === "string") setYearId(value); }} />
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 md:p-6 xl:p-8"><Outlet /></main>
      </section>
    </div>
  );
}
