import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import {
  batchReenrollStudents,
  getReenrollmentPolicy,
  type BatchReenrollmentResult,
} from "../services/reenrollment.service";
import { listStudents } from "../services/schooling.service";
import type { StudentListItem } from "../types/schooling";

export function BatchReenrollmentPage() {
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId, yearId, years, year } = useAcademicSession();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selected, setSelected] = useState<StudentListItem[]>([]);
  const [targetYearId, setTargetYearId] = useState("");
  const [allowed, setAllowed] = useState(true);
  const [resultStatus, setResultStatus] = useState("draft");
  const [results, setResults] = useState<BatchReenrollmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const targetYears = useMemo(
    () =>
      years.filter(
        (item) =>
          item.id !== yearId && ["preparation", "open"].includes(item.status),
      ),
    [yearId, years],
  );
  useEffect(() => {
    if (!institutionId || !yearId) return;
    void Promise.all([
      listStudents(institutionId, yearId),
      getReenrollmentPolicy(institutionId),
    ]).then(([items, policy]) => {
      setStudents(items.filter((item) => item.status === "confirmed"));
      setAllowed(policy.allow_batch);
      setResultStatus(policy.batch_result_status);
      setTargetYearId(targetYears[0]?.id ?? "");
    });
  }, [institutionId, targetYears, yearId]);
  const created = results.filter((item) => item.status === "created").length;
  return (
    <section className="medium-controls space-y-4">
      <PageHeader
        eyebrow={`Scolarité${year?.name ? ` · ${year.name}` : ""}`}
        title="Réinscriptions groupées"
        description="Sélectionnez les élèves à promouvoir vers leur niveau suivant."
        meta={
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
            {selected.length} sélectionné(s)
          </span>
        }
        actions={
          <Button
            label="Retour aux élèves"
            icon="pi pi-arrow-left"
            text
            size="small"
            onClick={() => void navigate("/scolarite/eleves")}
          />
        }
      />
      {!allowed && (
        <Message
          severity="warn"
          text="La réinscription groupée est désactivée dans les règles de l’établissement."
        />
      )}
      <div className="batch-toolbar">
        <label className="field">
          <span>Année cible</span>
          <Dropdown
            value={targetYearId}
            options={targetYears}
            optionLabel="name"
            optionValue="id"
            placeholder="Choisir l’année"
            onChange={(event) => setTargetYearId(String(event.value))}
          />
        </label>
        <Message
          severity="info"
          text={`Les dossiers seront créés avec le statut « ${resultStatus} ». Le niveau suivant doit être configuré et actif.`}
        />
        <Button
          label={`Réinscrire ${selected.length} élève(s)`}
          icon="pi pi-refresh"
          disabled={!allowed || !targetYearId || !selected.length}
          loading={loading}
          size="small"
          onClick={() => {
            setLoading(true);
            setResults([]);
            void batchReenrollStudents(
              selected.map((item) => item.enrollmentId),
              targetYearId,
            )
              .then((items) => {
                setResults(items);
                setSelected([]);
                const successCount = items.filter(
                  (item) => item.status === "created",
                ).length;
                notify({
                  severity: successCount === items.length ? "success" : "warn",
                  summary: `${successCount}/${items.length} réinscriptions créées`,
                });
              })
              .catch(() =>
                notify({ severity: "error", summary: "Traitement impossible" }),
              )
              .finally(() => setLoading(false));
          }}
        />
      </div>
      {results.length > 0 && (
        <Message
          severity={created === results.length ? "success" : "warn"}
          text={`${created} dossier(s) créé(s), ${results.length - created} à corriger. Les erreurs n’annulent pas les dossiers valides.`}
        />
      )}
      <DataTable
        value={students}
        dataKey="id"
        selectionMode="multiple"
        selection={selected}
        onSelectionChange={(event) => setSelected(event.value)}
        paginator
        rows={15}
        emptyMessage="Aucun élève confirmé disponible."
      >
        <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
        <Column field="matricule" header="Matricule" />
        <Column
          header="Élève"
          body={(item: StudentListItem) => `${item.firstName} ${item.lastName}`}
        />
        <Column field="cycleName" header="Cycle actuel" />
        <Column field="levelName" header="Niveau actuel" />
        <Column
          header="Résultat"
          body={(item: StudentListItem) => {
            const result = results.find(
              (entry) => entry.student_id === item.id,
            );
            if (!result) return "—";
            return result.status === "created"
              ? `Créé · ${result.target_level}`
              : result.reason;
          }}
        />
      </DataTable>
    </section>
  );
}
