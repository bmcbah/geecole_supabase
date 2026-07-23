import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { FileUpload, type FileUploadHandlerEvent } from "primereact/fileupload";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import type { Database } from "../../../shared/lib/supabase/database.types";
import { listStudentResults, type StudentBulletinSummary } from "../../notes/services/student-results.service";
import { listDocumentRequirements, listStudentDocuments, saveStudentDocument, uploadSchoolFile } from "../services/documents.service";

type Requirement = Database["public"]["Tables"]["document_requirements"]["Row"];
type StudentDocument = Database["public"]["Tables"]["student_documents"]["Row"];
type FolderId = "administrative" | "bulletins";

export function StudentDocumentsPanel({ institutionId, studentId, enrollmentId, yearId }: { institutionId: string; studentId: string; enrollmentId: string; yearId: string }) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [bulletins, setBulletins] = useState<StudentBulletinSummary[]>([]);
  const [folder, setFolder] = useState<FolderId>("administrative");
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    setFailure("");
    try {
      const [requirementData, documentData, resultData] = await Promise.all([
        listDocumentRequirements(institutionId),
        listStudentDocuments(studentId, enrollmentId),
        listStudentResults(institutionId, yearId, studentId),
      ]);
      setRequirements(requirementData); setDocuments(documentData); setBulletins(resultData.bulletins);
    } catch { setFailure("Impossible de charger l’espace documentaire."); }
  }, [enrollmentId, institutionId, studentId, yearId]);

  useEffect(() => void load(), [load]);
  const documentFor = (requirementId: string) => documents.find((item) => item.requirement_id === requirementId);
  const completed = useMemo(() => requirements.filter((item) => documentFor(item.id)?.status === "provided").length, [documents, requirements]);

  const upload = async (requirement: Requirement, event: FileUploadHandlerEvent) => {
    const file = event.files[0]; if (!file) return;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = await uploadSchoolFile(`${institutionId}/students/${studentId}/documents/${enrollmentId}/${requirement.id}-${safe}`, file);
    await saveStudentDocument({ institution_id: institutionId, student_id: studentId, enrollment_id: enrollmentId, requirement_id: requirement.id, status: "provided", file_path: path, received_on: new Date().toISOString().slice(0, 10) });
    await load();
  };

  return <div className="grid gap-3 lg:grid-cols-[210px_minmax(0,1fr)]">
    <aside className="rounded-lg border border-slate-200 bg-white p-2">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dossiers</p>
      <button type="button" className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${folder === "administrative" ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`} onClick={() => setFolder("administrative")}><span><i className="pi pi-folder mr-2" />Administratif</span><span>{completed}/{requirements.length}</span></button>
      <button type="button" className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${folder === "bulletins" ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`} onClick={() => setFolder("bulletins")}><span><i className="pi pi-folder mr-2" />Bulletins</span><span>{bulletins.length}</span></button>
    </aside>

    <section className="rounded-lg border border-slate-200 bg-white p-4">
      {failure ? <Message severity="error" text={failure} /> : null}
      {folder === "administrative" ? <div className="space-y-2">
        <div className="mb-3"><h2 className="text-base font-semibold text-slate-950">Documents administratifs</h2><p className="text-sm text-slate-500">Pièces demandées et fichiers déposés.</p></div>
        {requirements.map((requirement) => {
          const document = documentFor(requirement.id); const status = document?.status ?? "missing";
          return <article key={requirement.id} className="grid items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 md:grid-cols-[minmax(0,1fr)_170px_150px]">
            <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600"><i className={document?.file_path ? "pi pi-file-pdf" : "pi pi-file"} /></span><div className="min-w-0"><strong className="block truncate text-sm text-slate-900">{requirement.name}</strong><span className="text-xs text-slate-500">{requirement.required_for_confirmation ? "Obligatoire" : "Facultatif"}</span></div></div>
            <Dropdown className="w-full rounded-lg" value={status} options={[{ label: "À fournir", value: "missing" }, { label: "Fourni", value: "provided" }, { label: "Non applicable", value: "not_applicable" }, { label: "Refusé", value: "rejected" }]} onChange={(event) => void saveStudentDocument({ institution_id: institutionId, student_id: studentId, enrollment_id: enrollmentId, requirement_id: requirement.id, status: event.value as StudentDocument["status"], received_on: event.value === "provided" ? new Date().toISOString().slice(0, 10) : null }).then(load)} />
            <div className="flex justify-end"><FileUpload mode="basic" name="document" accept="image/png,image/jpeg,image/webp,application/pdf" maxFileSize={10_000_000} chooseLabel={document?.file_path ? "Remplacer" : "Déposer"} customUpload auto uploadHandler={(event) => void upload(requirement, event)} /></div>
          </article>;
        })}
        {!requirements.length ? <Message severity="info" text="Aucune pièce administrative configurée." /> : null}
      </div> : <div className="space-y-2">
        <div className="mb-3"><h2 className="text-base font-semibold text-slate-950">Bulletins générés</h2><p className="text-sm text-slate-500">Fichiers classés par période.</p></div>
        {bulletins.map((bulletin) => <article key={bulletin.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3"><div className="flex items-center gap-3"><i className="pi pi-file-pdf text-lg text-emerald-700" /><div><strong className="block text-sm">{bulletin.periodName}</strong><span className="text-xs text-slate-500">Version {bulletin.version} · {new Date(bulletin.createdAt).toLocaleDateString("fr-FR")}</span></div></div><div className="flex items-center gap-2"><Tag value={bulletin.status} severity={bulletin.status === "published" ? "success" : "info"} /><Button icon="pi pi-external-link" text disabled aria-label="Ouvrir le bulletin" /></div></article>)}
        {!bulletins.length ? <Message severity="info" text="Aucun bulletin généré." /> : null}
      </div>}
    </section>
  </div>;
}