import { NavLink, Outlet } from "react-router-dom";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { useAuth } from "../../modules/auth/components/auth-context";
import { useAcademicSession } from "../../modules/academic-session/components/academic-session-context";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium no-underline transition-colors",
    isActive
      ? "bg-brand-700 text-white"
      : "text-brand-200 hover:bg-white/10 hover:text-white",
  ].join(" ");

export function AppLayout() {
  const { user, signOut } = useAuth();
  const {
    institutions,
    institutionId,
    setInstitutionId,
    years,
    year,
    yearId,
    setYearId,
    canChangeYear,
  } = useAcademicSession();

  return (
    <div className="min-h-screen bg-surface-page text-text-primary lg:flex">
      <aside className="bg-brand-900 p-6 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-[250px]">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-[42px] place-items-center rounded-xl bg-accent-500 text-xl font-extrabold text-brand-900">
            G
          </span>
          <div className="flex flex-col">
            <strong>GeeCole</strong>
            <small className="text-brand-300">Gestion scolaire</small>
          </div>
        </div>

        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
          <NavLink to="/scolarite/eleves" className={navLinkClassName}>
            <i className="pi pi-graduation-cap" /> Scolarité
          </NavLink>
          <NavLink to="/parametrage" className={navLinkClassName}>
            <i className="pi pi-cog" /> Paramétrage
          </NavLink>
        </nav>
      </aside>

      <section className="min-w-0 flex-1 lg:ml-[250px]">
        <header className="flex min-h-[72px] flex-col gap-4 border-b border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-end md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            {institutions.length > 1 && (
              <Dropdown
                className="min-w-64"
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
            )}

            <div className="flex flex-col items-start gap-1">
              <small className="text-xs text-text-muted">Année de travail</small>
              <Dropdown
                className="min-w-44"
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
            </div>

            {year && (
              <Tag
                value={year.status === "open" ? "En cours" : year.status}
                severity={year.status === "open" ? "success" : "secondary"}
              />
            )}
          </div>

          <div className="flex items-center gap-3 md:ml-4">
            <span className="max-w-64 truncate text-sm text-text-muted">
              {user?.email}
            </span>
            <Button
              label="Déconnexion"
              icon="pi pi-sign-out"
              severity="secondary"
              text
              onClick={() => void signOut()}
            />
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] p-4 md:p-8">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
