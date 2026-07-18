import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { EnrollmentStatusTag } from "../components/EnrollmentStatusTag";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { listStudents } from "../services/schooling.service";
import type { StudentListItem } from "../types/schooling";

const resetButtonClass =
  "appearance-none border-0 bg-transparent p-0 font-inherit text-inherit shadow-none outline-none";
const controlClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

export function StudentsPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [cycle, setCycle] = useState("");
  const [gender, setGender] = useState("");
  const [contact, setContact] = useState("");
  const [guardian, setGuardian] = useState("");
  const [birthFrom, setBirthFrom] = useState("");
  const [birthTo, setBirthTo] = useState("");
  const [advanced, setAdvanced] = useState(false);

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setStudents(await listStudents(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger les élèves de cette année scolaire.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => {
    void load();
  }, [load]);

  const levelOptions = useMemo(
    () => [
      { label: "Tous les niveaux", value: "" },
      ...Array.from(new Set(students.map((item) => item.levelName)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((value) => ({ label: value, value })),
    ],
    [students],
  );

  const cycleOptions = useMemo(
    () => [
      { label: "Tous les cycles", value: "" },
      ...Array.from(new Set(students.map((item) => item.cycleName)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((value) => ({ label: value, value })),
    ],
    [students],
  );

  const guardianOptions = useMemo(
    () => [
      { label: "Tous les responsables", value: "" },
      ...Array.from(new Set(students.map((item) => item.guardianName)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "fr"))
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
        (!status || student.status === status) &&
        (!level || student.levelName === level) &&
        (!cycle || student.cycleName === cycle) &&
        (!gender || student.gender === gender) &&
        (!guardian || student.guardianName === guardian) &&
        (!birthFrom || Boolean(student.birthDate && student.birthDate >= birthFrom)) &&
        (!birthTo || Boolean(student.birthDate && student.birthDate <= birthTo)) &&
        (!contact || (contact === "present" ? Boolean(student.guardianPhone) : !student.guardianPhone))
      );
    });
  }, [students, query, status, level, cycle, gender, contact, guardian, birthFrom, birthTo]);

  const activeFilterCount = [
    query,
    status,
    level,
    cycle,
    gender,
    contact,
    guardian,
    birthFrom,
    birthTo,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setQuery("");
    setStatus("");
    setLevel("");
    setCycle("");
    setGender("");
    setContact("");
    setGuardian("");
    setBirthFrom("");
    setBirthTo("");
  };

  if (!yearId) {
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de gérer les élèves."
      />
    );
  }

  const toolbar = (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_220px]">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span>
              <span className="p-input-icon-left block w-full">
                <i className="pi pi-search left-3 text-sm text-slate-400" />
                <InputText
                  className={`${controlClass} pl-9`}
                  value={query}
                  placeholder="Nom, matricule, responsable ou téléphone"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </span>
            </label>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Statut</span>
              <Dropdown
                className={controlClass}
                value={status}
                options={[
                  { label: "Tous les statuts", value: "" },
                  { label: "Préinscrits", value: "pre_registered" },
                  { label: "Inscrits", value: "confirmed" },
                  { label: "Transférés", value: "transferred" },
                ]}
                onChange={(event) => setStatus(String(event.value))}
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Niveau</span>
              <Dropdown
                className={controlClass}
                value={level}
                options={levelOptions}
                onChange={(event) => setLevel(String(event.value))}
              />
            </label>
          </div>

          <div className="ml-auto flex min-h-10 flex-wrap items-center justify-end gap-2">
            {activeFilterCount > 0 ? (
              <Button
                label="Réinitialiser"
                icon="pi pi-filter-slash"
                severity="secondary"
                text
                onClick={resetFilters}
              />
            ) : null}
            <Button
              label={advanced ? "Masquer" : "Plus de filtres"}
              icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"}
              severity="secondary"
              outlined
              badge={activeFilterCount > 0 ? String(activeFilterCount) : undefined}
              onClick={() => setAdvanced((value) => !value)}
            />
          </div>
        </div>
      </div>

      {advanced ? (
        <div className="border-t border-emerald-100 bg-emerald-50/35 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="m-0 text-sm font-semibold text-slate-900">Filtres avancés</h3>
              <p className="mt-0.5 text-xs text-slate-500">Affinez la liste sans quitter la toolbar.</p>
            </div>
            <MetricIcon icon="pi-sliders-h" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Cycle</span>
              <Dropdown className={controlClass} value={cycle} options={cycleOptions} onChange={(event) => setCycle(String(event.value))} />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Sexe</span>
              <Dropdown
                className={controlClass}
                value={gender}
                options={[
                  { label: "Tous", value: "" },
                  { label: "Féminin", value: "female" },
                  { label: "Masculin", value: "male" },
                  { label: "Autre", value: "other" },
                ]}
                onChange={(event) => setGender(String(event.value))}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Responsable joignable</span>
              <Dropdown
                className={controlClass}
                value={contact}
                options={[
                  { label: "Tous", value: "" },
                  { label: "Avec téléphone", value: "present" },
                  { label: "Sans téléphone", value: "missing" },
                ]}
                onChange={(event) => setContact(String(event.value))}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Responsable principal</span>
              <Dropdown className={controlClass} value={guardian} filter options={guardianOptions} onChange={(event) => setGuardian(String(event.value))} />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Naissance à partir du</span>
              <InputText className={controlClass} type="date" value={birthFrom} onChange={(event) => setBirthFrom(event.target.value)} />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Naissance jusqu’au</span>
              <InputText className={controlClass} type="date" value={birthTo} onChange={(event) => setBirthTo(event.target.value)} />
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );

  return (
    <SchoolingPanel
      className="medium-controls"
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Élèves"
      description="Retrouvez les élèves inscrits ou préinscrits pour l’année de travail."
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
            className="h-10 rounded-xl border-slate-200 px-3 text-sm"
            onClick={() => void navigate("/scolarite/reinscriptions")}
          />
          <Button
            label="Nouvelle inscription"
            icon="pi pi-user-plus"
            className="h-10 rounded-xl bg-emerald-600 px-3 text-sm shadow-none hover:bg-emerald-700"
            onClick={() => void navigate("/scolarite/inscriptions/nouvelle")}
          />
        </>
      }
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={toolbar}
    >
      {loading ? (
        <div className="grid min-h-[360px] place-items-center">
          <div className="text-center">
            <ProgressSpinner className="size-10" strokeWidth="4" />
            <p className="mt-3 text-sm font-medium text-slate-500">Chargement des élèves…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
          <div className="max-w-sm">
            <MetricIcon icon="pi-users" size="md" tone="slate" className="mx-auto" />
            <h3 className="mt-4 text-sm font-semibold text-slate-900">Aucun élève trouvé</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Modifiez les filtres ou créez une nouvelle inscription pour commencer.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <DataTable
            value={filtered}
            dataKey="id"
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            emptyMessage="Aucun élève ne correspond à cette recherche."
            onRowClick={(event) => void navigate(`/scolarite/eleves/${event.data.id}`)}
            rowClassName={() => "cursor-pointer transition-colors hover:bg-emerald-50/40"}
            className="text-sm"
            tableStyle={{ minWidth: "920px" }}
          >
            <Column
              header="Élève"
              sortable
              sortField="lastName"
              body={(item: StudentListItem) => (
                <div className="flex min-w-0 items-center gap-3 py-1">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold leading-none text-emerald-700 ring-1 ring-emerald-100">
                    <span className="block leading-none">{item.firstName[0]}{item.lastName[0]}</span>
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-slate-900">{item.firstName} {item.lastName}</strong>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">{item.matricule}</span>
                  </div>
                </div>
              )}
            />
            <Column field="cycleName" header="Cycle" sortable body={(item: StudentListItem) => <span className="text-sm text-slate-700">{item.cycleName || "—"}</span>} />
            <Column field="levelName" header="Niveau" sortable body={(item: StudentListItem) => <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.levelName || "Non défini"}</span>} />
            <Column
              header="Responsable"
              body={(item: StudentListItem) => (
                <div className="min-w-0 py-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{item.guardianName || "Non renseigné"}</span>
                  <span className={`mt-0.5 block truncate text-xs ${item.guardianPhone ? "text-slate-400" : "text-amber-600"}`}>{item.guardianPhone || "Téléphone manquant"}</span>
                </div>
              )}
            />
            <Column header="Statut" body={(item: StudentListItem) => <EnrollmentStatusTag status={item.status} />} />
            <Column
              header=""
              bodyClassName="w-14"
              body={(item: StudentListItem) => (
                <button
                  type="button"
                  className={`${resetButtonClass} flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700`}
                  aria-label={`Ouvrir ${item.firstName} ${item.lastName}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigate(`/scolarite/eleves/${item.id}`);
                  }}
                >
                  <i className="pi pi-chevron-right text-xs leading-none" />
                </button>
              )}
            />
          </DataTable>
        </div>
      )}
    </SchoolingPanel>
  );
}
