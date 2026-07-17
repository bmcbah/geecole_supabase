import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
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

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Cycles</h2>
            <Tag value={`${activeCount} actif${activeCount > 1 ? "s" : ""}`} severity="info" />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Activez uniquement les parcours réellement proposés pendant {year?.name ?? "l’année sélectionnée"}.
          </p>
        </div>
        <Tag
          value={editable ? "Modifiable" : "Lecture seule"}
          severity={editable ? "success" : "secondary"}
        />
      </div>

      {!year && (
        <div className="border-b border-slate-200 bg-amber-50 px-4 py-2">
          <Message
            severity="warn"
            text="Sélectionnez une année scolaire avant d’activer les cycles."
          />
        </div>
      )}

      <div
        className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-3"
        data-testid="cycle-catalog"
      >
        {items.map((item) => {
          const active = Boolean(item.activation?.is_active);
          return (
            <article
              className={`group flex min-h-40 flex-col justify-between bg-white p-4 transition ${
                active ? "ring-1 ring-inset ring-brand-200" : "hover:bg-slate-50"
              }`}
              key={item.id}
              data-testid={`cycle-${item.code}`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                      active
                        ? "bg-brand-50 text-brand-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <i className={`pi ${item.icon}`} />
                  </span>
                  <Tag
                    value={active ? "Actif" : "Inactif"}
                    severity={active ? "success" : "secondary"}
                  />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {item.name}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  {item.code}
                </span>
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
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
