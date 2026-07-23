import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { SchoolingPanel } from "../components/SchoolingPanel";
import type {
  SchoolingOverviewAlert,
  SchoolingOverviewData,
  SchoolingOverviewKpi,
  SchoolingOverviewSeverity,
} from "../domain/schooling-overview";
import { getSchoolingOverview } from "../services/schooling-overview.service";

const severityConfig: Record<
  SchoolingOverviewSeverity,
  { label: string; badge: string; accent: string; icon: string }
> = {
  blocking: {
    label: "Blocage",
    badge: "bg-red-50 text-red-700 ring-red-200",
    accent: "border-l-red-500",
    icon: "pi-ban",
  },
  warning: {
    label: "Avertissement",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    accent: "border-l-amber-500",
    icon: "pi-exclamation-triangle",
  },
  information: {
    label: "Information",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    accent: "border-l-blue-500",
    icon: "pi-info-circle",
  },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-GN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function KpiCard({ item, onOpen }: { item: SchoolingOverviewKpi; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="group flex min-h-36 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200"
      onClick={onOpen}
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="block min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
          title={item.label}>
          {item.label}
        </span>
        <MetricIcon icon={item.icon} />
      </span>
      <strong className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {item.value}
      </strong>
      <span className="mt-auto block w-full min-w-0 truncate pt-3 text-xs leading-5 text-slate-500"
        title={item.description}>
        {item.description}
      </span>
    </button>
  );
}

function AlertRow({ item, onOpen }: { item: SchoolingOverviewAlert; onOpen: () => void }) {
  const config = severityConfig[item.severity];
  return (
    <div className={`border-l-4 ${config.accent} px-4 py-4`}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.badge}`}
            >
              <i className={`pi ${config.icon} text-[11px]`} />
              {config.label}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {item.domain}
            </span>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold text-slate-900">
                {item.title}
              </strong>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-slate-950 px-2.5 py-1 text-sm font-semibold text-white">
              {item.count}
            </span>
          </div>
        </div>
        <Button
          label="Ouvrir"
          icon="pi pi-arrow-right"
          iconPos="right"
          severity="secondary"
          text
          size="small"
          onClick={onOpen}
        />
      </div>
    </div>
  );
}

export function SchoolingOverviewPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [data, setData] = useState<SchoolingOverviewData>();
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setData(await getSchoolingOverview(institutionId, yearId));
    } catch (cause) {
      console.error(cause);
      setFailure("Impossible de charger la vue d’ensemble de la scolarité.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo<SchoolingOverviewKpi[]>(
    () =>
      data
        ? [
            {
              id: "enrolled-students",
              label: "Élèves inscrits",
              value: data.kpis.enrolledStudents,
              description: "Inscriptions confirmées pour l’année sélectionnée",
              icon: "pi-users",
              route: "/scolarite/eleves",
            },
            {
              id: "enrollments-in-progress",
              label: "Dossiers en cours",
              value: data.kpis.enrollmentsInProgress,
              description: "Brouillons et préinscriptions à poursuivre",
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
              id: "students-without-class",
              label: "Sans classe",
              value: data.kpis.studentsWithoutClass,
              description: "Élèves confirmés à affecter",
              icon: "pi-sitemap",
              route: "/scolarite/eleves?controle=sans-classe",
            },
            {
              id: "attendance-to-review",
              label: "Assiduité à traiter",
              value: data.kpis.attendanceToReview,
              description: "Absences et retards à justifier",
              icon: "pi-calendar-minus",
              route: "/scolarite/assiduite",
            },
            {
              id: "documents-to-review",
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
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant d’ouvrir la vue d’ensemble."
      />
    );
  }

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Vue d’ensemble"
      description="Pilotez les inscriptions, les affectations, l’assiduité et les documents depuis un seul espace."
      actions={
        <Button
          label="Actualiser"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          className="h-10 rounded-xl border-slate-200 px-3 text-sm"
          loading={loading}
          onClick={() => void load()}
        />
      }
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
    >
      {loading && !data ? (
        <div className="grid min-h-[420px] place-items-center">
          <div className="text-center">
            <ProgressSpinner className="size-10" strokeWidth="4" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              Chargement de la vue d’ensemble…
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full min-w-0 space-y-5">
          <section className="w-full min-w-0" aria-labelledby="schooling-kpis-title">
            <div className="mb-3">
              <h2 id="schooling-kpis-title" className="m-0 text-sm font-semibold text-slate-900">
                Indicateurs de pilotage
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Les volumes qui demandent une lecture immédiate à l’entrée du module.
              </p>
            </div>
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              {kpis.map((item) => (
                <KpiCard key={item.id} item={item} onOpen={() => void navigate(item.route)} />
              ))}
            </div>
          </section>

          <div className="grid w-full min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 px-4 py-4">
                <h2 className="m-0 text-sm font-semibold text-slate-900">Actions récentes</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Dernières opérations enregistrées dans le parcours d’inscription.
                </p>
              </header>
              <div className="divide-y divide-slate-100">
                {data?.recentActivities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    className="flex w-full items-center gap-3 border-0 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
                    onClick={() => void navigate(activity.route)}
                  >
                    <MetricIcon icon="pi-history" />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-semibold text-slate-900">
                        {activity.title}
                      </strong>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {activity.description}
                      </span>
                    </span>
                    <time className="hidden shrink-0 text-xs text-slate-400 sm:block">
                      {formatDate(activity.occurredAt)}
                    </time>
                    <i className="pi pi-chevron-right text-[10px] text-slate-400" />
                  </button>
                ))}
                {!data?.recentActivities.length ? (
                  <div className="px-4 py-12 text-center text-sm text-slate-500">
                    Aucune activité récente pour cette année scolaire.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 px-4 py-4">
                <h2 className="m-0 text-sm font-semibold text-slate-900">Alertes du module</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Blocages, avertissements et informations nécessitant une attention.
                </p>
              </header>
              <div className="divide-y divide-slate-100">
                {data?.alerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    item={alert}
                    onOpen={() => void navigate(alert.route)}
                  />
                ))}
                {!data?.alerts.length ? (
                  <div className="grid min-h-56 place-items-center px-5 py-10 text-center">
                    <div>
                      <MetricIcon icon="pi-check" size="md" className="mx-auto" />
                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        Aucune alerte à traiter
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Les contrôles disponibles ne signalent aucun point d’attention.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      )}
    </SchoolingPanel>
  );
}
