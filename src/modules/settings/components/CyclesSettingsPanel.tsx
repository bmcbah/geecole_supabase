import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import { Panel } from "../../../shared/components/layout/Panel";
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
    <Panel
      title="Cycles"
      description="Activez uniquement les parcours proposés par l’établissement."
      meta={
        <Tag
          value={`${activeCount} actif${activeCount > 1 ? "s" : ""}`}
          severity="info"
        />
      }
      alerts={alert}
    >
      <div className="divide-y divide-slate-200" data-testid="cycle-catalog">
        {items.map((item) => {
          const active = Boolean(item.activation?.is_active);
          return (
            <article
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
              key={item.id}
              data-testid={`cycle-${item.code}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <i className={`pi ${item.icon}`} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </h3>
                  <Tag
                    value={active ? "Actif" : "Inactif"}
                    severity={active ? "success" : "secondary"}
                  />
                  <span className="text-xs font-medium text-slate-400">
                    {item.code}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>

              <Button
                label={active ? "Désactiver" : "Activer"}
                icon={active ? "pi pi-times" : "pi pi-check"}
                size="small"
                outlined={!active}
                severity={active ? "secondary" : undefined}
                disabled={!editable}
                loading={busyId === item.id}
                onClick={() => void toggle(item.id, !active)}
                data-testid={`toggle-${item.code}`}
              />
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
