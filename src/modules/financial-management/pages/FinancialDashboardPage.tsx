import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  getProfileFinancialDashboard,
  type FinancialDashboardAlert,
  type FinancialDashboardRole,
  type ProfileFinancialDashboard,
} from "../services/financial-dashboard-profile.service";

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} GNF`;
const dateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

const roleLabels: Record<FinancialDashboardRole, string> = {
  owner: "Direction",
  admin: "Administration",
  finance: "Service financier",
  secretary: "Secrétariat",
  teacher: "Enseignant",
};

function KpiCard({
  label,
  value,
  detail,
  icon,
  emphasis = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  emphasis?: "neutral" | "success" | "warning" | "danger";
}) {
  const accent =
    emphasis === "success"
      ? "bg-emerald-50 text-emerald-700"
      : emphasis === "warning"
        ? "bg-amber-50 text-amber-700"
        : emphasis === "danger"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-700";

  return (
    <article className="flex min-h-32 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${accent}`}>
          <i className={icon} />
        </span>
      </div>
      <div>
        <strong className="block text-2xl font-bold tracking-tight text-slate-950">{value}</strong>
        <span className="mt-1 block text-xs text-slate-500">{detail}</span>
      </div>
    </article>
  );
}

function AlertRow({ alert, onOpen }: { alert: FinancialDashboardAlert; onOpen: () => void }) {
  const style =
    alert.severity === "danger"
      ? "border-red-200 bg-red-50/70"
      : alert.severity === "warning"
        ? "border-amber-200 bg-amber-50/70"
        : "border-blue-200 bg-blue-50/70";

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${style}`}>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm text-slate-950">{alert.title}</strong>
        <span className="mt-0.5 block text-xs text-slate-600">{alert.detail}</span>
      </div>
      <Button label={alert.actionLabel} size="small" severity="secondary" outlined onClick={onOpen} />
    </div>
  );
}

export function FinancialDashboardPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [data, setData] = useState<ProfileFinancialDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setData(await getProfileFinancialDashboard(institutionId, yearId));
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Impossible de charger la vue d’ensemble financière.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const dashboard = data.dashboard;

    if (data.role === "finance") {
      return [
        { label: "Encaissé aujourd’hui", value: money(dashboard.collectedToday), detail: `${dashboard.paymentCountToday} opération(s)`, icon: "pi pi-wallet", emphasis: "success" as const },
        { label: "À recouvrer", value: money(dashboard.totalOutstanding), detail: `${dashboard.partialAccountCount + dashboard.unpaidAccountCount} dossier(s) ouverts`, icon: "pi pi-chart-line", emphasis: "warning" as const },
        { label: "En retard", value: money(dashboard.overdueAmount), detail: `${dashboard.overdueStudentCount} élève(s)`, icon: "pi pi-exclamation-triangle", emphasis: "danger" as const },
        { label: "Échéances du jour", value: money(dashboard.dueTodayAmount), detail: `${dashboard.dueTodayCount} échéance(s)`, icon: "pi pi-calendar", emphasis: "warning" as const },
      ];
    }

    if (data.role === "secretary") {
      return [
        { label: "Dossiers générés", value: String(dashboard.accountCount), detail: "Inscriptions prises en charge", icon: "pi pi-folder", emphasis: "neutral" as const },
        { label: "À générer", value: String(data.confirmedEnrollmentsWithoutAccount), detail: "Inscriptions confirmées", icon: "pi pi-file-plus", emphasis: "warning" as const },
        { label: "Responsables manquants", value: String(data.missingFinancialResponsibles), detail: "Dossiers à compléter", icon: "pi pi-user-edit", emphasis: "danger" as const },
        { label: "Dossiers soldés", value: `${dashboard.settledAccountCount}/${dashboard.accountCount}`, detail: "Situation des élèves", icon: "pi pi-check-circle", emphasis: "success" as const },
      ];
    }

    if (data.role === "teacher") {
      return [
        { label: "Dossiers actifs", value: String(dashboard.accountCount), detail: "Année scolaire en cours", icon: "pi pi-folder", emphasis: "neutral" as const },
        { label: "Dossiers soldés", value: String(dashboard.settledAccountCount), detail: "Information synthétique", icon: "pi pi-check-circle", emphasis: "success" as const },
        { label: "Échéances à venir", value: String(dashboard.dueSoonCount), detail: "Dans les 30 prochains jours", icon: "pi pi-calendar", emphasis: "neutral" as const },
      ];
    }

    return [
      { label: "Montant appelé", value: money(dashboard.totalBilled), detail: `${dashboard.accountCount} dossier(s)`, icon: "pi pi-file", emphasis: "neutral" as const },
      { label: "Taux de recouvrement", value: `${dashboard.collectionRate.toFixed(1)} %`, detail: money(dashboard.totalCollected), icon: "pi pi-percentage", emphasis: "success" as const },
      { label: "Reste à encaisser", value: money(dashboard.totalOutstanding), detail: `${dashboard.partialAccountCount + dashboard.unpaidAccountCount} dossier(s)`, icon: "pi pi-chart-line", emphasis: "warning" as const },
      { label: "Risque de retard", value: money(dashboard.overdueAmount), detail: `${dashboard.overdueStudentCount} élève(s)`, icon: "pi pi-exclamation-triangle", emphasis: "danger" as const },
    ];
  }, [data]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`}
        title="Vue d’ensemble"
        description="Vos indicateurs, alertes et tâches selon votre rôle dans l’établissement."
        actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />}
      />

      {failure ? <Message severity="error" text={failure} /> : null}

      {data ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Espace personnalisé</span>
              <h2 className="m-0 mt-1 text-lg font-semibold text-slate-950">Bonjour {data.profileName}</h2>
            </div>
            <Tag value={roleLabels[data.role]} severity="info" />
          </section>

          <section className={`grid gap-3 ${kpis.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
            {kpis.map((item) => <KpiCard key={item.label} {...item} />)}
          </section>

          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="m-0 text-base font-semibold text-slate-950">Alertes et tâches prioritaires</h2>
                <p className="mt-1 text-sm text-slate-500">Ce qui demande une action immédiate dans votre périmètre.</p>
              </div>
              <div className="space-y-2 p-4">
                {data.alerts.length
                  ? data.alerts.map((alert) => <AlertRow key={alert.key} alert={alert} onOpen={() => navigate(alert.actionPath)} />)
                  : <Message severity="success" text="Aucune alerte prioritaire pour le moment." />}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="m-0 text-base font-semibold text-slate-950">Activité récente</h2>
                <p className="mt-1 text-sm text-slate-500">Dernières opérations financières enregistrées.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {data.recentActivities.length
                  ? data.recentActivities.map((activity) => (
                    <div key={activity.key} className="flex gap-3 px-4 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                        <i className={activity.icon} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-slate-950">{activity.title}</strong>
                        <span className="block truncate text-xs text-slate-500">{activity.detail}</span>
                      </div>
                      <time className="shrink-0 text-[11px] text-slate-400">{dateTime(activity.occurredAt)}</time>
                    </div>
                  ))
                  : <div className="p-4 text-sm text-slate-500">Aucune activité récente.</div>}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
