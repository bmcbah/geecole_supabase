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
import { useAcademicSession } from "../../../features/academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { EnrollmentStatusTag } from "../components/EnrollmentStatusTag";
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
      const studentData = await listStudents(institutionId, yearId);
      setStudents(studentData);
    } catch {
      setFailure("Impossible de charger les élèves de cette année scolaire.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      students.filter((student) => {
        const searchable =
          `${student.firstName} ${student.lastName} ${student.matricule} ${student.guardianPhone}`.toLocaleLowerCase(
            "fr",
          );
        return (
          (!query ||
            searchable.includes(query.trim().toLocaleLowerCase("fr"))) &&
          (!status || student.status === status) &&
          (!level || student.levelName === level) &&
          (!cycle || student.cycleName === cycle) &&
          (!gender || student.gender === gender) &&
          (!guardian || student.guardianName === guardian) &&
          (!birthFrom ||
            Boolean(student.birthDate && student.birthDate >= birthFrom)) &&
          (!birthTo ||
            Boolean(student.birthDate && student.birthDate <= birthTo)) &&
          (!contact ||
            (contact === "present"
              ? Boolean(student.guardianPhone)
              : !student.guardianPhone))
        );
      }),
    [
      students,
      query,
      status,
      level,
      cycle,
      gender,
      contact,
      guardian,
      birthFrom,
      birthTo,
    ],
  );
  if (!yearId)
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de gérer les élèves."
      />
    );
  return (
    <section className="medium-controls">
      <PageHeader
        eyebrow={`Scolarité · ${year?.name ?? "Année scolaire"}`}
        title="Élèves"
        description="Retrouvez les élèves inscrits ou préinscrits pour l’année de travail."
        meta={<Tag value={`${filtered.length} élève${filtered.length > 1 ? "s" : ""}`} severity="info" />}
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
      />
      <div className="students-filter-zone">
        <div className="schooling-filters">
          <label className="field schooling-search">
            <span>Rechercher</span>
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                value={query}
                placeholder="Nom, matricule ou téléphone"
                onChange={(e) => setQuery(e.target.value)}
              />
            </span>
          </label>
          <label className="field">
            <span>Statut</span>
            <Dropdown
              value={status}
              options={[
                { label: "Tous les statuts", value: "" },
                { label: "Préinscrits", value: "pre_registered" },
                { label: "Inscrits", value: "confirmed" },
                { label: "Transférés", value: "transferred" },
              ]}
              onChange={(e) => setStatus(String(e.value))}
            />
          </label>
          <label className="field">
            <span>Niveau</span>
            <Dropdown
              value={level}
              options={[
                { label: "Tous les niveaux", value: "" },
                ...Array.from(
                  new Set(students.map((item) => item.levelName)),
                ).map((value) => ({ label: value, value })),
              ]}
              onChange={(e) => setLevel(String(e.value))}
            />
          </label>
          <Button
            label={advanced ? "Masquer les filtres" : "Filtres avancés"}
            icon="pi pi-sliders-h"
            severity="secondary"
            outlined
            onClick={() => setAdvanced((value) => !value)}
          />
        </div>
        {advanced && (
          <div className="advanced-filters">
            <label className="field">
              <span>Cycle</span>
              <Dropdown
                value={cycle}
                options={[
                  { label: "Tous les cycles", value: "" },
                  ...Array.from(
                    new Set(students.map((item) => item.cycleName)),
                  ).map((value) => ({ label: value, value })),
                ]}
                onChange={(e) => setCycle(String(e.value))}
              />
            </label>
            <label className="field">
              <span>Sexe</span>
              <Dropdown
                value={gender}
                options={[
                  { label: "Tous", value: "" },
                  { label: "Féminin", value: "female" },
                  { label: "Masculin", value: "male" },
                  { label: "Autre", value: "other" },
                ]}
                onChange={(e) => setGender(String(e.value))}
              />
            </label>
            <label className="field">
              <span>Responsable joignable</span>
              <Dropdown
                value={contact}
                options={[
                  { label: "Tous", value: "" },
                  { label: "Avec téléphone", value: "present" },
                  { label: "Sans téléphone", value: "missing" },
                ]}
                onChange={(e) => setContact(String(e.value))}
              />
            </label>
            <label className="field">
              <span>Responsable principal</span>
              <Dropdown
                value={guardian}
                filter
                options={[
                  { label: "Tous les responsables", value: "" },
                  ...Array.from(
                    new Set(students.map((item) => item.guardianName)),
                  ).map((value) => ({ label: value, value })),
                ]}
                onChange={(e) => setGuardian(String(e.value))}
              />
            </label>
            <label className="field">
              <span>Naissance à partir du</span>
              <InputText
                type="date"
                value={birthFrom}
                onChange={(e) => setBirthFrom(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Naissance jusqu’au</span>
              <InputText
                type="date"
                value={birthTo}
                onChange={(e) => setBirthTo(e.target.value)}
              />
            </label>
            <div className="filter-reset">
              <Button
                label="Réinitialiser les filtres"
                icon="pi pi-filter-slash"
                text
                onClick={() => {
                  setStatus("");
                  setLevel("");
                  setCycle("");
                  setGender("");
                  setContact("");
                  setGuardian("");
                  setBirthFrom("");
                  setBirthTo("");
                  setQuery("");
                }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="data-surface">
        {failure && <Message severity="error" text={failure} />}
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
            onRowClick={(event) =>
              void navigate(`/scolarite/eleves/${event.data.id}`)
            }
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
              body={(item: StudentListItem) => (
                <EnrollmentStatusTag status={item.status} />
              )}
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
      </div>
    </section>
  );
}
