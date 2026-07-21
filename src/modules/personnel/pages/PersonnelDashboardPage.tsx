import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Skeleton } from "primereact/skeleton";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { PersonnelDashboard } from "../domain/personnel";
import { getPersonnelDashboard } from "../services/personnel.service";

const alertRoute: Record<string, string> = {
  contract_expiring: "/personnel/employes",
  document_expiring: "/personnel/employes",
  leave_pending: "/personnel/conges",
};

export function PersonnelDashboardPage() {
  const navigate = useNavigate();
  const { institutionId } = useAcademicSession();
  const [data, setData] = useState<PersonnelDashboard>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    setError(undefined);
    try {
      setData(await getPersonnelDashboard(institutionId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chargement impossible",
      );
    }
  }, [institutionId]);
  useEffect(() => void load(), [load]);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Bonjour, que faut-il traiter ?"
        description="Les priorités du personnel et de la paie, réunies au même endroit."
        actions={
          <Button
            label="Ajouter un employé"
            icon="pi pi-user-plus"
            onClick={() => navigate("/personnel/employes?nouveau=1")}
          />
        }
      />
      {error && <Message severity="error" text={error} />}
      <section
        aria-label="Raccourcis du module"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {data
          ? [
              ["Effectif actif", data.activeEmployees, "/personnel/employes"],
              ["Congés à traiter", data.pendingLeaves, "/personnel/conges"],
              [
                "Heures à valider",
                data.workEntriesToValidate,
                "/personnel/heures",
              ],
              ["Avances en cours", data.activeAdvances, "/personnel/employes"],
              ["Paies ouvertes", data.openPayrollPeriods, "/personnel/paie"],
            ].map(([label, value, route]) => (
              <button
                key={String(label)}
                className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onClick={() => navigate(String(route))}
              >
                <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                  <i className="pi pi-arrow-up-right text-slate-300 transition group-hover:text-emerald-600" />
                </span>
                <strong className="mt-2 block text-2xl text-slate-900">
                  {value}
                </strong>
              </button>
            ))
          : Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} height="6.5rem" borderRadius="0.75rem" />
            ))}
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Priorités</h2>
            <p className="mt-1 text-sm text-slate-500">
              Échéances et demandes classées par date.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.alerts.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Aucune alerte dans les seuils configurés.
              </div>
            )}
            {data?.alerts.map((alert) => (
              <button
                key={`${alert.alert_type}-${alert.employee_id}-${alert.due_on}`}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
                onClick={() =>
                  navigate(
                    alert.alert_type === "leave_pending"
                      ? (alertRoute[alert.alert_type] ?? "/personnel/conges")
                      : `/personnel/employes/${alert.employee_id}`,
                  )
                }
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700">
                  <i className="pi pi-bell" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-900">
                    {alert.title}
                  </strong>
                  <span className="text-sm text-slate-500">{alert.detail}</span>
                </span>
                <time className="text-xs font-medium text-slate-500">
                  {new Date(`${alert.due_on}T00:00:00`).toLocaleDateString(
                    "fr-FR",
                  )}
                </time>
                <i className="pi pi-chevron-right text-slate-400" />
              </button>
            ))}
          </div>
        </section>
        <aside className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Accès rapides
          </span>
          <h2 className="mb-4 mt-1 text-lg font-semibold text-slate-950">
            Continuer mon travail
          </h2>
          <div className="space-y-2">
            {([
              ["Consulter les employés", "pi-users", "/personnel/employes"],
              ["Valider les heures", "pi-clock", "/personnel/heures"],
              ["Traiter les congés", "pi-calendar-minus", "/personnel/conges"],
              ["Préparer la paie", "pi-wallet", "/personnel/paie"],
            ] as const).map(([label, icon, route]) => (
              <button
                key={route}
                className="flex w-full items-center gap-3 rounded-xl border border-teal-100 bg-white px-3 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-800"
                onClick={() => navigate(route)}
              >
                <i className={`pi ${icon} text-teal-600`} />
                <span className="flex-1">{label}</span>
                <i className="pi pi-chevron-right text-xs text-teal-500" />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
