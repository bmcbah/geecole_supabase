import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { useAcademicSession } from "../../../features/academic-session/components/academic-session-context";
import {
  listAnnualAcademicCycles,
  listAnnualAcademicLevels,
} from "../../../features/settings/services/academic-structure.service";
import {
  archiveClass,
  createClass,
  listAssignments,
  listClasses,
  saveClass,
  type SchoolClass,
} from "../services/classes.service";

export function ClassesPage() {
  const { institutionId, institution, yearId, year } = useAcademicSession();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [cycles, setCycles] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicCycles>>
  >([]);
  const [assignments, setAssignments] = useState<
    Awaited<ReturnType<typeof listAssignments>>
  >([]);
  const [editing, setEditing] = useState<SchoolClass | null | undefined>(
    undefined,
  );
  const [form, setForm] = useState({
    name: "",
    code: "",
    levelId: "",
    cycleId: "",
    capacity: 30,
    room: "",
  });
  const merged = institution?.class_structure_mode === "classes_as_levels";
  const load = useCallback(async () => {
    if (!yearId) return;
    const [classData, levelData, cycleData, assignmentData] = await Promise.all(
      [
        listClasses(yearId),
        listAnnualAcademicLevels(yearId),
        listAnnualAcademicCycles(yearId),
        listAssignments(yearId),
      ],
    );
    setClasses(classData);
    setLevels(levelData);
    setCycles(cycleData);
    setAssignments(assignmentData);
  }, [yearId]);
  useEffect(() => void load(), [load]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        classes.map((item) => [
          item.id,
          assignments.filter((assignment) => assignment.class_id === item.id)
            .length,
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
            cycleId: "",
            capacity: item.capacity ?? 30,
            room: item.room ?? "",
          }
        : {
            name: "",
            code: "",
            levelId: "",
            cycleId: "",
            capacity: 30,
            room: "",
          },
    );
  };
  const submit = async () => {
    if (editing)
      await saveClass(
        {
          institution_id: institutionId,
          academic_year_id: yearId,
          academic_year_level_id: editing.academic_year_level_id,
          name: form.name,
          code: form.code,
          capacity: form.capacity,
          room: form.room,
        },
        editing.id,
      );
    else
      await createClass({
        yearId,
        annualLevelId: form.levelId || null,
        annualCycleId: form.cycleId || null,
        name: form.name,
        code: form.code,
        capacity: form.capacity,
        room: form.room,
      });
    await load();
    setEditing(undefined);
  };
  return (
    <section className="medium-controls">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Paramétrage · {year?.name}</span>
          <h1>Classes</h1>
          <p>
            Configurez les classes annuelles. L’affectation se fait depuis la
            fiche ou la liste des élèves.
          </p>
        </div>
        <Button
          label="Créer une classe"
          icon="pi pi-plus"
          onClick={() => open()}
        />
      </header>
      {merged && (
        <div className="students-filter-zone">
          <strong>Mode fusionné activé</strong>
          <p>
            Chaque nouvelle classe crée automatiquement le niveau pédagogique
            portant le même nom.
          </p>
        </div>
      )}
      <DataTable
        value={classes}
        dataKey="id"
        emptyMessage="Aucune classe pour cette année."
      >
        <Column field="name" header="Classe" />
        <Column
          header="Niveau"
          body={(item: SchoolClass) =>
            levels.find((level) => level.id === item.academic_year_level_id)
              ?.level_name_snapshot
          }
        />
        <Column
          header="Effectif"
          body={(item: SchoolClass) =>
            `${counts[item.id] ?? 0} / ${item.capacity ?? "∞"}`
          }
        />
        <Column header="Salle" body={(item: SchoolClass) => item.room || "—"} />
        <Column
          header="Actions"
          body={(item: SchoolClass) => (
            <div className="table-actions">
              <Button icon="pi pi-pencil" text onClick={() => open(item)} />
              <Button
                icon="pi pi-archive"
                text
                severity="danger"
                disabled={!item.is_active}
                onClick={() => void archiveClass(item.id).then(load)}
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
              onChange={(event) =>
                setForm((value) => ({ ...value, name: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Code</span>
            <InputText
              value={form.code}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  code: event.target.value.toUpperCase(),
                }))
              }
            />
          </label>
          {!editing &&
            (merged ? (
              <label className="field">
                <span>Cycle</span>
                <Dropdown
                  value={form.cycleId}
                  options={cycles}
                  optionLabel="name"
                  optionValue="id"
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      cycleId: String(event.value),
                    }))
                  }
                />
                <small>
                  Le niveau sera créé automatiquement dans ce cycle.
                </small>
              </label>
            ) : (
              <label className="field">
                <span>Niveau</span>
                <Dropdown
                  value={form.levelId}
                  options={levels}
                  optionLabel="level_name_snapshot"
                  optionValue="id"
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      levelId: String(event.value),
                    }))
                  }
                />
              </label>
            ))}
          <label className="field">
            <span>Capacité</span>
            <InputNumber
              value={form.capacity}
              min={1}
              onValueChange={(event) =>
                setForm((value) => ({ ...value, capacity: event.value ?? 30 }))
              }
            />
          </label>
          <label className="field">
            <span>
              Salle <small>(facultatif)</small>
            </span>
            <InputText
              value={form.room}
              onChange={(event) =>
                setForm((value) => ({ ...value, room: event.target.value }))
              }
            />
          </label>
        </div>
        <div className="dialog-actions">
          <Button label="Annuler" text onClick={() => setEditing(undefined)} />
          <Button
            label="Enregistrer"
            disabled={
              !form.name ||
              !form.code ||
              (!editing && (merged ? !form.cycleId : !form.levelId))
            }
            onClick={() => void submit()}
          />
        </div>
      </Dialog>
    </section>
  );
}
