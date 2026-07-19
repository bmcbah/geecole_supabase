import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { useAuth } from "../../modules/auth/components/auth-context";
import { useAcademicSession } from "../../modules/academic-session/components/academic-session-context";
import { getNavigationLinks, navigation, type NavigationGroup } from "../navigation";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium leading-snug no-underline transition-colors",
    isActive
      ? "border-brand-200 bg-brand-50 text-brand-700"
      : "border-transparent bg-transparent text-slate-700 hover:border-brand-100 hover:bg-brand-50/60 hover:text-brand-700",
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
  const initialGroup = getNavigationLinks(routeGroup).length
    ? routeGroup
    : navigation.find((group) => getNavigationLinks(group).length) ?? navigation[0];
  const [selectedGroupLabel, setSelectedGroupLabel] = useState(initialGroup.label);
  const [secondaryMenuOpen, setSecondaryMenuOpen] = useState(getNavigationLinks(routeGroup).length > 0);
  const selectedGroup = navigation.find(
    (group) => group.label === selectedGroupLabel && getNavigationLinks(group).length > 0,
  ) ?? initialGroup;

  const activePage = useMemo(() => {
    for (const group of navigation) {
      const item = getNavigationLinks(group).find((entry) => location.pathname.startsWith(entry.to));
      if (item) return { group: group.label, page: item.label };
      if (group.to && location.pathname.startsWith(group.match)) {
        return { group: group.label, page: "Administration" };
      }
    }
    return { group: "GeeCole", page: "Tableau de bord" };
  }, [location.pathname]);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  const handleGroupClick = (group: NavigationGroup) => {
    const firstDestination = getNavigationLinks(group)[0]?.to ?? group.to;

    if (getNavigationLinks(group).length) {
      setSelectedGroupLabel(group.label);
      setSecondaryMenuOpen(true);
    } else {
      setSecondaryMenuOpen(false);
    }

    if (firstDestination) void navigate(firstDestination);
    closeMobileSidebar();
  };

  const sidebar = (
    <div className="relative flex h-full bg-white text-slate-900">
      <div className="flex w-[96px] shrink-0 flex-col bg-brand-700 text-white shadow-[4px_0_20px_rgba(15,118,110,0.2)]">
        <div className="shrink-0 px-2.5 pt-4">
          <button
            type="button"
            className="flex min-h-[68px] w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent bg-brand-700 px-2 py-2.5 text-center text-white"
            aria-label="Accueil GeeCole"
            title="GeeCole"
            onClick={() => {
              void navigate("/scolarite/eleves");
              closeMobileSidebar();
            }}
          >
            <span className="relative block text-[28px] font-black leading-none tracking-[-0.12em] text-white" aria-hidden="true">
              G
              <span className="absolute -right-1 bottom-0 size-1 rounded-full bg-white" />
            </span>
            <span className="text-[10px] font-semibold leading-none text-white">GeeCole</span>
          </button>
        </div>

        <nav aria-label="Rubriques principales" className="flex flex-1 flex-col items-stretch gap-2 px-2.5 py-3">
          {navigation.map((group) => {
            const active = location.pathname.startsWith(group.match);
            const selected = secondaryMenuOpen && selectedGroup.label === group.label;
            return (
              <button
                key={group.label}
                type="button"
                className={[
                  "flex min-h-[68px] w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2.5 text-center transition-colors",
                  active || selected
                    ? "border-white/30 bg-brand-600 text-white"
                    : "border-transparent bg-transparent text-white/80 hover:bg-white/10 hover:text-white",
                ].join(" ")}
                aria-pressed={active || selected}
                title={group.label}
                onClick={() => handleGroupClick(group)}
              >
                <i className={`pi ${group.icon} text-lg`} />
                <span className="w-full break-words text-[11px] font-semibold leading-tight">{group.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {secondaryMenuOpen ? (
        <div className="relative flex w-[240px] min-w-0 flex-col border-r border-brand-100 bg-white lg:w-[248px] xl:w-[256px]">
          <button
            type="button"
            className="absolute -right-3.5 top-[22px] z-20 grid size-8 place-items-center rounded-full border border-brand-300 bg-white text-brand-700 shadow-md transition hover:border-brand-500 hover:text-brand-800"
            aria-label="Réduire le menu secondaire"
            title="Réduire le menu"
            onClick={() => setSecondaryMenuOpen(false)}
          >
            <i className="pi pi-angle-left text-sm" />
          </button>

          <div className="flex h-[72px] shrink-0 items-center border-b border-brand-100 px-4 pr-8">
            <div className="min-w-0">
              <strong className="block truncate text-sm font-semibold text-slate-950">{selectedGroup.label}</strong>
              <small className="block truncate text-xs text-slate-500">{institution?.name ?? "Gestion scolaire"}</small>
            </div>
          </div>

          <nav aria-label={`Menu ${selectedGroup.label}`} className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
            <div className="space-y-1.5">
              {selectedGroup.items?.map((item, index) => {
                if (item.type === "divider") {
                  return <div key={`divider-${index}`} className="my-3 border-t border-slate-200" aria-hidden="true" />;
                }

                if (item.type === "title") {
                  return (
                    <p key={`title-${item.label}`} className="px-2.5  text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {item.label}
                    </p>
                  );
                }

                return (
                  <NavLink key={item.to} to={item.to} className={navLinkClassName} onClick={closeMobileSidebar}>
                    {({ isActive }) => (
                      <>
                        <span className="grid pt-2 mx-1 shrink-0 place-items-center">
                          <i className={`pi ${item.icon} text-center ${isActive ? "text-brand-700" : "text-slate-400 group-hover:text-brand-700"}`} />
                        </span>
                        <span className="min-w-0 flex-1 whitespace-normal break-words">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-brand-100 p-3">
            <div className="flex min-h-[60px] items-center gap-3 rounded-lg bg-brand-50 px-3 py-2.5">
              <span className="grid size-9 ps-2 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{user?.email ?? "Utilisateur"}</p>
                <p className="text-xs text-brand-700">Session active</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="absolute left-[82px] top-[22px] z-20 grid size-8 place-items-center rounded-full border border-brand-300 bg-white text-brand-700 shadow-md transition hover:border-brand-500 hover:text-brand-800"
          aria-label="Ouvrir le menu secondaire"
          title="Ouvrir le menu"
          onClick={() => {
            setSelectedGroupLabel(initialGroup.label);
            setSecondaryMenuOpen(true);
          }}
        >
          <i className="pi pi-angle-right text-sm" />
        </button>
      )}
    </div>
  );

  const sidebarWidth = secondaryMenuOpen ? "lg:w-[344px] xl:w-[352px]" : "lg:w-[96px]";
  const contentPadding = secondaryMenuOpen ? "lg:pl-[344px] xl:pl-[352px]" : "lg:pl-[96px]";

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden lg:block ${sidebarWidth}`}>{sidebar}</aside>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer la navigation" className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm" onClick={closeMobileSidebar} />
          <aside className={`relative h-full shadow-2xl ${secondaryMenuOpen ? "w-[min(96vw,336px)]" : "w-[96px]"}`}>{sidebar}</aside>
        </div>
      ) : null}

      <section className={`min-w-0 transition-[padding] duration-200 ${contentPadding}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[72px] items-center gap-3 px-4 md:px-6 xl:px-8">
            <button type="button" className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden" aria-label="Ouvrir la navigation" onClick={() => setMobileSidebarOpen(true)}>
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

            <div className="hidden h-8 w-px bg-slate-200 md:block" />

            <div className="hidden items-center gap-2 md:flex">
              {institutions.length > 1 ? (
                <Dropdown className="w-52" value={institutionId} options={institutions} optionLabel="name" optionValue="id" aria-label="Établissement de la session" onChange={(event) => { const value = event.value as unknown; if (typeof value === "string") setInstitutionId(value); }} />
              ) : null}
              <Dropdown className="w-44" value={yearId} options={years} optionLabel="name" optionValue="id" placeholder="Aucune année" aria-label="Année scolaire de la session" disabled={!canChangeYear} onChange={(event) => { const value = event.value as unknown; if (typeof value === "string") setYearId(value); }} />
              {year ? <Tag value={year.status === "open" ? "En cours" : year.status} severity={year.status === "open" ? "success" : "secondary"} /> : null}
            </div>

            <div className="relative">
              <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 pr-2 text-left shadow-sm hover:bg-slate-50" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>
                <span className="grid size-9 place-items-center rounded-md bg-brand-700 text-sm font-bold text-white">{(user?.email?.[0] ?? "U").toUpperCase()}</span>
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

        <main className="mx-auto max-w-[1440px] p-4 md:p-2 xl:p-4"><Outlet /></main>
      </section>
    </div>
  );
}
