import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
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
    <Card
      title="Cycles de l’établissement"
      subTitle="Activez les cycles proposés par votre établissement. Le référentiel est administré depuis la base."
    >
      {!year && (
        <Message
          severity="warn"
          text="Sélectionnez une année scolaire avant d’activer les cycles."
        />
      )}
      <div className="cycle-catalog-grid" data-testid="cycle-catalog">
        {items.map((item) => {
          const active = Boolean(item.activation?.is_active);
          return (
            <article
              className={`cycle-choice-card ${active ? "is-active" : ""}`}
              key={item.id}
              data-testid={`cycle-${item.code}`}
            >
              <div className="cycle-choice-icon">
                <i className={`pi ${item.icon}`} />
              </div>
              <div>
                <div className="cycle-choice-title">
                  <h3>{item.name}</h3>
                  <Tag
                    value={active ? "Actif" : "Inactif"}
                    severity={active ? "success" : "secondary"}
                  />
                </div>
                <p>{item.description}</p>
                <small>{item.code}</small>
              </div>
              <Button
                label={active ? "Désactiver" : "Activer"}
                icon={active ? "pi pi-times" : "pi pi-check"}
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
    </Card>
  );
}
