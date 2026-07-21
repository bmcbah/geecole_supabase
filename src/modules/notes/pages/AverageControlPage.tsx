import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { NotesOperationsTable } from "../components/NotesOperationsTable";
import { useNotesOperationsPage } from "../hooks/useNotesOperationsPage";
import type { AverageControlItem } from "../services/notes-operations.service";

export function AverageControlPage() {
  const navigate = useNavigate();
  const page = useNotesOperationsPage("averages");

  if (!page.yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <NotesOperationsTable
      title="Contrôle des moyennes"
      description="Contrôlez la complétude de chaque cahier avant la génération."
      yearName={page.year?.name}
      rows={page.items}
      total={page.total}
      first={page.first}
      pageSize={page.pageSize}
      loading={page.loading}
      error={page.error}
      search={page.query}
      status={page.state}
      advanced={page.advanced}
      classId={page.classId}
      cycleId={page.cycleId}
      levelId={page.levelId}
      periodId={page.periodId}
      classOptions={page.classes.map((item) => ({
        label: item.name,
        value: item.id,
      }))}
      periodOptions={page.periods.map((item) => ({
        label: page.cycleId ? item.name : `${item.cycleName} — ${item.name}`,
        value: item.id,
      }))}
      cycleOptions={page.cycles.map((item) => ({
        label: item.name,
        value: item.id,
      }))}
      levelOptions={page.levels.map((item) => ({
        label: item.level_name_snapshot,
        value: item.id,
      }))}
      statusOptions={[
        { label: "Prêt", value: "ready" },
        { label: "Bloqué", value: "incomplete" },
        { label: "À démarrer", value: "not_started" },
      ]}
      placeholder="Classe, matière ou enseignant"
      onReload={() => void page.load()}
      onSearch={(next) => {
        page.setFirst(0);
        page.setQuery(next);
      }}
      onStatus={(next) => {
        page.setFirst(0);
        page.setState(next);
      }}
      onClass={(next) => {
        page.setFirst(0);
        page.setClassId(next);
      }}
      onCycle={page.setCycleId}
      onLevel={page.setLevelId}
      onPeriod={(next) => {
        page.setFirst(0);
        page.setPeriodId(next);
      }}
      onAdvanced={() => page.setAdvanced((current) => !current)}
      onReset={page.reset}
      onPage={(event) => {
        page.setFirst(event.first);
        page.setPageSize(event.rows);
      }}
    >
      <Column field="className" header="Classe" />
      <Column field="periodName" header="Période" />
      <Column field="subjectName" header="Matière" />
      <Column field="teacherName" header="Enseignant" />
      <Column field="coefficient" header="Coef." />
      <Column
        header="Moyenne"
        body={(row: AverageControlItem) =>
          row.average === null
            ? "—"
            : `${row.average.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} /20`
        }
      />
      <Column
        header="Saisie"
        body={(row: AverageControlItem) => (
          <span title={`${row.notesCount} évaluation(s)`}>
            {row.enteredResults}/{row.expectedResults}
          </span>
        )}
      />
      <Column
        header="Anomalies"
        body={(row: AverageControlItem) =>
          row.anomalies.length ? (
            <ul className="m-0 list-none space-y-1 p-0 text-xs text-red-700">
              {row.anomalies.map((anomaly) => (
                <li key={anomaly}>{anomaly}</li>
              ))}
            </ul>
          ) : (
            <span className="text-emerald-700">Aucune</span>
          )
        }
      />
      <Column
        header="Formule"
        body={(row: AverageControlItem) => (
          <span title={row.formulaExpression}>{row.formulaName}</span>
        )}
      />
      <Column
        header="État"
        body={(row: AverageControlItem) => (
          <Tag
            value={
              row.state === "ready"
                ? "Prêt à générer"
                : row.state === "incomplete"
                  ? "À corriger"
                  : "Aucune évaluation"
            }
            severity={
              row.state === "ready"
                ? "success"
                : row.state === "incomplete"
                  ? "danger"
                  : "warning"
            }
          />
        )}
      />
      <Column
        header="Action"
        body={(row: AverageControlItem) => (
          <Button
            label="Voir le cahier"
            size="small"
            text
            onClick={() =>
              void navigate(
                `/notes-bulletins/cahiers?class=${row.classId}&period=${row.periodId}`,
              )
            }
          />
        )}
      />
    </NotesOperationsTable>
  );
}
