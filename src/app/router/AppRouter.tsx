import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProgressSpinner } from "primereact/progressspinner";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { AcademicSessionProvider } from "../../modules/academic-session/components/AcademicSessionProvider";

const LoginPage = lazy(() =>
  import("../../modules/auth/pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../../modules/settings/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const InvitationPage = lazy(() =>
  import("../../modules/auth/pages/InvitationPage").then((module) => ({
    default: module.InvitationPage,
  })),
);
const StudentsPage = lazy(() =>
  import("../../modules/schooling/pages/StudentsPage").then((module) => ({
    default: module.StudentsPage,
  })),
);
const StudentProfilePage = lazy(() =>
  import("../../modules/schooling/pages/StudentProfilePage").then((module) => ({
    default: module.StudentProfilePage,
  })),
);
const EnrollmentPage = lazy(() =>
  import("../../modules/schooling/pages/EnrollmentPage").then((module) => ({
    default: module.EnrollmentPage,
  })),
);
const ReenrollmentPage = lazy(() =>
  import("../../modules/schooling/pages/ReenrollmentPage").then((module) => ({
    default: module.ReenrollmentPage,
  })),
);
const BatchReenrollmentPage = lazy(() =>
  import("../../modules/schooling/pages/BatchReenrollmentPage").then(
    (module) => ({ default: module.BatchReenrollmentPage }),
  ),
);
const FinancialAccountsPage = lazy(() =>
  import("../../modules/financial-management/pages/FinancialAccountsWorkspacePage").then(
    (module) => ({ default: module.FinancialAccountsWorkspacePage }),
  ),
);
const FinancialAccountDetailPage = lazy(() =>
  import("../../modules/financial-management/pages/FinancialAccountDetailPage").then(
    (module) => ({ default: module.FinancialAccountDetailPage }),
  ),
);
const FinancialPaymentsPage = lazy(() =>
  import("../../modules/financial-management/pages/FinancialPaymentsPage").then(
    (module) => ({ default: module.FinancialPaymentsPage }),
  ),
);
const EmployeesPage = lazy(() =>
  import("../../modules/personnel/pages/EmployeesPage").then((module) => ({
    default: module.EmployeesPage,
  })),
);
const EmployeeProfilePage = lazy(() =>
  import("../../modules/personnel/pages/EmployeeProfilePage").then(
    (module) => ({ default: module.EmployeeProfilePage }),
  ),
);
const WorkEntriesPage = lazy(() =>
  import("../../modules/personnel/pages/WorkEntriesPage").then((module) => ({
    default: module.WorkEntriesPage,
  })),
);
const LeaveRequestsPage = lazy(() =>
  import("../../modules/personnel/pages/LeaveRequestsPage").then((module) => ({
    default: module.LeaveRequestsPage,
  })),
);
const PayrollPage = lazy(() =>
  import("../../modules/personnel/pages/PayrollPage").then((module) => ({
    default: module.PayrollPage,
  })),
);
const PayrollStatementPage = lazy(() =>
  import("../../modules/personnel/pages/PayrollStatementPage").then(
    (module) => ({ default: module.PayrollStatementPage }),
  ),
);
const PersonnelFunctionsSettingsPage = lazy(() =>
  import("../../modules/personnel/pages/PersonnelFunctionsSettingsPage").then(
    (module) => ({ default: module.PersonnelFunctionsSettingsPage }),
  ),
);
const ContractTypesSettingsPage = lazy(() =>
  import("../../modules/personnel/pages/ContractTypesSettingsPage").then(
    (module) => ({ default: module.ContractTypesSettingsPage }),
  ),
);
const WorkTypesSettingsPage = lazy(() =>
  import("../../modules/personnel/pages/WorkTypesSettingsPage").then(
    (module) => ({ default: module.WorkTypesSettingsPage }),
  ),
);
const BonusTypesSettingsPage = lazy(() =>
  import("../../modules/personnel/pages/BonusTypesSettingsPage").then(
    (module) => ({ default: module.BonusTypesSettingsPage }),
  ),
);
const DeductionTypesSettingsPage = lazy(() =>
  import("../../modules/personnel/pages/DeductionTypesSettingsPage").then(
    (module) => ({ default: module.DeductionTypesSettingsPage }),
  ),
);
const AdvanceTypesSettingsPage = lazy(() =>
  import("../../modules/personnel/pages/AdvanceTypesSettingsPage").then(
    (module) => ({ default: module.AdvanceTypesSettingsPage }),
  ),
);
const LeaveTypesSettingsPage = lazy(() =>
  import("../../modules/personnel/pages/LeaveTypesSettingsPage").then(
    (module) => ({ default: module.LeaveTypesSettingsPage }),
  ),
);
const SanctionTypesSettingsPage = lazy(() =>
  import("../../modules/personnel/pages/SanctionTypesSettingsPage").then(
    (module) => ({ default: module.SanctionTypesSettingsPage }),
  ),
);

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center">
          <ProgressSpinner aria-label="Chargement de la page" />
        </div>
      }
    >
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/invitation" element={<InvitationPage />} />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <AcademicSessionProvider>
                <AppLayout />
              </AcademicSessionProvider>
            }
          >
            <Route
              index
              element={<Navigate to="/parametrage/etablissement" replace />}
            />
            <Route
              path="/etablissement"
              element={<Navigate to="/parametrage/etablissement" replace />}
            />
            <Route path="/parametrage/:section?" element={<SettingsPage />} />
            <Route
              path="/gestion-financiere/configuration/:section"
              element={<SettingsPage />}
            />
            <Route path="/scolarite/eleves" element={<StudentsPage />} />
            <Route
              path="/scolarite/inscriptions/nouvelle"
              element={<EnrollmentPage />}
            />
            <Route
              path="/scolarite/eleves/:studentId"
              element={<StudentProfilePage />}
            />
            <Route
              path="/scolarite/eleves/:studentId/reinscription"
              element={<ReenrollmentPage />}
            />
            <Route
              path="/scolarite/reinscriptions"
              element={<BatchReenrollmentPage />}
            />
            <Route
              path="/gestion-financiere/dossiers"
              element={<FinancialAccountsPage />}
            />
            <Route
              path="/gestion-financiere/dossiers/:accountId"
              element={<FinancialAccountDetailPage />}
            />
            <Route
              path="/gestion-financiere/encaissements"
              element={<FinancialPaymentsPage />}
            />
            <Route path="/personnel/employes" element={<EmployeesPage />} />
            <Route
              path="/personnel/employes/:employeeId"
              element={<EmployeeProfilePage />}
            />
            <Route path="/personnel/heures" element={<WorkEntriesPage />} />
            <Route path="/personnel/conges" element={<LeaveRequestsPage />} />
            <Route path="/personnel/paie" element={<PayrollPage />} />
            <Route
              path="/personnel/paie/:periodId/bulletins/:entryId"
              element={<PayrollStatementPage />}
            />
            <Route
              path="/parametrage/personnel/fonctions"
              element={<PersonnelFunctionsSettingsPage />}
            />
            <Route
              path="/parametrage/personnel/contrats"
              element={<ContractTypesSettingsPage />}
            />
            <Route
              path="/parametrage/personnel/activites"
              element={<WorkTypesSettingsPage />}
            />
            <Route
              path="/parametrage/personnel/primes"
              element={<BonusTypesSettingsPage />}
            />
            <Route
              path="/parametrage/personnel/retenues"
              element={<DeductionTypesSettingsPage />}
            />
            <Route
              path="/parametrage/personnel/avances"
              element={<AdvanceTypesSettingsPage />}
            />
            <Route
              path="/parametrage/personnel/conges"
              element={<LeaveTypesSettingsPage />}
            />
            <Route
              path="/parametrage/personnel/sanctions"
              element={<SanctionTypesSettingsPage />}
            />
            <Route
              path="/parametrage/catalogues-personnel"
              element={
                <Navigate to="/parametrage/personnel/fonctions" replace />
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
