import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import {
  DataTable,
  type DataTablePageEvent,
  type DataTableSortEvent,
} from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { NotesDataTableToolbar } from "../components/NotesDataTableToolbar";
import {
  changeBulletinStatus,
  listBulletins,
  listGenerationContext,
  type BulletinRow,
} from "../services/bulletins.service";
import { downloadBulletinsZip } from "../utils/bulletin-export";
const labels: Record<BulletinRow["status"], string> = {
  generated: "Généré",
  pending_validation: "À valider",
  validated: "Validé",
  published: "Publié",
  rejected: "Rejeté",
  replaced: "Remplacé",
};
export function BulletinsListPage() {
  const { pathname } = useLocation();
  const { institutionId, yearId, year } = useAcademicSession();
  const mode = pathname.split("/").at(-1) ?? "bulletins";
  const [items, setItems] = useState<BulletinRow[]>([]);
  const [total, setTotal] = useState(0);
  const [first, setFirst] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<1 | -1 | 0>(-1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [classId, setClassId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState<BulletinRow | null>(null);
  const [rejecting, setRejecting] = useState<BulletinRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const config =
    mode === "validation"
      ? {
          title: "Validation",
          description:
            "Contrôlez puis validez ou rejetez les bulletins générés.",
        }
      : mode === "publication"
        ? {
            title: "Publication",
            description: "Publiez uniquement les bulletins validés.",
          }
        : mode === "historique"
          ? {
              title: "Historique",
              description: "Retrouvez toutes les versions et décisions.",
            }
          : {
              title: "Bulletins",
              description: "Consultez les bulletins générés et leur état.",
            };
  const modeStatus = mode === "publication" ? "validated" : status;
  const load = useCallback(async () => {
    if (!yearId) return;
    setLoading(true);
    try {
      const [page, context] = await Promise.all([
        listBulletins(institutionId, yearId, {
          first,
          rows: pageSize,
          search: query,
          status: modeStatus,
          classId,
          periodId,
          dateFrom,
          dateTo,
          sortField,
          sortOrder,
        }),
        listGenerationContext(institutionId, yearId),
      ]);
      setItems(page.rows);
      setTotal(page.total);
      setClasses(context.classes);
      setPeriods(context.periods);
    } catch {
      setError("Impossible de charger les bulletins.");
    } finally {
      setLoading(false);
    }
  }, [
    classId,
    dateFrom,
    dateTo,
    first,
    institutionId,
    modeStatus,
    pageSize,
    periodId,
    query,
    sortField,
    sortOrder,
    yearId,
  ]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  const visible = useMemo(
    () =>
      mode === "validation"
        ? items.filter((r) =>
            ["generated", "pending_validation"].includes(r.status),
          )
        : items,
    [items, mode],
  );
  const activeCount = [
    query,
    status,
    classId,
    periodId,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;
  async function update(
    row: BulletinRow,
    next: BulletinRow["status"],
    comment?: string,
  ) {
    try {
      await changeBulletinStatus(row.id, next, comment);
      setRejecting(null);
      setRejectionReason("");
      await load();
    } catch {
      setError("Cette action n’a pas pu être appliquée.");
    }
  }
  async function exportZip() {
    if (!yearId) return;
    setLoading(true);
    setError("");
    try {
      const page = await listBulletins(institutionId, yearId, {
        first: 0,
        rows: 10000,
        search: query,
        status: modeStatus,
        classId,
        periodId,
        dateFrom,
        dateTo,
        sortField,
        sortOrder,
      });
      if (!page.rows.length) {
        setError("Aucun bulletin à exporter avec ces filtres.");
        return;
      }
      await downloadBulletinsZip(
        page.rows,
        `bulletins-${year?.name ?? "annee"}`,
      );
    } catch {
      setError("La génération du ZIP a échoué.");
    } finally {
      setLoading(false);
    }
  }
  function reset() {
    setQuery("");
    setStatus("");
    setClassId("");
    setPeriodId("");
    setDateFrom("");
    setDateTo("");
    setFirst(0);
  }
  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow="Notes & Bulletins"
        title={config.title}
        description={`${config.description} · ${year?.name ?? "Année"}`}
        actions={
          <div className="flex gap-2">
            <Button
              label="Télécharger le ZIP"
              icon="pi pi-file-export"
              severity="secondary"
              outlined
              loading={loading}
              onClick={() => void exportZip()}
            />
            <Button
              label="Actualiser"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              onClick={() => void load()}
            />
          </div>
        }
      />
      {error ? <Message severity="error" text={error} /> : null}
      <NotesDataTableToolbar
        search={query}
        onSearch={(v) => {
          setFirst(0);
          setQuery(v);
        }}
        advanced={advanced}
        onAdvanced={() => setAdvanced((v) => !v)}
        onReset={reset}
        activeCount={activeCount}
        status={status}
        onStatus={
          mode === "publication"
            ? undefined
            : (v) => {
                setFirst(0);
                setStatus(v);
              }
        }
        statusOptions={Object.entries(labels).map(([value, label]) => ({
          value,
          label,
        }))}
        classId={classId}
        onClass={(v) => {
          setFirst(0);
          setClassId(v);
        }}
        classOptions={classes.map((c) => ({ label: c.name, value: c.id }))}
        periodId={periodId}
        onPeriod={(v) => {
          setFirst(0);
          setPeriodId(v);
        }}
        periodOptions={periods.map((p) => ({
          label: "label" in p ? String(p.label) : p.name,
          value: p.id,
        }))}
        dateFrom={dateFrom}
        onDateFrom={(v) => {
          setFirst(0);
          setDateFrom(v);
        }}
        dateTo={dateTo}
        onDateTo={(v) => {
          setFirst(0);
          setDateTo(v);
        }}
        placeholder="Élève, nom ou matricule"
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          value={visible}
          lazy
          loading={loading}
          dataKey="id"
          stripedRows
          paginator
          first={first}
          rows={pageSize}
          totalRecords={total}
          rowsPerPageOptions={[10, 25, 50]}
          onPage={(e: DataTablePageEvent) => {
            setFirst(e.first);
            setPageSize(e.rows);
          }}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={(e: DataTableSortEvent) => {
            setFirst(0);
            setSortField(String(e.sortField));
            setSortOrder(e.sortOrder ?? 0);
          }}
          emptyMessage="Aucun bulletin"
        >
          <Column
            field="studentName"
            header="Élève"
            body={(r: BulletinRow) => (
              <div>
                <strong>{r.studentName}</strong>
                <span className="block text-xs text-slate-400">
                  {r.matricule}
                </span>
              </div>
            )}
          />
          <Column field="className" header="Classe" />
          <Column field="periodName" header="Période" />
          <Column
            field="version"
            header="Version"
            sortable
            body={(r: BulletinRow) => `v${r.version}`}
          />
          <Column
            field="status"
            header="État"
            sortable
            body={(r: BulletinRow) => (
              <Tag
                value={labels[r.status]}
                severity={
                  r.status === "published" || r.status === "validated"
                    ? "success"
                    : r.status === "rejected"
                      ? "danger"
                      : "info"
                }
              />
            )}
          />
          <Column
            header="Actions"
            body={(r: BulletinRow) => (
              <div className="flex gap-1">
                <Button
                  icon="pi pi-eye"
                  text
                  rounded
                  aria-label="Aperçu"
                  onClick={() => setPreview(r)}
                />
                {mode === "validation" ? (
                  <>
                    <Button
                      label="Valider"
                      text
                      disabled={
                        !["generated", "pending_validation"].includes(r.status)
                      }
                      onClick={() => void update(r, "validated")}
                    />
                    <Button
                      label="Rejeter"
                      severity="danger"
                      text
                      disabled={
                        !["generated", "pending_validation"].includes(r.status)
                      }
                      onClick={() => setRejecting(r)}
                    />
                  </>
                ) : null}
                {mode === "publication" ? (
                  <Button
                    label="Publier"
                    text
                    disabled={r.status !== "validated"}
                    onClick={() => void update(r, "published")}
                  />
                ) : null}
              </div>
            )}
          />
        </DataTable>
      </section>
      <Dialog
        header={preview ? `Bulletin de ${preview.studentName}` : "Aperçu"}
        visible={!!preview}
        modal
        className="w-[min(96vw,58rem)]"
        onHide={() => setPreview(null)}
      >
        {preview ? <BulletinDocument row={preview} /> : null}
      </Dialog>
      <Dialog
        header="Rejeter le bulletin"
        visible={!!rejecting}
        modal
        className="w-[min(92vw,32rem)]"
        onHide={() => setRejecting(null)}
      >
        <label className="field">
          <span>Motif obligatoire</span>
          <InputTextarea
            value={rejectionReason}
            rows={4}
            autoResize
            className="w-full"
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Annuler"
            severity="secondary"
            outlined
            onClick={() => setRejecting(null)}
          />
          <Button
            label="Confirmer le rejet"
            severity="danger"
            disabled={rejectionReason.trim().length < 3}
            onClick={() =>
              rejecting &&
              void update(rejecting, "rejected", rejectionReason.trim())
            }
          />
        </div>
      </Dialog>
    </div>
  );
}

type BulletinSubject = {
  name: string;
  coefficient: number;
  average: number | null;
  appreciation: string;
};
type BulletinDisplay = {
  bulletin_title?: string;
  bulletin_orientation?: string;
  bulletin_show_rank?: boolean;
  bulletin_show_appreciations?: boolean;
  bulletin_teacher_signature_label?: string;
  bulletin_direction_signature_label?: string;
  bulletin_footer?: string;
};
function BulletinDocument({ row }: { row: BulletinRow }) {
  const snapshot =
    row.snapshot &&
    typeof row.snapshot === "object" &&
    !Array.isArray(row.snapshot)
      ? row.snapshot
      : null;
  const rawSubjects =
    snapshot && "subjects" in snapshot ? snapshot.subjects : null;
  const subjects: Array<BulletinSubject> = Array.isArray(rawSubjects)
    ? rawSubjects.filter(
        (item): item is BulletinSubject =>
          item !== null &&
          typeof item === "object" &&
          "name" in item &&
          typeof item.name === "string" &&
          "coefficient" in item &&
          typeof item.coefficient === "number" &&
          "average" in item &&
          "appreciation" in item &&
          typeof item.appreciation === "string",
      )
    : [];
  const general =
    snapshot &&
    "general_average" in snapshot &&
    typeof snapshot.general_average === "number"
      ? snapshot.general_average
      : null;
  const rawDisplay =
    snapshot && "display" in snapshot ? snapshot.display : null;
  const display: BulletinDisplay =
    rawDisplay && typeof rawDisplay === "object" && !Array.isArray(rawDisplay)
      ? rawDisplay
      : {};
  const showAppreciations = display.bulletin_show_appreciations !== false;
  const colSpan = showAppreciations ? 4 : 3;
  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button
          label="Imprimer"
          icon="pi pi-print"
          severity="secondary"
          outlined
          onClick={() => window.print()}
        />
      </div>
      <article
        data-orientation={display.bulletin_orientation ?? "portrait"}
        className={`mx-auto min-h-[720px] border border-slate-300 bg-white p-8 text-slate-950 print:border-0 print:p-0 ${display.bulletin_orientation === "landscape" ? "max-w-[1100px]" : "max-w-[820px]"}`}
      >
        <header className="border-b-2 border-slate-900 pb-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[.24em]">
            {display.bulletin_title ?? "Bulletin scolaire"}
          </p>
          <h2 className="mt-2 text-2xl font-bold">{row.periodName}</h2>
        </header>
        <div className="my-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <p>
            <span className="text-slate-500">Élève :</span>{" "}
            <strong>{row.studentName}</strong>
          </p>
          <p>
            <span className="text-slate-500">Matricule :</span>{" "}
            <strong>{row.matricule}</strong>
          </p>
          <p>
            <span className="text-slate-500">Classe :</span>{" "}
            <strong>{row.className}</strong>
          </p>
          <p>
            <span className="text-slate-500">Version :</span>{" "}
            <strong>{row.version}</strong>
          </p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 text-left">Matière</th>
              <th className="w-24 border p-2">Coefficient</th>
              <th className="w-28 border p-2">Moyenne /20</th>
              {showAppreciations ? (
                <th className="border p-2 text-left">Appréciation</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {subjects.length ? (
              subjects.map((subject, index) => (
                <tr key={`${subject.name}-${index}`}>
                  <td className="border p-2 font-semibold">{subject.name}</td>
                  <td className="border p-2 text-center">
                    {subject.coefficient}
                  </td>
                  <td className="border p-2 text-center font-semibold">
                    {subject.average === null
                      ? "—"
                      : subject.average.toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                  </td>
                  {showAppreciations ? (
                    <td className="border p-2">
                      {subject.appreciation || "—"}
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={colSpan}
                  className="border p-8 text-center text-slate-500"
                >
                  Aucune moyenne calculable dans cette version.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-emerald-50 text-base">
              <th colSpan={2} className="border p-3 text-right">
                Moyenne générale
              </th>
              <th className="border p-3">
                {general === null
                  ? "—"
                  : general.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                /20
              </th>
              {showAppreciations ? <th className="border p-3" /> : null}
            </tr>
          </tfoot>
        </table>
        <footer className="mt-12 grid grid-cols-2 gap-12 text-center text-sm">
          <div>
            <div className="h-20 border-b border-slate-400" />
            <p className="mt-2">
              {display.bulletin_teacher_signature_label ??
                "Enseignant principal"}
            </p>
          </div>
          <div>
            <div className="h-20 border-b border-slate-400" />
            <p className="mt-2">
              {display.bulletin_direction_signature_label ?? "Direction"}
            </p>
          </div>
        </footer>
        {display.bulletin_footer ? (
          <p className="mt-8 border-t pt-3 text-center text-xs text-slate-500">
            {display.bulletin_footer}
          </p>
        ) : null}
      </article>
    </div>
  );
}
