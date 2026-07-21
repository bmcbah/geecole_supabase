import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Message } from "primereact/message";
import { MultiSelect } from "primereact/multiselect";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { CourseSummary } from "../domain/notes";
import {
  createPedagogicalAssignment,
  listAssignmentOptions,
  listCourseSummaries,
} from "../services/notes.service";

type Option = { id: string; name: string };
type ClassOption = Option & { cycle_id: string };
type PeriodOption = Option & { cycle_id: string };
type Teacher = { id: string; first_name: string; last_name: string };

export function PedagogicalAssignmentsPage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    coefficient: 1,
    periodIds: [] as string[],
  });
  const selectedCycleId = classes.find(
    (item) => item.id === draft.classId,
  )?.cycle_id;
  const cyclePeriods = periods.filter(
    (period) => period.cycle_id === selectedCycleId,
  );

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    try {
      const [courseData, options] = await Promise.all([
        listCourseSummaries(institutionId, yearId),
        listAssignmentOptions(institutionId, yearId),
      ]);
      setCourses(courseData);
      setClasses(options.classes);
      setSubjects(options.subjects);
      setTeachers(options.teachers);
      setPeriods(options.periods);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chargement impossible.",
      );
    }
  }, [institutionId, yearId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!institutionId || !yearId) return;
    if (
      !draft.classId ||
      !draft.subjectId ||
      !draft.teacherId ||
      draft.coefficient <= 0
    ) {
      setFormError(
        "Renseignez la classe, la matière, l’enseignant et un coefficient supérieur à zéro.",
      );
      return;
    }
    setFormError(undefined);
    setSaving(true);
    try {
      await createPedagogicalAssignment({ institutionId, yearId, ...draft });
      setOpen(false);
      setDraft({
        classId: "",
        subjectId: "",
        teacherId: "",
        coefficient: 1,
        periodIds: [],
      });
      await load();
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : "Affectation impossible.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!year)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Affectations pédagogiques"
        description={`Enseignants, matières, classes et périodes · ${year.name}`}
        actions={
          <Button
            label="Nouvelle affectation"
            icon="pi pi-plus"
            onClick={() => {
              setFormError(undefined);
              setOpen(true);
            }}
          />
        }
      />
      {error ? <Message severity="error" text={error} /> : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {courses.length ? (
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="p-3">Classe</th>
                  <th className="p-3">Matière</th>
                  <th className="p-3">Enseignant</th>
                  <th className="p-3">Coefficient</th>
                  <th className="p-3">Portée</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr
                    key={course.assignmentId}
                    className="border-t border-slate-100"
                  >
                    <td className="p-3 font-semibold text-slate-900">
                      {course.className}
                    </td>
                    <td className="p-3">{course.subjectName}</td>
                    <td className="p-3">{course.teacherName}</td>
                    <td className="p-3">{course.coefficient}</td>
                    <td className="p-3">
                      {course.allowedPeriodIds.length
                        ? `${course.allowedPeriodIds.length} période(s) du cycle`
                        : "Toute l’année"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <h2 className="text-base font-semibold text-slate-900">
              Aucune affectation
            </h2>
            <p className="text-sm text-slate-500">
              Créez la première affectation pour rendre les cours disponibles.
            </p>
          </div>
        )}
      </section>
      <Dialog
        header="Nouvelle affectation"
        visible={open}
        modal
        className="w-[min(94vw,46rem)]"
        onHide={() => {
          setOpen(false);
          setFormError(undefined);
        }}
      >
        <div className="space-y-5">
          {formError ? <Message severity="error" text={formError} /> : null}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Cours concerné
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Classe">
                <Dropdown
                  value={draft.classId}
                  options={classes.map((item) => ({
                    label: item.name,
                    value: item.id,
                  }))}
                  onChange={(event) => {
                    const selected: unknown = event.value;
                    if (typeof selected === "string")
                      setDraft((value) => ({
                        ...value,
                        classId: selected,
                        periodIds: [],
                      }));
                  }}
                  className="w-full"
                />
              </Field>
              <Field label="Matière">
                <Dropdown
                  value={draft.subjectId}
                  options={subjects.map((item) => ({
                    label: item.name,
                    value: item.id,
                  }))}
                  onChange={(event) => {
                    const selected: unknown = event.value;
                    if (typeof selected === "string")
                      setDraft((value) => ({ ...value, subjectId: selected }));
                  }}
                  className="w-full"
                />
              </Field>
            </div>
          </section>
          <section className="border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Enseignant et coefficient
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Enseignant">
                <Dropdown
                  filter
                  value={draft.teacherId}
                  options={teachers.map((item) => ({
                    label: `${item.first_name} ${item.last_name}`,
                    value: item.id,
                  }))}
                  onChange={(event) => {
                    const selected: unknown = event.value;
                    if (typeof selected === "string")
                      setDraft((value) => ({ ...value, teacherId: selected }));
                  }}
                  className="w-full"
                />
              </Field>
              <Field label="Coefficient du cours">
                <InputNumber
                  value={draft.coefficient}
                  min={0.01}
                  maxFractionDigits={2}
                  onValueChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      coefficient: event.value ?? 1,
                    }))
                  }
                  className="w-full"
                />
              </Field>
            </div>
          </section>
          <section className="border-t border-slate-200 pt-5">
            <h3 className="mb-1 text-sm font-semibold text-slate-900">
              Portée dans l’année
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              Sans sélection, l’affectation s’applique à toutes les périodes du
              cycle.
            </p>
            <Field label="Périodes">
              <MultiSelect
                value={draft.periodIds}
                disabled={!draft.classId}
                options={cyclePeriods.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                onChange={(event) => {
                  const selected: unknown = event.value;
                  if (
                    Array.isArray(selected) &&
                    selected.every((item) => typeof item === "string")
                  )
                    setDraft((value) => ({ ...value, periodIds: selected }));
                }}
                display="chip"
                className="w-full"
                placeholder={
                  draft.classId
                    ? "Toutes les périodes du cycle"
                    : "Sélectionnez d’abord une classe"
                }
              />
            </Field>
          </section>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            severity="secondary"
            outlined
            onClick={() => {
              setOpen(false);
              setFormError(undefined);
            }}
          />
          <Button
            label="Créer l’affectation"
            icon="pi pi-check"
            loading={saving}
            onClick={() => void save()}
          />
        </div>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
