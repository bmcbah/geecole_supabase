import { NavLink, Outlet } from "react-router-dom";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { useAuth } from "../../features/auth/components/auth-context";
import { useAcademicSession } from "../../features/academic-session/components/academic-session-context";

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
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GeeCole</strong>
            <small>Gestion scolaire</small>
          </div>
        </div>
        <nav aria-label="Navigation principale">
          <NavLink to="/etablissement">
            <i className="pi pi-building" /> Établissement
          </NavLink>
          <NavLink to="/parametrage">
            <i className="pi pi-cog" /> Paramétrage
          </NavLink>
        </nav>
      </aside>
      <section className="app-workspace">
        <header className="app-header">
          <div className="session-selectors">
            {institutions.length > 1 && (
              <Dropdown
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
            <div className="year-session-selector">
              <small>Année de travail</small>
              <Dropdown
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
          <div className="session-user">
            <span>{user?.email}</span>
            <Button
              label="Déconnexion"
              icon="pi pi-sign-out"
              severity="secondary"
              text
              onClick={() => void signOut()}
            />
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
