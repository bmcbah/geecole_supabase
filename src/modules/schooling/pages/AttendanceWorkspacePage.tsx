import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { listAssignableEnrollments } from "../services/schooling-operations.service";
import {
  createAttendance,
  createAttendanceBatch,
  listAttendance,
  updateAttendanceJustification,
  type AttendanceRow,
} from "../services/schooling-workflows.service";

type EnrollmentRow = {
  id: string;
  level_name_snapshot: string;
  cycle_name_snapshot: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    matricule: string;
  };
  currentAssignment: {
    class_id: string;
    class_name_snapshot: string;
  } | null;
};

const controlClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white text-sm shadow-sm";

const justificationOptions = [
  { label: "Non justifié", value: "unjustified" },
  { label: "En attente", value: "pending" },
  { label: "Justifié", value: "justified" },
];

const typeOptions = [
  { label: "Absence", value: "absence" },
  { label: "Retard", value: "late" },
];

export function AttendanceWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<AttendanceRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<"single" | "group" | null>(null);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState("");
  const [kind, setKind] = useState<"absence" | "late">("absence");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupLevel, setGroupLevel] = useState("");
  const [groupClass, setGroupClass] = useState("");
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");

    const [attendanceResult, enrollmentResult] = await Promise.allSettled([
      listAttendance(institutionId, yearId),
      listAssignableEnrollments(institutionId, yearId),
    ]);

    const errors: string[] = [];
    if (attendanceResult.status === "fulfilled") setItems(attendanceResult.value);
    else errors.push("les absences et retards");

    if (enrollmentResult.status === "fulfilled") {
      setEnrollments(enrollmentResult.value as EnrollmentRow[]);
    } else {
      errors.push("la liste des élèves inscrits");
    }

    if (errors.length) {
      setFailure(`Impossible de charger ${errors.join(" et ")}.`);
    }
    setLoading(false);
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const levelOptions = useMemo(
    () =>
      Array.from(
        new Set(enrollments.map((item) => item.level_name_snapshot).filter(Boolean)),
      )
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((value) => ({ label: value, value })),
    [enrollments],
  );

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(
          enrollments
            .filter(
              (item) => !levelFilter || item.level_name_snapshot === levelFilter,
            )
            .map((item) => item.currentAssignment?.class_name_snapshot)
            .filter((value): value is string => Boolean(value)),
        ),
      )
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((value) => ({ label: value, value })),
    [enrollments, levelFilter],
  );

  const groupClassOptions = useMemo(
    () =>
      Array.from(
        new Set(
          enrollments
            .filter((item) => !groupLevel || item.level_name_snapshot === groupLevel)
            .map((item) => item.currentAssignment?.class_name_snapshot)
            .filter((value): value is string => Boolean(value)),
        ),
      )
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((value) => ({ label: value, value })),
    [enrollments, groupLevel],
  );

  const studentOptions = useMemo(
    () =>
      enrollments.map((item) => ({
        label: `${item.student.first_name} ${item.student.last_name} · ${item.student.matricule}`,
        value: item.id,
      })),
    [enrollments],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const student = item.enrollment.student;
      const haystack = `${student.first_name} ${student.last_name} ${student.matricule}`.toLocaleLowerCase("fr");
      const enrollment = enrollments.find((row) => row.id === item.enrollment.id);
      return (
        (!query || haystack.includes(query)) &&
        (!status || item.justification_status === status) &&
        (!typeFilter || item.kind === typeFilter) &&
        (!levelFilter || enrollment?.level_name_snapshot === levelFilter) &&
        (!classFilter ||
          enrollment?.currentAssignment?.class_name_snapshot === classFilter)
      );
    });
  }, [classFilter, enrollments, items, levelFilter, search, status, typeFilter]);

  const groupRows = useMemo(() => {
    const query = groupSearch.trim().toLocaleLowerCase("fr");
    return enrollments.filter((item) => {
      const haystack = `${item.student.first_name} ${item.student.last_name} ${item.student.matricule}`.toLocaleLowerCase("fr");
      return (
        (!query || haystack.includes(query)) &&
        (!groupLevel || item.level_name_snapshot === groupLevel) &&
        (!groupClass ||
          item.currentAssignment?.class_name_snapshot === groupClass)
      );
    });
  }, [enrollments, groupClass, groupLevel, groupSearch]);

  const activeFilterCount = [
    search,
    status,
    typeFilter,
    levelFilter,
    classFilter,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setTypeFilter("");
    setLevelFilter("");
    setClassFilter("");
  };

  const resetForm = () => {
    setEnrollmentId("");
    setSelectedIds([]);
    setReason("");
    setSlot("");
    setGroupSearch("");
    setGroupLevel("");
    setGroupClass("");
  };

  const closeDialog = () => {
    setDialog(null);
    resetForm();
  };

  const saveSingle = async () => {
    if (!institutionId || !yearId || !enrollmentId || !date) return;
    try {
      await createAttendance({
        institutionId,
        academicYearId: yearId,
        enrollmentId,
        date,
        slot,
        kind,
        reason,
      });
      closeDialog();
      await load();
    } catch {
      setFailure("L’absence ou le retard n’a pas pu être enregistré.");
    }
  };

  const saveGroup = async () => {
    if (!institutionId || !yearId || !selectedIds.length || !date) return;
    try {
      await createAttendanceBatch({
        institutionId,
        academicYearId: yearId,
        enrollmentIds: selectedIds,
        date,
        slot,
        kind,
        reason,
      });
      closeDialog();
      await load();
    } catch {
      setFailure("La saisie groupée n’a pas pu être enregistrée.");
    }
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Assiduité"
      description="Saisissez les absences et retards, puis traitez les justificatifs dans une seule file de travail."
      meta={
        <span className="text-sm text-slate-500">
          <strong className="text-slate-900">{filtered.length}</strong> événement(s)
        </span>
      }
      actions={
        <>
          <Button
            label="Ajouter en groupe"
            icon="pi pi-users"
            severity="secondary"
            outlined
            onClick={() => setDialog("group")}
          />
          <Button
            label="Ajouter"
            icon="pi pi-plus"
            onClick={() => setDialog("single")}
          />
        </>
      }
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={
        <>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_220px_auto] xl:items-end">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span>
              <span className="p-input-icon-left block w-full">
                <i className="pi pi-search" />
                <InputText
                  className={`${controlClass} pl-9`}
                  value={search}
                  placeholder="Nom ou matricule"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </span>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Type</span>
              <Dropdown
                className={controlClass}
                value={typeFilter}
                options={[{ label: "Tous les types", value: "" }, ...typeOptions]}
                onChange={(event) => setTypeFilter(String(event.value ?? ""))}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Justification</span>
              <Dropdown
                className={controlClass}
                value={status}
                options={[
                  { label: "Tous les statuts", value: "" },
                  ...justificationOptions,
                ]}
                onChange={(event) => setStatus(String(event.value ?? ""))}
              />
            </label>
            <Button
              label={advanced ? "Masquer" : "Plus de filtres"}
              icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"}
              severity="secondary"
              outlined
              badge={activeFilterCount ? String(activeFilterCount) : undefined}
              onClick={() => setAdvanced((value) => !value)}
            />
          </div>

          {advanced ? (
            <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-2 xl:grid-cols-[220px_220px_auto] xl:items-end">
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Niveau</span>
                <Dropdown
                  className={controlClass}
                  value={levelFilter}
                  options={[{ label: "Tous les niveaux", value: "" }, ...levelOptions]}
                  onChange={(event) => {
                    setLevelFilter(String(event.value ?? ""));
                    setClassFilter("");
                  }}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Classe</span>
                <Dropdown
                  className={controlClass}
                  value={classFilter}
                  options={[{ label: "Toutes les classes", value: "" }, ...classOptions]}
                  onChange={(event) => setClassFilter(String(event.value ?? ""))}
                />
              </label>
              <div className="flex items-center gap-2 xl:justify-end">
                <Button
                  label="Réinitialiser"
                  icon="pi pi-filter-slash"
                  severity="secondary"
                  text
                  disabled={!activeFilterCount}
                  onClick={resetFilters}
                />
              </div>
            </div>
          ) : null}
        </>
      }
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <DataTable
          value={filtered}
          loading={loading}
          paginator
          rows={20}
          rowsPerPageOptions={[20, 40, 60]}
          dataKey="id"
          size="small"
          emptyMessage="Aucune absence ni aucun retard ne correspond aux filtres."
          tableStyle={{ minWidth: "980px" }}
        >
          <Column
            field="attendance_date"
            header="Date"
            sortable
            body={(row: AttendanceRow) =>
              new Date(`${row.attendance_date}T00:00:00`).toLocaleDateString("fr-FR")
            }
          />
          <Column
            header="Élève"
            body={(row: AttendanceRow) => (
              <div>
                <strong className="block text-sm font-semibold text-slate-900">
                  {row.enrollment.student.first_name} {row.enrollment.student.last_name}
                </strong>
                <small className="block text-xs text-slate-500">
                  {row.enrollment.student.matricule}
                </small>
              </div>
            )}
          />
          <Column
            header="Type"
            body={(row: AttendanceRow) => (
              <Tag
                value={row.kind === "absence" ? "Absence" : "Retard"}
                severity={row.kind === "absence" ? "danger" : "warning"}
              />
            )}
          />
          <Column
            field="slot_label"
            header="Créneau"
            body={(row: AttendanceRow) => row.slot_label || "—"}
          />
          <Column
            header="Justification"
            body={(row: AttendanceRow) => (
              <Dropdown
                className="h-9 w-40 rounded-md"
                value={row.justification_status}
                options={justificationOptions}
                onChange={(event) =>
                  void updateAttendanceJustification(
                    row.id,
                    event.value,
                    row.reason ?? undefined,
                  ).then(load)
                }
              />
            )}
          />
          <Column
            field="reason"
            header="Motif / observation"
            body={(row: AttendanceRow) => row.reason || "—"}
          />
        </DataTable>
      </div>

      <Dialog
        header="Enregistrer une absence ou un retard"
        visible={dialog === "single"}
        onHide={closeDialog}
        style={{ width: "min(680px, 95vw)" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              severity="secondary"
              outlined
              onClick={closeDialog}
            />
            <Button
              label="Enregistrer"
              icon="pi pi-check"
              disabled={!enrollmentId || !date}
              onClick={() => void saveSingle()}
            />
          </div>
        }
      >
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Élève</span>
            <Dropdown
              className={controlClass}
              filter
              value={enrollmentId}
              options={studentOptions}
              placeholder="Choisir un élève inscrit"
              onChange={(event) => setEnrollmentId(String(event.value ?? ""))}
            />
          </label>
          <AttendanceFields
            date={date}
            setDate={setDate}
            kind={kind}
            setKind={setKind}
            slot={slot}
            setSlot={setSlot}
            reason={reason}
            setReason={setReason}
          />
        </div>
      </Dialog>

      <Dialog
        header="Ajouter l’assiduité en groupe"
        visible={dialog === "group"}
        onHide={closeDialog}
        style={{ width: "min(1040px, 96vw)" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              severity="secondary"
              outlined
              onClick={closeDialog}
            />
            <Button
              label={`Enregistrer (${selectedIds.length})`}
              icon="pi pi-check"
              disabled={!selectedIds.length || !date}
              onClick={() => void saveGroup()}
            />
          </div>
        }
      >
        <div className="space-y-5">
          <section className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <AttendanceFields
              date={date}
              setDate={setDate}
              kind={kind}
              setKind={setKind}
              slot={slot}
              setSlot={setSlot}
              reason={reason}
              setReason={setReason}
            />
          </section>

          <section className="overflow-hidden rounded-md border border-slate-200">
            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
              <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                  className={`${controlClass} pl-9`}
                  value={groupSearch}
                  placeholder="Rechercher un élève"
                  onChange={(event) => setGroupSearch(event.target.value)}
                />
              </span>
              <Dropdown
                className={controlClass}
                value={groupLevel}
                options={[{ label: "Tous les niveaux", value: "" }, ...levelOptions]}
                onChange={(event) => {
                  setGroupLevel(String(event.value ?? ""));
                  setGroupClass("");
                }}
              />
              <Dropdown
                className={controlClass}
                value={groupClass}
                options={[
                  { label: "Toutes les classes", value: "" },
                  ...groupClassOptions,
                ]}
                onChange={(event) => setGroupClass(String(event.value ?? ""))}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
              <strong className="text-sm text-slate-900">Élèves concernés</strong>
              <Button
                label="Sélectionner la liste filtrée"
                severity="secondary"
                text
                size="small"
                onClick={() => setSelectedIds(groupRows.map((item) => item.id))}
              />
            </div>
            <DataTable
              value={groupRows}
              dataKey="id"
              size="small"
              scrollable
              scrollHeight="360px"
              selection={groupRows.filter((item) => selectedIds.includes(item.id))}
              onSelectionChange={(event) =>
                setSelectedIds(
                  (event.value as EnrollmentRow[]).map((item) => item.id),
                )
              }
              emptyMessage="Aucun élève inscrit ne correspond aux filtres."
            >
              <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
              <Column
                header="Élève"
                body={(row: EnrollmentRow) => (
                  <div>
                    <strong className="block text-sm text-slate-900">
                      {row.student.first_name} {row.student.last_name}
                    </strong>
                    <small className="text-xs text-slate-500">{row.student.matricule}</small>
                  </div>
                )}
              />
              <Column field="level_name_snapshot" header="Niveau" />
              <Column
                header="Classe"
                body={(row: EnrollmentRow) =>
                  row.currentAssignment?.class_name_snapshot || "Non affectée"
                }
              />
            </DataTable>
          </section>
        </div>
      </Dialog>
    </SchoolingPanel>
  );
}

function AttendanceFields(props: {
  date: string;
  setDate: (value: string) => void;
  kind: "absence" | "late";
  setKind: (value: "absence" | "late") => void;
  slot: string;
  setSlot: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
}) {
  return (
    <>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Date</span>
        <InputText
          className={controlClass}
          type="date"
          value={props.date}
          onChange={(event) => props.setDate(event.target.value)}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Type</span>
        <Dropdown
          className={controlClass}
          value={props.kind}
          options={typeOptions}
          onChange={(event) => props.setKind(event.value)}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Créneau</span>
        <InputText
          className={controlClass}
          value={props.slot}
          placeholder="Ex. Matin, 08h–10h"
          onChange={(event) => props.setSlot(event.target.value)}
        />
      </label>
      <label>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Motif ou observation</span>
        <InputTextarea
          className="w-full rounded-md"
          rows={3}
          value={props.reason}
          onChange={(event) => props.setReason(event.target.value)}
        />
      </label>
    </>
  );
}
