import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { useAuth } from "../../modules/auth/components/auth-context";
import { useAcademicSession } from "../../modules/academic-session/components/academic-session-context";

type NavigationItem = {
  label: string;
  icon: string;
  to: string;
};

type NavigationGroup = {
  label: string;
  icon: string;
  match: string;
  items: NavigationItem[];
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
    items: [
      { label: "Général", icon: "pi-building", to: "/parametrage/etablissement" },
      { label: "Années scolaires", icon: "pi-calendar", to: "/parametrage/annees-scolaires" },
      { label: "Cycles", icon: "pi-sitemap", to: "/parametrage/cycles" },
      { label: "Niveaux", icon: "pi-list", to: "/parametrage/niveaux" },
      { label: "Classes", icon: "pi-th-large", to: "/parametrage/classes" },
      { label: "Matières", icon: "pi-book", to: "/parametrage/matieres" },
      { label: "Types de notes", icon: "pi-tags", to: "/parametrage/types-notes" },
      { label: "Formules de calcul", icon: "pi-percentage", to: "/parametrage/formules-calcul" },
      { label: "Frais et règles", icon: "pi-wallet", to: "/parametrage/regles-financieres" },
      { label: "Personnes et accès", icon: "pi-id-card", to: "/parametrage/utilisateurs-roles" },
    ],
  },
];

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-all",
    isActive
      ? "bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-100"
      : "text-emerald-100/80 hover:bg-white/10 hover:text-white",
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navigation.map((group) => [group.label, location.pathname.startsWith(group.match)])),
  );

  const activePage = useMemo(() => {
    for (const group of navigation) {
      const item = group.items.find((entry) => location.pathname.startsWith(entry.to));
      if (item) return { group: group.label, page: item.label };
    }
    return { group: "GeeCole", page: "Tableau de bord" };
  }, [location.pathname]);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);
  const toggleGroup = (label: string) =>
    setExpandedGroups((current) => ({ ...current, [label]: !current[label] }));

  const sidebar = (
    <div className="flex h-full flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white">
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
        <button
          type="button"
          className="flex items-center gap-3 text-left"
          onClick={() => {
            void navigate("/scolarite/eleves");
            closeMobileSidebar();
          }}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-300 text-lg font-black text-emerald-950 shadow-lg shadow-emerald-950/20">
            G
          </span>
          <span className="flex min-w-0 flex-col">
            <strong className="text-base tracking-tight">GeeCole</strong>
            <small className="truncate text-xs text-emerald-200/70">
              {institution?.name ?? "Gestion scolaire"}
            </small>
          </span>
        </button>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-lg text-emerald-200 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Fermer la navigation"
          onClick={closeMobileSidebar}
        >
          <i className="pi pi-times" />
        </button>
      </div>

      <div className="border-b border-white/10 px-4 py-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-800/60 px-3 py-3 text-left shadow-sm transition hover:bg-emerald-800"
          onClick={() => {
            void navigate("/scolarite/inscriptions/nouvelle");
            closeMobileSidebar();
          }}
        >
          <span className="grid size-9 place-items-center rounded-lg bg-emerald-300 text-emerald-950">
            <i className="pi pi-user-plus" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Inscrire un élève</span>
            <span className="block truncate text-xs text-emerald-200/70">Nouvelle inscription</span>
          </span>
          <i className="pi pi-arrow-right text-xs text-emerald-300" />
        </button>
      </div>

      <nav aria-label="Navigation principale" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {navigation.map((group) => {
          const expanded = expandedGroups[group.label] ?? false;
          const active = location.pathname.startsWith(group.match);
          return (
            <section key={group.label}>
              <button
                type="button"
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                  active ? "bg-emerald-800/50 text-white" : "text-emerald-200/80 hover:bg-white/5 hover:text-white",
                ].join(" ")}
                aria-expanded={expanded}
                onClick={() => toggleGroup(group.label)}
              >
                <i className={`pi ${group.icon} w-5 text-center`} />
                <span className="flex-1">{group.label}</span>
                <i className={`pi pi-chevron-down text-[10px] transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
              {expanded ? (
                <div className="mt-1 space-y-1 border-l border-emerald-300/20 pl-3">
                  {group.items.map((item) => (
                    <NavLink key={item.to} to={item.to} className={navLinkClassName} onClick={closeMobileSidebar}>
                      <i className={`pi ${item.icon} w-4 text-center text-xs`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white ring-1 ring-white/10">
            {(user?.email?.[0] ?? "U").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.email ?? "Utilisateur"}</p>
            <p className="text-xs text-emerald-200/60">Session active</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-emerald-50/40 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">{sidebar}</aside>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer la navigation" className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm" onClick={closeMobileSidebar} />
          <aside className="relative h-full w-[min(88vw,288px)] shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      <section className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center gap-3 px-4 md:px-6 xl:px-8">
            <button type="button" className="grid size-10 shrink-0 place-items-center rounded-lg border border-emerald-200 bg-white text-emerald-800 shadow-sm hover:bg-emerald-50 lg:hidden" aria-label="Ouvrir la navigation" onClick={() => setMobileSidebarOpen(true)}>
              <i className="pi pi-bars" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <span>{activePage.group}</span>
                <i className="pi pi-chevron-right text-[9px] text-emerald-400" />
                <span className="truncate text-slate-600">{activePage.page}</span>
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">{institution?.name ?? "Espace de gestion"}</p>
            </div>

            <div className="hidden items-center gap-2 xl:flex">
              <Button label="Nouvelle inscription" icon="pi pi-user-plus" size="small" onClick={() => void navigate("/scolarite/inscriptions/nouvelle")} />
              <Button label="Réinscriptions" icon="pi pi-refresh" severity="secondary" outlined size="small" onClick={() => void navigate("/scolarite/reinscriptions")} />
            </div>

            <div className="hidden h-8 w-px bg-emerald-100 md:block" />

            <div className="hidden items-center gap-2 md:flex">
              {institutions.length > 1 ? (
                <Dropdown className="w-52" value={institutionId} options={institutions} optionLabel="name" optionValue="id" aria-label="Établissement de la session" onChange={(event) => {
                  const value = event.value as unknown;
                  if (typeof value === "string") setInstitutionId(value);
                }} />
              ) : null}
              <Dropdown className="w-44" value={yearId} options={years} optionLabel="name" optionValue="id" placeholder="Aucune année" aria-label="Année scolaire de la session" disabled={!canChangeYear} onChange={(event) => {
                const value = event.value as unknown;
                if (typeof value === "string") setYearId(value);
              }} />
              {year ? <Tag value={year.status === "open" ? "En cours" : year.status} severity={year.status === "open" ? "success" : "secondary"} /> : null}
            </div>

            <div className="relative">
              <button type="button" className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white p-1.5 pr-2 text-left shadow-sm hover:bg-emerald-50" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800">{(user?.email?.[0] ?? "U").toUpperCase()}</span>
                <i className="pi pi-chevron-down hidden text-[10px] text-slate-500 sm:block" />
              </button>
              {profileOpen ? (
                <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-xl border border-emerald-100 bg-white p-2 shadow-xl">
                  <div className="border-b border-emerald-50 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{user?.email}</p>
                    <p className="text-xs text-slate-500">Compte utilisateur</p>
                  </div>
                  <button type="button" className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-900" onClick={() => {
                    setProfileOpen(false);
                    void navigate("/parametrage/utilisateurs-roles");
                  }}><i className="pi pi-users" /> Personnes et accès</button>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-900" onClick={() => {
                    setProfileOpen(false);
                    void navigate("/parametrage/etablissement");
                  }}><i className="pi pi-cog" /> Paramètres</button>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => void signOut()}><i className="pi pi-sign-out" /> Déconnexion</button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-emerald-50 px-4 py-2 md:hidden">
            {institutions.length > 1 ? <Dropdown className="min-w-52" value={institutionId} options={institutions} optionLabel="name" optionValue="id" onChange={(event) => {
              const value = event.value as unknown;
              if (typeof value === "string") setInstitutionId(value);
            }} /> : null}
            <Dropdown className="min-w-44" value={yearId} options={years} optionLabel="name" optionValue="id" placeholder="Aucune année" disabled={!canChangeYear} onChange={(event) => {
              const value = event.value as unknown;
              if (typeof value === "string") setYearId(value);
            }} />
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 md:p-6 xl:p-8"><Outlet /></main>
      </section>
    </div>
  );
}
