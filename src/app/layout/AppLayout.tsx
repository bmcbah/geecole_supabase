import { NavLink, Outlet } from "react-router-dom";
import { Button } from "primereact/button";
import { useAuth } from "../../features/auth/components/auth-context";

export function AppLayout() {
  const { user, signOut } = useAuth();
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
          <div>
            <small>Session active</small>
            <strong>{user?.email}</strong>
          </div>
          <Button
            label="Déconnexion"
            icon="pi pi-sign-out"
            severity="secondary"
            text
            onClick={() => void signOut()}
          />
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
