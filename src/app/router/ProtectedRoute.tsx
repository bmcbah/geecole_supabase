import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAuth } from "../../modules/auth/components/auth-context";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="center-screen">
        <ProgressSpinner aria-label="Chargement de la session" />
      </div>
    );
  if (!user)
    return (
      <Navigate to="/connexion" replace state={{ from: location.pathname }} />
    );
  return <Outlet />;
}
