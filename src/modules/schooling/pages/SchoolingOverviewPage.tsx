import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Skeleton } from "primereact/skeleton";
import { AlertList } from "../../../shared/components/workspace/AlertList";
import { DashboardKpiCard } from "../../../shared/components/workspace/DashboardKpiCard";
import { Workspace } from "../../../shared/components/workspace/Workspace";
import { WorkspaceHeader } from "../../../shared/components/workspace/WorkspaceHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { SchoolingDashboard } from "../domain/schooling-dashboard";
import { getSchoolingDashboard } from "../services/schooling-dashboard.service";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-GN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function SchoolingOverviewPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [data, setData] = useState<SchoolingDashboard>();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setData(await getSchoolingDashboard(institutionId, yearId));
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger la vue d’ensemble.",
      );
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const kpis = useMemo(
    () =>
      data
        ? [
            {
              id: "students",
              label: "Élèves inscrits",
              value: data.kpis.enrolledStudents,
              description: "Inscriptions confirmées pour l’année sélectionnée",
              icon: "pi-users",
              route: "/scolarite/eleves",
            },
            {
              id: "enrollments",
              label: "Dossiers en cours",
              value: data.kpis.enrollmentsInProgress,
              description: "Brouillons, dossiers soumis et préinscriptions",
              icon: "pi-inbox",
              route: "/scolarite/inscriptions",
            },
            {
              id: "pre-registrations",
              label: "Préinscriptions",
              value: data.kpis.preRegistrations,
              description: "Candidats hors effectif confirmé",
              icon: "pi-user-plus",
              route: "/scolarite/inscriptions?origine=pre_enrollment",
            },
            {
              id: "without-class",
              label: "Sans classe",
              value: data.kpis.studentsWithoutClass,
              description: "Élèves confirmés à affecter",
              icon: "pi-sitemap",
              route: "/scolarite/eleves?controle=sans-classe",
            },
            {
              id: "attendance",
              label: "Assiduité à traiter",
              value: data.kpis.attendanceToReview,
              description: "Absences et retards à justifier",
              icon: "pi-calendar-minus",
              route: "/scolarite/assiduite",
            },
            {
              id: "documents",
              label: "Documents à contrôler",
              value: data.kpis.documentsToReview,
              description: "Pièces nécessitant un suivi",
              icon: "pi-folder-open",
              route: "/scolarite/documents",
            },
          ]
        : [],
    [data],
  );

  if (!yearId) {
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  }

  return (
    <Workspace
      header={
        <WorkspaceHeader
          title="Vue d’ensemble"
          description={`Pilotage opérationnel du module Scolarité${year?.name ? ` pour ${year.name}` : ""}.`}
          actions={
            <Button
              label="Actualiser"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              loading={loading}
              onClick={() => void load()}
            />
          }
        />
      }
      feedback={failure ? <Message severity="error" text={failure} /> : undefined}
    >
      <div className="space-y-5">
        <section aria-labelledby="schooling-kpis-title">
          <div className="mb-3">
            <h2 id="schooling-kpis-title" className="m-0 text-base font-semibold text-slate-950">
              Indicateurs de pilotage
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Les volumes qui demandent une lecture immédiate à l’entrée du module.
            </p>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[1120px] grid-cols-6 gap-3">
              {loading && !data
                ? Array.from({ length: 6 }, (_, index) => (
                    <Skeleton key={index} height="8rem" borderRadius="0.5rem" />
                  ))
                : kpis.map((kpi) => (
                    <DashboardKpiCard
                      key={kpi.id}
                      label={kpi.label}
                      value={kpi.value}
                      description={kpi.description}
                      icon={kpi.icon}
                      onOpen={() => navigate(kpi.route)}
                    />
                  ))}
            </div>
          </div>
        </section>

        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 className="m-0 text-base font-semibold text-slate-950">Actions récentes</h2>
              <p className="mt-1 text-xs text-slate-500">
                Dernières opérations enregistrées dans le parcours d’inscription.
              </p>
            </header>
            <div className="divide-y divide-slate-100">
              {data?.recentActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="flex w-full items-center gap-3 border-0 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
                  onClick={() => navigate(action.route)}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                    <i className="pi pi-history text-sm" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold text-slate-950">
                      {action.title}
                    </strong>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {action.description}
                    </span>
                  </span>
                  <time className="shrink-0 text-xs text-slate-400">
                    {formatDate(action.occurredAt)}
                  </time>
                  <i className="pi pi-chevron-right text-[10px] text-slate-400" />
                </button>
              ))}
              {!loading && !data?.recentActions.length ? (
                <div className="px-4 py-12 text-center text-sm text-slate-500">
                  Aucune action récente dans cette année scolaire.
                </div>
              ) : null}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 className="m-0 text-base font-semibold text-slate-950">Alertes du module</h2>
              <p className="mt-1 text-xs text-slate-500">
                Contrôles administratifs, assiduité, notes et bulletins à traiter.
              </p>
            </header>
            <AlertList
              items={data?.alerts ?? []}
              onOpen={(alert) => navigate(alert.route)}
            />
          </section>
        </div>
      </div>
    </Workspace>
  );
}
