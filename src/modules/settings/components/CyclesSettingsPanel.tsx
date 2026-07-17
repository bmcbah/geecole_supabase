import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import {
  listCycleCatalog,
  setInstitutionCycle,
} from "../services/academic-structure.service";

export function CyclesSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof listCycleCatalog>>
  >([]);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(
    async () => setItems(await listCycleCatalog(institutionId)),
    [institutionId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );
  const activeCount = items.filter((item) => item.activation?.is_active).length;

  const toggle = async (id: string, active: boolean) => {
    setBusyId(id);
    try {
      await setInstitutionCycle(institutionId, id, active, year?.id);
      await load();
      notify({
        severity: "success",
        summary: active ? "Cycle activé" : "Cycle désactivé",
      });
    } catch {
      notify({ severity: "error", summary: "Modification impossible" });
    } finally {
      setBusyId("");
    }
  };

  const alert = !year ? (
    <Message
      severity="warn"
      text="Sélectionnez une année scolaire avant d’activer les cycles."
    />
  ) : !editable ? (
    <Message
      severity="info"
      text={`${year.name} est clôturée et reste consultable en lecture seule.`}
    />
  ) : undefined;

  return (
    <SettingsTablePanel
      sectionHeader={
        <PageHeader
          title="Cycles"
          description="Sélectionnez les parcours réellement proposés par l’établissement. Les cycles actifs seront disponibles dans la configuration annuelle."
          meta={
            <Tag
              value={`${activeCount} actif${activeCount > 1 ? "s" : ""} sur ${items.length}`}
              severity={activeCount > 0 ? "success" : "secondary"}
            />
          }
          headingAs="h2"
          compact
        />
      }
      alert={alert}
      contentClassName="bg-slate-50 p-4 sm:p-5"
      dataTable={
        <div
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-2"
          data-testid="cycle-catalog"
        >
          {items.map((item) => {
            const active = Boolean(item.activation?.is_active);
            return (
              <article
                className={[
                  "flex min-h-48 flex-col rounded-xl border bg-white p-4 transition",
                  active
                    ? "border-emerald-300 shadow-sm ring-1 ring-emerald-100"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
                ].join(" ")}
                key={item.id}
                data-testid={`cycle-${item.code}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={[
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg",
                      active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    <i className={`pi ${item.icon}`} />
                  </span>
                  <Tag
                    value={active ? "Actif" : "Inactif"}
                    severity={active ? "success" : "secondary"}
                  />
                </div>

                <div className="mt-4 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {item.name}
                    </h3>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {item.code}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <Button
                    label={active ? "Désactiver" : "Activer ce cycle"}
                    icon={active ? "pi pi-times" : "pi pi-check"}
                    size="small"
                    outlined={!active}
                    severity={active ? "secondary" : undefined}
                    disabled={!editable}
                    loading={busyId === item.id}
                    onClick={() => void toggle(item.id, !active)}
                    data-testid={`toggle-${item.code}`}
                    className="w-full justify-center"
                  />
                </div>
              </article>
            );
          })}
        </div>
      }
    />
  );
}
