import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  changePeriodStatus,
  listPeriodsForManagement,
  type PeriodManagementRow,
} from "../services/notes.service";

const statusLabels = {
  planned: "À venir",
  open: "Saisies ouvertes",
  closed: "Clôturée",
} as const;

export function AcademicPeriodsManagementPage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [periods, setPeriods] = useState<PeriodManagementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setError("");
    try {
      setPeriods(await listPeriodsForManagement(institutionId, yearId));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger les périodes.",
      );
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cycles = useMemo(() => {
    const grouped = new Map<string, PeriodManagementRow[]>();
    for (const period of periods)
      grouped.set(period.cycleId, [
        ...(grouped.get(period.cycleId) ?? []),
        period,
      ]);
    return [...grouped.entries()];
  }, [periods]);

  function requestTransition(
    period: PeriodManagementRow,
    target: "open" | "closed",
  ) {
    confirmDialog({
      header: target === "open" ? "Ouvrir les saisies" : "Clôturer la période",
      message:
        target === "open"
          ? `Ouvrir ${period.name} pour le cycle ${period.cycleName} ? Toute autre période ouverte de ce cycle sera clôturée.`
          : `Clôturer ${period.name} ? Les notes et appréciations passeront en lecture seule.`,
      icon: target === "open" ? "pi pi-play" : "pi pi-lock",
      acceptLabel: target === "open" ? "Ouvrir" : "Clôturer",
      rejectLabel: "Annuler",
      acceptClassName: target === "closed" ? "p-button-danger" : undefined,
      accept: () => {
        void (async () => {
          try {
            await changePeriodStatus(period.id, target);
            await load();
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Transition impossible.",
            );
          }
        })();
      },
    });
  }

  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <ConfirmDialog />
      <PageHeader
        eyebrow="Notes & Bulletins"
        title="Gestion des périodes"
        description={`Piloter l’ouverture des saisies par cycle · ${year?.name ?? "Année active"}`}
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
      <Message
        severity="info"
        text="Les périodes et leurs dates sont définies dans Paramétrage. Ici, la direction ouvre ou clôture les saisies. Une seule période peut être ouverte par cycle."
      />
      {error ? <Message severity="error" text={error} /> : null}
      {!loading && !cycles.length ? (
        <Message
          severity="warn"
          text="Aucune période n’est configurée pour cette année scolaire."
        />
      ) : null}
      <div className="space-y-4">
        {cycles.map(([cycleId, cyclePeriods]) => {
          const rows = [...(cyclePeriods ?? [])].sort(
            (a, b) => a.sequence - b.sequence,
          );
          const current = rows.find((period) => period.status === "open");
          return (
            <section
              key={cycleId}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h2 className="m-0 text-sm font-semibold text-slate-950">
                    {rows[0]?.cycleName}
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-slate-500">
                    {current
                      ? `${current.name} est ouverte aux saisies`
                      : "Aucune période ouverte"}
                  </p>
                </div>
                <Tag
                  value={current ? "Saisies en cours" : "Saisies fermées"}
                  severity={current ? "success" : "secondary"}
                />
              </header>
              <div className="overflow-x-auto p-4">
                <ol className="flex min-w-[620px] items-start">
                  {rows.map((period, index) => (
                    <li
                      key={period.id}
                      className="relative flex min-w-0 flex-1 flex-col items-center px-2 text-center"
                    >
                      {index > 0 ? (
                        <span className="absolute right-1/2 top-3 h-0.5 w-full bg-slate-200" />
                      ) : null}
                      <span
                        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${period.status === "open" ? "border-blue-600 bg-blue-600 text-white" : period.status === "closed" ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-500"}`}
                      >
                        {period.sequence}
                      </span>
                      <strong className="mt-2 text-xs text-slate-900">
                        {period.name}
                      </strong>
                      <span className="mt-0.5 text-[11px] text-slate-500">
                        {formatDate(period.startsOn)} –{" "}
                        {formatDate(period.endsOn)}
                      </span>
                      <Tag
                        className="mt-2 text-[10px]"
                        value={statusLabels[period.status]}
                        severity={
                          period.status === "open"
                            ? "success"
                            : period.status === "closed"
                              ? "info"
                              : "secondary"
                        }
                      />
                      <div className="mt-2 h-8">
                        {period.status === "open" ? (
                          <Button
                            size="small"
                            label="Clôturer"
                            icon="pi pi-lock"
                            severity="secondary"
                            text
                            onClick={() => requestTransition(period, "closed")}
                          />
                        ) : period.status === "planned" ? (
                          <Button
                            size="small"
                            label="Ouvrir"
                            icon="pi pi-play"
                            text
                            onClick={() => requestTransition(period, "open")}
                          />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}
