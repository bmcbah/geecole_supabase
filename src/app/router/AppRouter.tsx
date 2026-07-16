import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProgressSpinner } from "primereact/progressspinner";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

const LoginPage = lazy(() =>
  import("../../features/auth/pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const InstitutionPage = lazy(() =>
  import("../../features/institutions/pages/InstitutionPage").then(
    (module) => ({ default: module.InstitutionPage }),
  ),
);
const SettingsPage = lazy(() =>
  import("../../features/settings/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="content-state">
          <ProgressSpinner aria-label="Chargement de la page" />
        </div>
      }
    >
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/etablissement" replace />} />
            <Route path="/etablissement" element={<InstitutionPage />} />
            <Route path="/parametrage" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
