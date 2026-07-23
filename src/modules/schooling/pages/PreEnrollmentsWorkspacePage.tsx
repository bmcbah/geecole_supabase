import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import {
  changeEnrollmentStatus,
  listEnrollmentWorkflows,
  type EnrollmentWorkflowRow,
} from "../services/schooling-workflows.service";

export function PreEnrollmentsWorkspacePage() {
  const { institutionId, yearId, years, year } = useAcademicSession();
  const futureYears = useMemo(
    () =>
      years.filter(
        (item) =>
          item.id !== yearId && ["preparation", "open"].includes(item.status),
      ),
    [yearId, years],
  );
  const [targetYearId, setTargetYearId] = useState("");
  const [items, setItems] = useState<EnrollmentWorkflowRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  useEffect(
    () => setTargetYearId((current) => current || futureYears[0]?.id || ""),
    [futureYears],
  );

  const load = useCallback(async () => {
    if (!institutionId || !targetYearId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setFailure("");
    try {
      const rows = await listEnrollmentWorkflows(institutionId, targetYearId);
      setItems(
        rows.filter((item) =>
          ["draft", "pre_registered", "rejected", "withdrawn"].includes(
            item.status,
          ),
        ),
      );
    } catch {
      setFailure(
        "Impossible de charger les préinscriptions de l’année future.",
      );
    } finally {
      setLoading(false);
    }
  }, [institutionId, targetYearId]);

  useEffect(() => void load(), [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return items.filter(
      (item) =>
        !normalized ||
        `${item.student.first_name} ${item.student.last_name} ${item.student.matricule} ${item.level_name_snapshot}`
          .toLocaleLowerCase("fr")
          .includes(normalized),
    );
  }, [items, query]);

  if (!futureYears.length)
    return (
      <Message
        severity="info"
        text="Aucune année future en préparation n’est disponible pour les préinscriptions."
      />
    );

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année active"}`}
      title="Préinscriptions"
      description="Préparez les nouveaux candidats pour une année future sans les compter dans les effectifs de l’année active."
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <Dropdown
            value={targetYearId}
            options={futureYears}
            optionLabel="name"
            optionValue="id"
            placeholder="Année cible"
            onChange={(event) => setTargetYearId(String(event.value))}
          />
          <span className="p-input-icon-left min-w-64 flex-1">
            <i className="pi pi-search" />
            <InputText
              className="w-full"
              value={query}
              placeholder="Nom, matricule ou niveau demandé"
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </div>
      }
    >
      <DataTable
        value={filtered}
        loading={loading}
        paginator
        rows={15}
        dataKey="id"
        size="small"
        emptyMessage="Aucune préinscription trouvée."
      >
        <Column
          header="Candidat"
          body={(row: EnrollmentWorkflowRow) => (
            <div>
              <strong>
                {row.student.first_name} {row.student.last_name}
              </strong>
              <small className="block text-slate-500">
                {row.student.matricule}
              </small>
            </div>
          )}
        />
        <Column field="cycle_name_snapshot" header="Cycle demandé" />
        <Column field="level_name_snapshot" header="Niveau demandé" />
        <Column
          header="Statut"
          body={(row: EnrollmentWorkflowRow) => (
            <Tag
              value={
                row.status === "pre_registered"
                  ? "Préinscrit"
                  : row.status === "draft"
                    ? "Brouillon"
                    : row.status === "rejected"
                      ? "Refusé"
                      : "Retiré"
              }
              severity={
                row.status === "pre_registered"
                  ? "info"
                  : row.status === "draft"
                    ? "secondary"
                    : "warning"
              }
            />
          )}
        />
        <Column
          header="Actions"
          body={(row: EnrollmentWorkflowRow) => (
            <div className="flex gap-2">
              {row.status === "draft" ? (
                <Button
                  label="Préinscrire"
                  icon="pi pi-send"
                  size="small"
                  outlined
                  onClick={() =>
                    void changeEnrollmentStatus(
                      row.id,
                      "pre_registered",
                      "",
                    ).then(load)
                  }
                />
              ) : null}
              {row.status === "pre_registered" ? (
                <Button
                  label="Convertir"
                  icon="pi pi-check"
                  size="small"
                  onClick={() =>
                    void changeEnrollmentStatus(
                      row.id,
                      "confirmed",
                      "Conversion lors de l’ouverture de l’année cible",
                    ).then(load)
                  }
                />
              ) : null}
            </div>
          )}
        />
      </DataTable>
    </SchoolingPanel>
  );
}
