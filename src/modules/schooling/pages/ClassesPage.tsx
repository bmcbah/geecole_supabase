import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { useAcademicSession } from "../../../features/academic-session/components/academic-session-context";
import { listAnnualAcademicLevels } from "../../../features/settings/services/academic-structure.service";
import { useToast } from "../../../shared/components/toast-context";
import { listStudents } from "../services/schooling.service";
import {
  archiveClass,
  assignEnrollment,
  listAssignments,
  listClasses,
  saveClass,
  type SchoolClass,
} from "../services/classes.service";
import type { StudentListItem } from "../types/schooling";
export function ClassesPage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const notify = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [assignments, setAssignments] = useState<
    Awaited<ReturnType<typeof listAssignments>>
  >([]);
  const [editing, setEditing] = useState<SchoolClass | null | undefined>(
    undefined,
  );
  const [assigning, setAssigning] = useState<SchoolClass | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    levelId: "",
    capacity: 30,
    room: "",
  });
  const load = useCallback(async () => {
    if (!yearId || !institutionId) return;
    const [c, l, s, a] = await Promise.all([
      listClasses(yearId),
      listAnnualAcademicLevels(yearId),
      listStudents(institutionId, yearId),
      listAssignments(yearId),
    ]);
    setClasses(c);
    setLevels(l);
    setStudents(s);
    setAssignments(a);
  }, [institutionId, yearId]);
  useEffect(() => {
    void load();
  }, [load]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        classes.map((c) => [
          c.id,
          assignments.filter((a) => a.class_id === c.id).length,
        ]),
      ),
    [assignments, classes],
  );
  const open = (item?: SchoolClass) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            name: item.name,
            code: item.code,
            levelId: item.academic_year_level_id,
            capacity: item.capacity ?? 30,
            room: item.room ?? "",
          }
        : { name: "", code: "", levelId: "", capacity: 30, room: "" },
    );
  };
  return (
    <section className="medium-controls">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Scolarité · {year?.name}</span>
          <h1>Classes et affectations</h1>
          <p>
            Créez les divisions annuelles et affectez les élèves sans perdre
            l’historique.
          </p>
        </div>
        <Button
          label="Créer une classe"
          icon="pi pi-plus"
          onClick={() => open()}
        />
      </header>
      <DataTable
        value={classes}
        dataKey="id"
        emptyMessage="Aucune classe pour cette année."
      >
        <Column field="name" header="Classe" />
        <Column
          header="Niveau"
          body={(c: SchoolClass) =>
            levels.find((l) => l.id === c.academic_year_level_id)
              ?.level_name_snapshot
          }
        />
        <Column
          header="Effectif"
          body={(c: SchoolClass) =>
            `${counts[c.id] ?? 0} / ${c.capacity ?? "∞"}`
          }
        />
        <Column field="room" header="Salle" />
        <Column
          header="Actions"
          body={(c: SchoolClass) => (
            <div className="table-actions">
              <Button
                label="Affecter"
                text
                icon="pi pi-user-plus"
                disabled={!c.is_active}
                onClick={() => setAssigning(c)}
              />
              <Button icon="pi pi-pencil" text onClick={() => open(c)} />
              <Button
                icon="pi pi-archive"
                text
                severity="danger"
                disabled={!c.is_active}
                onClick={() => void archiveClass(c.id).then(load)}
              />
            </div>
          )}
        />
      </DataTable>
      <Dialog
        header={editing ? "Modifier la classe" : "Nouvelle classe"}
        visible={editing !== undefined}
        onHide={() => setEditing(undefined)}
        className="form-dialog"
      >
        <div className="schooling-form-grid">
          <label className="field">
            <span>Nom</span>
            <InputText
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Code</span>
            <InputText
              value={form.code}
              onChange={(e) =>
                setForm((v) => ({ ...v, code: e.target.value.toUpperCase() }))
              }
            />
          </label>
          <label className="field">
            <span>Niveau</span>
            <Dropdown
              value={form.levelId}
              options={levels}
              optionLabel="level_name_snapshot"
              optionValue="id"
              onChange={(e) =>
                setForm((v) => ({ ...v, levelId: String(e.value) }))
              }
            />
          </label>
          <label className="field">
            <span>Capacité</span>
            <InputNumber
              value={form.capacity}
              min={1}
              onValueChange={(e) =>
                setForm((v) => ({ ...v, capacity: e.value ?? 30 }))
              }
            />
          </label>
          <label className="field">
            <span>Salle</span>
            <InputText
              value={form.room}
              onChange={(e) => setForm((v) => ({ ...v, room: e.target.value }))}
            />
          </label>
        </div>
        <div className="dialog-actions">
          <Button label="Annuler" text onClick={() => setEditing(undefined)} />
          <Button
            label="Enregistrer"
            disabled={!form.name || !form.code || !form.levelId}
            onClick={() =>
              void saveClass(
                {
                  institution_id: institutionId,
                  academic_year_id: yearId,
                  academic_year_level_id: form.levelId,
                  name: form.name,
                  code: form.code,
                  capacity: form.capacity,
                  room: form.room,
                },
                editing?.id,
              )
                .then(() => load())
                .then(() => setEditing(undefined))
            }
          />
        </div>
      </Dialog>
      <Dialog
        header={`Affecter à ${assigning?.name ?? ""}`}
        visible={Boolean(assigning)}
        onHide={() => setAssigning(null)}
        className="form-dialog"
      >
        <label className="field">
          <span>Élève du niveau</span>
          <Dropdown
            filter
            value={selectedEnrollment}
            options={students
              .filter(
                (s) =>
                  s.levelName ===
                  levels.find((l) => l.id === assigning?.academic_year_level_id)
                    ?.level_name_snapshot,
              )
              .map((s) => ({
                label: `${s.lastName} ${s.firstName} · ${s.matricule}`,
                value: s.enrollmentId,
              }))}
            onChange={(e) => setSelectedEnrollment(String(e.value))}
          />
        </label>
        <div className="dialog-actions">
          <Button
            label="Affecter"
            disabled={!selectedEnrollment}
            onClick={() =>
              void assignEnrollment(selectedEnrollment, assigning!.id)
                .then(() => {
                  notify({ severity: "success", summary: "Élève affecté" });
                  return load();
                })
                .then(() => setAssigning(null))
            }
          />
        </div>
      </Dialog>
    </section>
  );
}
