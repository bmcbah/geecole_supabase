import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { EnrollmentStatusTag } from "../components/EnrollmentStatusTag";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { listStudents } from "../services/schooling.service";
import type { StudentListItem } from "../types/schooling";

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

  const filtered = useMemo(
    () =>
      students.filter((student) => {
        const searchable =
          `${student.firstName} ${student.lastName} ${student.matricule} ${student.guardianPhone}`.toLocaleLowerCase(
            "fr",
          );
        return (
          (!query || searchable.includes(query.trim().toLocaleLowerCase("fr"))) &&
          (!status || student.status === status) &&
          (!level || student.levelName === level) &&
          (!cycle || student.cycleName === cycle) &&
          (!gender || student.gender === gender) &&
          (!guardian || student.guardianName === guardian) &&
          (!birthFrom || Boolean(student.birthDate && student.birthDate >= birthFrom)) &&
          (!birthTo || Boolean(student.birthDate && student.birthDate <= birthTo)) &&
          (!contact ||
            (contact === "present" ? Boolean(student.guardianPhone) : !student.guardianPhone))
        );
      }),
    [students, query, status, level, cycle, gender, contact, guardian, birthFrom, birthTo],
  );

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
    <div className="space-y-3">
      <Toolbar
        start={
          <div className="flex flex-wrap items-end gap-2">
            <label className="field min-w-[16rem] flex-1">
              <span>Rechercher</span>
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search ps-2" />
                <InputText
                  className="w-full ps-7 text-sm"
                  value={query}
                  placeholder="Nom, matricule ou téléphone"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </span>
            </label>
            <label className="field min-w-[12rem]">
              <span>Statut</span>
              <Dropdown
                className="w-full"
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
            <label className="field min-w-[12rem]">
              <span>Niveau</span>
              <Dropdown
                className="w-full"
                value={level}
                options={levelOptions}
                onChange={(event) => setLevel(String(event.value))}
              />
            </label>
          </div>
        }
        end={
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 ? (
              <Tag
                value={`${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""}`}
                severity="info"
              />
            ) : null}
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
              label={advanced ? "Masquer" : "Filtres avancés"}
              icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"}
              severity="secondary"
              outlined
              onClick={() => setAdvanced((value) => !value)}
            />
          </div>
        }
        className="min-h-0 rounded-none border-0 bg-transparent p-0"
      />

      {advanced ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="field">
            <span>Cycle</span>
            <Dropdown
              className="w-full"
              value={cycle}
              options={cycleOptions}
              onChange={(event) => setCycle(String(event.value))}
            />
          </label>
          <label className="field">
            <span>Sexe</span>
            <Dropdown
              className="w-full"
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
          <label className="field">
            <span>Responsable joignable</span>
            <Dropdown
              className="w-full"
              value={contact}
              options={[
                { label: "Tous", value: "" },
                { label: "Avec téléphone", value: "present" },
                { label: "Sans téléphone", value: "missing" },
              ]}
              onChange={(event) => setContact(String(event.value))}
            />
          </label>
          <label className="field">
            <span>Responsable principal</span>
            <Dropdown
              className="w-full"
              value={guardian}
              filter
              options={guardianOptions}
              onChange={(event) => setGuardian(String(event.value))}
            />
          </label>
          <label className="field">
            <span>Naissance à partir du</span>
            <InputText
              className="w-full"
              type="date"
              value={birthFrom}
              onChange={(event) => setBirthFrom(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Naissance jusqu’au</span>
            <InputText
              className="w-full"
              type="date"
              value={birthTo}
              onChange={(event) => setBirthTo(event.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  );

  return (
    <SchoolingPanel
      className="medium-controls"
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Élèves"
      description="Retrouvez les élèves inscrits ou préinscrits pour l’année de travail."
      meta={
        <Tag
          value={`${filtered.length} élève${filtered.length > 1 ? "s" : ""}`}
          severity="info"
        />
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
      toolbar={toolbar}
    >
      {loading ? (
        <div className="content-state">
          <ProgressSpinner />
        </div>
      ) : (
        <DataTable
          value={filtered}
          dataKey="id"
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Aucun élève ne correspond à cette recherche."
          onRowClick={(event) => void navigate(`/scolarite/eleves/${event.data.id}`)}
          rowClassName={() => "clickable-row"}
        >
          <Column
            header="Élève"
            body={(item: StudentListItem) => (
              <div className="student-identity">
                <span className="student-avatar">
                  {item.firstName[0]}
                  {item.lastName[0]}
                </span>
                <div>
                  <strong>
                    {item.firstName} {item.lastName}
                  </strong>
                  <small>{item.matricule}</small>
                </div>
              </div>
            )}
            sortable
            sortField="lastName"
          />
          <Column field="cycleName" header="Cycle" sortable />
          <Column field="levelName" header="Niveau" sortable />
          <Column
            header="Responsable"
            body={(item: StudentListItem) => (
              <div className="student-contact">
                <span>{item.guardianName}</span>
                <small>{item.guardianPhone}</small>
              </div>
            )}
          />
          <Column
            header="Statut"
            body={(item: StudentListItem) => <EnrollmentStatusTag status={item.status} />}
          />
          <Column
            body={(item: StudentListItem) => (
              <Button
                aria-label={`Ouvrir ${item.firstName} ${item.lastName}`}
                icon="pi pi-chevron-right"
                text
                rounded
                onClick={(event) => {
                  event.stopPropagation();
                  void navigate(`/scolarite/eleves/${item.id}`);
                }}
              />
            )}
          />
        </DataTable>
      )}
    </SchoolingPanel>
  );
}
