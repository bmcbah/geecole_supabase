import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { listAssignableEnrollments } from "../services/schooling-operations.service";
import { listStudents } from "../services/schooling.service";
import type { StudentListItem } from "../types/schooling";

const controlClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white text-sm shadow-sm";

const buttonReset =
  "appearance-none border-0 bg-transparent p-0 text-left font-inherit text-inherit shadow-none outline-none";

type GuardianGroup = {
  id: string;
  guardianName: string;
  guardianPhone: string;
  students: StudentListItem[];
};

type AssignableEnrollment = Awaited<ReturnType<typeof listAssignableEnrollments>>[number];

export function StudentsPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [cycle, setCycle] = useState("");
  const [className, setClassName] = useState("");
  const [guardian, setGuardian] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [groupByGuardian, setGroupByGuardian] = useState(false);

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      const [studentRows, confirmedEnrollments] = await Promise.all([
        listStudents(institutionId, yearId),
        listAssignableEnrollments(institutionId, yearId),
      ]);

      const confirmedById = new Map<string, AssignableEnrollment>(
        confirmedEnrollments.map((item) => [item.id, item]),
      );

      setStudents(
        studentRows
          .filter((student) => confirmedById.has(student.enrollmentId))
          .map((student) => ({
            ...student,
            status: "confirmed",
            className:
              confirmedById.get(student.enrollmentId)?.currentAssignment
                ?.class_name_snapshot ?? "Non affectée",
          })),
      );
    } catch {
      setFailure("Impossible de charger les élèves inscrits de cette année scolaire.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const levelOptions = useMemo(
    () => [
      { label: "Tous les niveaux", value: "" },
      ...Array.from(new Set(students.map((item) => item.levelName).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((value) => ({ label: value, value })),
    ],
    [students],
  );

  const cycleOptions = useMemo(
    () => [
      { label: "Tous les cycles", value: "" },
      ...Array.from(new Set(students.map((item) => item.cycleName).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((value) => ({ label: value, value })),
    ],
    [students],
  );

  const classOptions = useMemo(
    () => [
      { label: "Toutes les classes", value: "" },
      ...Array.from(new Set(students.map((item) => item.className).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((value) => ({ label: value, value })),
    ],
    [students],
  );

  const guardianOptions = useMemo(
    () => [
      { label: "Tous les responsables", value: "" },
      ...Array.from(
        new Set(
          students
            .map((item) => item.guardianName)
            .filter((value) => value && value !== "Non renseigné"),
        ),
      )
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((value) => ({ label: value, value })),
    ],
    [students],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return students.filter((student) => {
      const searchable = `${student.firstName} ${student.lastName} ${student.matricule} ${student.guardianName} ${student.guardianPhone}`.toLocaleLowerCase("fr");
      return (
        (!normalized || searchable.includes(normalized)) &&
        (!level || student.levelName === level) &&
        (!cycle || student.cycleName === cycle) &&
        (!className || student.className === className) &&
        (!guardian || student.guardianName === guardian)
      );
    });
  }, [className, cycle, guardian, level, query, students]);

  const guardianGroups = useMemo<GuardianGroup[]>(() => {
    const groups = new Map<string, GuardianGroup>();
    for (const student of filtered) {
      const key = `${student.guardianName || "Non renseigné"}|${student.guardianPhone || ""}`;
      const current = groups.get(key) ?? {
        id: key,
        guardianName: student.guardianName || "Non renseigné",
        guardianPhone: student.guardianPhone || "",
        students: [],
      };
      current.students.push(student);
      groups.set(key, current);
    }
    return [...groups.values()].sort((a, b) =>
      a.guardianName.localeCompare(b.guardianName, "fr"),
    );
  }, [filtered]);

  const activeFilterCount = [query, level, cycle, className, guardian].filter(Boolean).length;

  const resetFilters = () => {
    setQuery("");
    setLevel("");
    setCycle("");
    setClassName("");
    setGuardian("");
  };

  if (!yearId) {
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de gérer les élèves."
      />
    );
  }

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Élèves inscrits"
      description="Cette liste contient uniquement les élèves dont l’inscription a été confirmée. Les brouillons et préinscriptions restent dans le workflow Inscriptions."
      meta={
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MetricIcon icon="pi-users" />
          <strong className="font-semibold text-slate-900">{filtered.length}</strong>
          <span>élève{filtered.length > 1 ? "s" : ""}</span>
        </div>
      }
      actions={
        <>
          <Button
            label="Réinscriptions groupées"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            onClick={() => void navigate("/scolarite/reinscriptions")}
          />
          <Button
            label="Nouvelle inscription"
            icon="pi pi-user-plus"
            onClick={() => void navigate("/scolarite/inscriptions/nouvelle")}
          />
        </>
      }
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
    >
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_220px_220px_auto] xl:items-end">
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span>
            <span className="p-input-icon-left block w-full">
              <i className="pi pi-search" />
              <InputText
                className={`${controlClass} pl-9`}
                value={query}
                placeholder="Nom, matricule, responsable ou téléphone"
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Cycle</span>
            <Dropdown
              className={controlClass}
              value={cycle}
              options={cycleOptions}
              onChange={(event) => setCycle(String(event.value ?? ""))}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Niveau</span>
            <Dropdown
              className={controlClass}
              value={level}
              options={levelOptions}
              onChange={(event) => setLevel(String(event.value ?? ""))}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Classe</span>
            <Dropdown
              className={controlClass}
              value={className}
              options={classOptions}
              onChange={(event) => setClassName(String(event.value ?? ""))}
            />
          </label>
          <Button
            label={advanced ? "Masquer" : "Plus de filtres"}
            icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"}
            severity="secondary"
            outlined
            badge={activeFilterCount > 0 ? String(activeFilterCount) : undefined}
            onClick={() => setAdvanced((value) => !value)}
          />
        </div>

        {advanced ? (
          <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-[minmax(260px,420px)_auto] md:items-end">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Responsable principal</span>
              <Dropdown
                className={controlClass}
                value={guardian}
                filter
                options={guardianOptions}
                onChange={(event) => setGuardian(String(event.value ?? ""))}
              />
            </label>
            <div className="flex items-center gap-2 md:justify-end">
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
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <strong className="block text-sm font-semibold text-slate-900">Affichage de la liste</strong>
          <span className="mt-0.5 block text-xs text-slate-500">
            Le regroupement utilise uniquement le responsable principal.
          </span>
        </div>
        <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
          <span>Regrouper par parent</span>
          <InputSwitch
            checked={groupByGuardian}
            onChange={(event) => setGroupByGuardian(Boolean(event.value))}
          />
        </label>
      </div>

      {loading ? (
        <div className="grid min-h-[360px] place-items-center">
          <ProgressSpinner className="size-10" strokeWidth="4" />
        </div>
      ) : !groupByGuardian ? (
        <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <DataTable
            value={filtered}
            dataKey="id"
            paginator
            rows={15}
            rowsPerPageOptions={[15, 30, 50]}
            size="small"
            emptyMessage="Aucun élève inscrit ne correspond à cette recherche."
            onRowClick={(event) => void navigate(`/scolarite/eleves/${event.data.id}`)}
            rowClassName={() => "cursor-pointer transition-colors hover:bg-emerald-50/40"}
            tableStyle={{ minWidth: "980px" }}
          >
            <Column
              header="Élève"
              sortable
              sortField="lastName"
              body={(item: StudentListItem) => (
                <div className="flex items-center gap-3 py-1">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                    {item.firstName[0]}{item.lastName[0]}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-slate-900">
                      {item.firstName} {item.lastName}
                    </strong>
                    <small className="block truncate text-xs text-slate-500">{item.matricule}</small>
                  </span>
                </div>
              )}
            />
            <Column field="cycleName" header="Cycle" sortable />
            <Column field="levelName" header="Niveau" sortable />
            <Column field="className" header="Classe" sortable />
            <Column
              header="Responsable principal"
              body={(item: StudentListItem) => (
                <div>
                  <span className="block text-sm text-slate-800">{item.guardianName}</span>
                  <small className="block text-xs text-slate-500">
                    {item.guardianPhone || "Téléphone manquant"}
                  </small>
                </div>
              )}
            />
            <Column
              header=""
              bodyClassName="w-12"
              body={(item: StudentListItem) => (
                <button
                  type="button"
                  className={`${buttonReset} grid size-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700`}
                  aria-label={`Ouvrir ${item.firstName} ${item.lastName}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigate(`/scolarite/eleves/${item.id}`);
                  }}
                >
                  <i className="pi pi-chevron-right text-xs" />
                </button>
              )}
            />
          </DataTable>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {guardianGroups.map((group) => (
              <section key={group.id}>
                <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                  <div>
                    <strong className="block text-sm font-semibold text-slate-900">{group.guardianName}</strong>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {group.guardianPhone || "Téléphone manquant"}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {group.students.length} enfant{group.students.length > 1 ? "s" : ""}
                  </span>
                </header>
                <div className="divide-y divide-slate-100">
                  {group.students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      className={`${buttonReset} grid w-full gap-3 px-4 py-3 transition hover:bg-emerald-50/40 sm:grid-cols-[minmax(0,1fr)_180px_180px_auto] sm:items-center`}
                      onClick={() => void navigate(`/scolarite/eleves/${student.id}`)}
                    >
                      <span>
                        <strong className="block text-sm font-semibold text-slate-900">
                          {student.firstName} {student.lastName}
                        </strong>
                        <small className="block text-xs text-slate-500">{student.matricule}</small>
                      </span>
                      <span className="text-sm text-slate-600">{student.levelName}</span>
                      <span className="text-sm text-slate-600">{student.className || "Non affectée"}</span>
                      <i className="pi pi-chevron-right text-xs text-slate-400" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {!guardianGroups.length ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Aucun regroupement ne correspond aux filtres.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </SchoolingPanel>
  );
}
