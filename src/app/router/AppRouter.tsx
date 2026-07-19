import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProgressSpinner } from "primereact/progressspinner";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { AcademicSessionProvider } from "../../modules/academic-session/components/AcademicSessionProvider";

const LoginPage = lazy(() => import("../../modules/auth/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const SettingsPage = lazy(() => import("../../modules/settings/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const InvitationPage = lazy(() => import("../../modules/auth/pages/InvitationPage").then((module) => ({ default: module.InvitationPage })));
const StudentsPage = lazy(() => import("../../modules/schooling/pages/StudentsPage").then((module) => ({ default: module.StudentsPage })));
const StudentProfilePage = lazy(() => import("../../modules/schooling/pages/StudentProfilePage").then((module) => ({ default: module.StudentProfilePage })));
const EnrollmentPage = lazy(() => import("../../modules/schooling/pages/EnrollmentPage").then((module) => ({ default: module.EnrollmentPage })));
const ReenrollmentPage = lazy(() => import("../../modules/schooling/pages/ReenrollmentPage").then((module) => ({ default: module.ReenrollmentPage })));
const BatchReenrollmentPage = lazy(() => import("../../modules/schooling/pages/BatchReenrollmentPage").then((module) => ({ default: module.BatchReenrollmentPage })));
const FinancialAccountsPage = lazy(() => import("../../modules/financial-management/pages/FinancialAccountsWorkspacePage").then((module) => ({ default: module.FinancialAccountsWorkspacePage })));
const FinancialAccountDetailPage = lazy(() => import("../../modules/financial-management/pages/FinancialAccountDetailPage").then((module) => ({ default: module.FinancialAccountDetailPage })));
const FinancialPaymentsPage = lazy(() => import("../../modules/financial-management/pages/FinancialPaymentsPage").then((module) => ({ default: module.FinancialPaymentsPage })));
const TeacherWorkspacePage = lazy(() => import("../../modules/grades/pages/TeacherWorkspacePage").then((module) => ({ default: module.TeacherWorkspacePage })));
const TeachingAssignmentsPage = lazy(() => import("../../modules/grades/pages/TeachingAssignmentsPage").then((module) => ({ default: module.TeachingAssignmentsPage })));
const GradebookPage = lazy(() => import("../../modules/grades/pages/GradebookPage").then((module) => ({ default: module.GradebookPage })));
const DeliberationsPage = lazy(() => import("../../modules/grades/pages/DeliberationsPage").then((module) => ({ default: module.DeliberationsPage })));
const ReportCardsPage = lazy(() => import("../../modules/grades/pages/ReportCardsPage").then((module) => ({ default: module.ReportCardsPage })));

export function AppRouter() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><ProgressSpinner aria-label="Chargement de la page" /></div>}>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/invitation" element={<InvitationPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AcademicSessionProvider><AppLayout /></AcademicSessionProvider>}>
            <Route index element={<Navigate to="/parametrage/etablissement" replace />} />
            <Route path="/etablissement" element={<Navigate to="/parametrage/etablissement" replace />} />
            <Route path="/parametrage/:section?" element={<SettingsPage />} />
            <Route path="/gestion-financiere/configuration/:section" element={<SettingsPage />} />
            <Route path="/scolarite/eleves" element={<StudentsPage />} />
            <Route path="/scolarite/inscriptions/nouvelle" element={<EnrollmentPage />} />
            <Route path="/scolarite/eleves/:studentId" element={<StudentProfilePage />} />
            <Route path="/scolarite/eleves/:studentId/reinscription" element={<ReenrollmentPage />} />
            <Route path="/scolarite/reinscriptions" element={<BatchReenrollmentPage />} />
            <Route path="/gestion-financiere/dossiers" element={<FinancialAccountsPage />} />
            <Route path="/gestion-financiere/dossiers/:accountId" element={<FinancialAccountDetailPage />} />
            <Route path="/gestion-financiere/encaissements" element={<FinancialPaymentsPage />} />
            <Route path="/notes" element={<Navigate to="/notes/mes-classes" replace />} />
            <Route path="/notes/mes-classes" element={<TeacherWorkspacePage />} />
            <Route path="/notes/affectations" element={<TeachingAssignmentsPage />} />
            <Route path="/notes/cahier" element={<GradebookPage />} />
            <Route path="/notes/deliberations" element={<DeliberationsPage />} />
            <Route path="/notes/bulletins" element={<ReportCardsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
