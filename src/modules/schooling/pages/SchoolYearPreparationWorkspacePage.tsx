import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import {
  batchAssignEnrollments,
  listAssignableEnrollments,
  listClassOccupancy,
} from "../services/schooling-operations.service";

type ClassRow = {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  occupancy: number;
  is_active: boolean;
};

type EnrollmentRow = {
  id: string;
  level_name_snapshot: string;
  student: { first_name: string; last_name: string; matricule: string };
  currentAssignment: { class_id: string; class_name_snapshot: string } | null;
};

export function SchoolYearPreparationWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [selected, setSelected] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      const [classRows, enrollmentRows] = await Promise.all([
        listClassOccupancy(yearId),
        listAssignableEnrollments(institutionId, yearId),
      ]);
      setClasses(classRows as ClassRow[]);
      setEnrollments(enrollmentRows as EnrollmentRow[]);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Impossible de charger la préparation de rentrée.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => { void load(); }, [load]);

  const levelOptions = useMemo(() => Array.from(new Set(enrollments.map((item) => item.level_name_snapshot))).filter(Boolean).sort().map((value) => ({ label: value, value })), [enrollments]);
  const unassigned = useMemo(() => enrollments.filter((item) => !item.currentAssignment && (!selectedLevel || item.level_name_snapshot === selectedLevel)), [enrollments, selectedLevel]);
  const assigned = useMemo(() => enrollments.filter((item) => item.currentAssignment && (!selectedLevel || item.level_name_snapshot === selectedLevel)), [enrollments, selectedLevel]);
  const activeClasses = useMemo(() => classes.filter((item) => item.is_active), [classes]);
  const overloaded = useMemo(() => classes.filter((item) => item.capacity !== null && item.occupancy > item.capacity), [classes]);

  const assign = async () => {
    if (!targetClass || selected.length === 0) return;
    setFailure("");
    try {
      await batchAssignEnrollments(selected.map((item) => item.id), targetClass, "Préparation de rentrée");
      setSuccess(`${selected.length} élève(s) affecté(s).`);
      setSelected([]);
      setTargetClass("");
      await load();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "L'affectation n'a pas pu être enregistrée.");
    }
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Préparation de rentrée"
      description="Finalisez la répartition des élèves, traitez les dossiers sans classe et contrôlez les capacités avant la rentrée."
      alert={failure ? <Message severity="error" text={failure} /> : success ? <Message severity="success" text={success} /> : undefined}
      toolbar={
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[280px_1fr]">
          <Dropdown value={selectedLevel} options={[{ label: "Tous les niveaux", value: "" }, ...levelOptions]} onChange={(event) => setSelectedLevel(String(event.value))} placeholder="Filtrer par niveau" />
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span><strong>{unassigned.length}</strong> élève(s) sans classe</span>
            <span><strong>{assigned.length}</strong> élève(s) réparti(s)</span>
            <span><strong>{overloaded.length}</strong> classe(s) en dépassement</span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold">Élèves à répartir</h2>
              <p className="m-0 text-sm text-slate-500">Sélectionnez les élèves d'un même niveau puis affectez-les à une classe.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dropdown value={targetClass} options={activeClasses} optionLabel="name" optionValue="id" placeholder="Classe cible" onChange={(event) => setTargetClass(String(event.value))} />
              <Button label={`Affecter (${selected.length})`} icon="pi pi-users" disabled={!targetClass || selected.length === 0} onClick={() => void assign()} />
            </div>
          </div>
          <DataTable value={unassigned} loading={loading} selection={selected} onSelectionChange={(event) => setSelected(event.value)} dataKey="id" paginator rows={15} emptyMessage="Tous les élèves sont affectés.">
            <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
            <Column header="Élève" body={(row: EnrollmentRow) => <div><strong>{row.student.first_name} {row.student.last_name}</strong><small className="block text-slate-500">{row.student.matricule}</small></div>} />
            <Column field="level_name_snapshot" header="Niveau" />
          </DataTable>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">État des classes</h2>
          <DataTable value={classes} loading={loading} dataKey="id" emptyMessage="Aucune classe configurée.">
            <Column field="name" header="Classe" />
            <Column field="code" header="Code" />
            <Column header="Effectif" body={(row: ClassRow) => `${row.occupancy} / ${row.capacity ?? "∞"}`} />
            <Column header="Situation" body={(row: ClassRow) => {
              if (row.capacity === null) return <Tag value="Capacité non définie" severity="secondary" />;
              if (row.occupancy > row.capacity) return <Tag value="Dépassement" severity="danger" />;
              if (row.occupancy === row.capacity) return <Tag value="Complète" severity="warning" />;
              return <Tag value={`${row.capacity - row.occupancy} place(s)`} severity="success" />;
            }} />
          </DataTable>
        </section>
      </div>
    </SchoolingPanel>
  );
}
