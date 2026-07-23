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
  academic_year_level_id: string;
  is_active: boolean;
};

type EnrollmentRow = {
  id: string;
  academic_year_level_id: string;
  level_name_snapshot: string;
  student: { first_name: string; last_name: string; matricule: string };
  currentAssignment: { class_id: string; class_name_snapshot: string } | null;
};

export function SchoolYearPreparationWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState("");
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
      setFailure(
        error instanceof Error
          ? error.message
          : "Impossible de charger la préparation de rentrée.",
      );
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => {
    void load();
  }, [load]);

  const levelOptions = useMemo(() => {
    const values = new Map<string, string>();
    enrollments.forEach((item) =>
      values.set(item.academic_year_level_id, item.level_name_snapshot),
    );
    return Array.from(values.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [enrollments]);

  const unassigned = useMemo(
    () =>
      enrollments.filter(
        (item) =>
          !item.currentAssignment &&
          (!selectedLevelId || item.academic_year_level_id === selectedLevelId),
      ),
    [enrollments, selectedLevelId],
  );
  const assigned = useMemo(
    () =>
      enrollments.filter(
        (item) =>
          item.currentAssignment &&
          (!selectedLevelId || item.academic_year_level_id === selectedLevelId),
      ),
    [enrollments, selectedLevelId],
  );
  const activeClasses = useMemo(
    () =>
      classes.filter(
        (item) =>
          item.is_active &&
          (!selectedLevelId || item.academic_year_level_id === selectedLevelId),
      ),
    [classes, selectedLevelId],
  );
  const overloaded = useMemo(
    () =>
      classes.filter(
        (item) => item.capacity !== null && item.occupancy > item.capacity,
      ),
    [classes],
  );

  const changeLevel = (value: string) => {
    setSelectedLevelId(value);
    setSelected([]);
    setTargetClass("");
  };

  const assign = async () => {
    if (!selectedLevelId) {
      setFailure(
        "Choisissez d’abord un niveau pour éviter de mélanger les élèves.",
      );
      return;
    }
    if (!targetClass || selected.length === 0) return;
    setFailure("");
    try {
      await batchAssignEnrollments(
        selected.map((item) => item.id),
        targetClass,
        "Préparation de rentrée",
      );
      setSuccess(`${selected.length} élève(s) affecté(s).`);
      setSelected([]);
      setTargetClass("");
      await load();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "L'affectation n'a pas pu être enregistrée.",
      );
    }
  };

  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Répartition des élèves"
      description="Affectez les élèves inscrits à leurs classes et contrôlez les capacités avant la rentrée."
      alert={
        failure ? (
          <Message severity="error" text={failure} />
        ) : success ? (
          <Message severity="success" text={success} />
        ) : undefined
      }
      toolbar={
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="min-w-64 flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              1. Niveau à organiser
            </span>
            <Dropdown
              className="w-full"
              value={selectedLevelId}
              options={[
                { label: "Choisir un niveau", value: "" },
                ...levelOptions,
              ]}
              onChange={(event) => changeLevel(String(event.value ?? ""))}
            />
          </label>
          <div className="flex flex-wrap gap-4 pb-2 text-sm text-slate-600">
            <span>
              <strong>{unassigned.length}</strong> sans classe
            </span>
            <span>
              <strong>{assigned.length}</strong> répartis
            </span>
            <span>
              <strong>{overloaded.length}</strong> dépassement(s)
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-3">
          {[
            [
              "1",
              "Choisir le niveau",
              "Le tableau affiche uniquement les élèves de ce niveau.",
            ],
            [
              "2",
              "Sélectionner les élèves",
              "Cochez un ou plusieurs élèves encore sans classe.",
            ],
            [
              "3",
              "Choisir la classe",
              "Seules les classes du niveau sélectionné sont proposées.",
            ],
          ].map(([number, title, text]) => (
            <article
              key={number}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <span className="mb-2 inline-flex size-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {number}
              </span>
              <strong className="block text-sm text-slate-900">{title}</strong>
              <p className="mb-0 mt-1 text-sm text-slate-500">{text}</p>
            </article>
          ))}
        </section>

        {!selectedLevelId ? (
          <Message
            severity="info"
            text="Commencez par choisir un niveau. La préparation de rentrée sert à répartir les élèves confirmés dans les classes, sans modifier leur niveau d’inscription."
          />
        ) : null}

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold">
                Élèves sans classe
              </h2>
              <p className="m-0 text-sm text-slate-500">
                Sélectionnez les élèves puis affectez-les à une classe du même
                niveau.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dropdown
                value={targetClass}
                options={activeClasses}
                optionLabel="name"
                optionValue="id"
                placeholder={
                  selectedLevelId
                    ? "2. Classe cible"
                    : "Choisissez d’abord un niveau"
                }
                disabled={!selectedLevelId}
                onChange={(event) => setTargetClass(String(event.value ?? ""))}
              />
              <Button
                label={`Affecter (${selected.length})`}
                icon="pi pi-users"
                disabled={
                  !selectedLevelId || !targetClass || selected.length === 0
                }
                onClick={() => void assign()}
              />
            </div>
          </div>
          <DataTable
            value={unassigned}
            loading={loading}
            selection={selected}
            onSelectionChange={(event) => setSelected(event.value)}
            dataKey="id"
            paginator
            rows={15}
            emptyMessage={
              selectedLevelId
                ? "Tous les élèves de ce niveau sont affectés."
                : "Choisissez un niveau pour commencer."
            }
          >
            <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
            <Column
              header="Élève"
              body={(row: EnrollmentRow) => (
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
            <Column field="level_name_snapshot" header="Niveau" />
          </DataTable>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="m-0 text-base font-semibold">
              Capacité des classes
            </h2>
            <p className="m-0 text-sm text-slate-500">
              Vérifiez la place restante avant de lancer les affectations.
            </p>
          </div>
          <DataTable
            value={selectedLevelId ? activeClasses : classes}
            loading={loading}
            dataKey="id"
            emptyMessage="Aucune classe configurée pour ce niveau."
          >
            <Column field="name" header="Classe" />
            <Column field="code" header="Code" />
            <Column
              header="Effectif"
              body={(row: ClassRow) =>
                `${row.occupancy} / ${row.capacity ?? "∞"}`
              }
            />
            <Column
              header="Situation"
              body={(row: ClassRow) => {
                if (row.capacity === null)
                  return (
                    <Tag value="Capacité non définie" severity="secondary" />
                  );
                if (row.occupancy > row.capacity)
                  return <Tag value="Dépassement" severity="danger" />;
                if (row.occupancy === row.capacity)
                  return <Tag value="Complète" severity="warning" />;
                return (
                  <Tag
                    value={`${row.capacity - row.occupancy} place(s)`}
                    severity="success"
                  />
                );
              }}
            />
          </DataTable>
        </section>
      </div>
    </SchoolingPanel>
  );
}
