import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../../features/academic-session/components/academic-session-context";
import { listAnnualAcademicLevels } from "../../../features/settings/services/academic-structure.service";
import { EnrollmentDialog } from "../components/EnrollmentDialog";
import { EnrollmentStatusTag } from "../components/EnrollmentStatusTag";
import { listStudents } from "../services/schooling.service";
import type { StudentListItem } from "../types/schooling";

export function StudentsPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [dialog, setDialog] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      const [studentData, levelData] = await Promise.all([
        listStudents(institutionId, yearId),
        listAnnualAcademicLevels(yearId),
      ]);
      setStudents(studentData);
      setLevels(levelData);
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
          (!level || student.levelName === level)
        );
      }),
    [students, query, status, level],
  );
  if (!yearId)
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de gérer les élèves."
      />
    );
  return (
    <section>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Scolarité · {year?.name}</span>
          <h1>Élèves</h1>
          <p>
            Retrouvez les élèves inscrits ou préinscrits pour l’année de
            travail.
          </p>
        </div>
        <Button
          label="Nouvelle inscription"
          icon="pi pi-user-plus"
          onClick={() => setDialog(true)}
        />
      </header>
      <Card className="schooling-list-card">
        <div className="schooling-filters">
          <span className="p-input-icon-left schooling-search">
            <i className="pi pi-search" />
            <InputText
              value={query}
              placeholder="Nom, matricule ou téléphone"
              onChange={(e) => setQuery(e.target.value)}
            />
          </span>
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
        </div>
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
              navigate(`/scolarite/eleves/${event.data.id}`)
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
                    navigate(`/scolarite/eleves/${item.id}`);
                  }}
                />
              )}
            />
          </DataTable>
        )}
      </Card>
      <EnrollmentDialog
        visible={dialog}
        institutionId={institutionId}
        yearId={yearId}
        levels={levels}
        onHide={() => setDialog(false)}
        onSaved={() => void load()}
      />
    </section>
  );
}
