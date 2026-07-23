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
      setRequirements(requirementData);
      setDocuments(documentData);
      setBulletins(resultData.bulletins);
    } catch {
      setFailure("Impossible de charger l’espace documentaire.");
    }
  }, [enrollmentId, institutionId, studentId, yearId]);

  useEffect(() => void load(), [load]);
  const documentFor = (requirementId: string) => documents.find((item) => item.requirement_id === requirementId);
  const completed = useMemo(() => requirements.filter((item) => documentFor(item.id)?.status === "provided").length, [documents, requirements]);

  const upload = async (requirement: Requirement, event: FileUploadHandlerEvent) => {
    const file = event.files[0];
    if (!file) return;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = await uploadSchoolFile(`${institutionId}/students/${studentId}/documents/${enrollmentId}/${requirement.id}-${safe}`, file);
    await saveStudentDocument({ institution_id: institutionId, student_id: studentId, enrollment_id: enrollmentId, requirement_id: requirement.id, status: "provided", file_path: path, received_on: new Date().toISOString().slice(0, 10) });
    await load();
  };

  return (
    <div className="grid min-h-[520px] gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3"><h2 className="text-sm font-semibold text-slate-950">Dossiers</h2><p className="text-xs text-slate-500">Les fichiers de l’élève sont classés par usage.</p></div>
        <div className="space-y-1">
          <button type="button" className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${folder === "administrative" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-emerald-50"}`} onClick={() => setFolder("administrative")}><span className="flex items-center gap-2"><i className="pi pi-folder" />Documents administratifs</span><Tag value={`${completed}/${requirements.length}`} severity="secondary" /></button>
          <button type="button" className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${folder === "bulletins" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-emerald-50"}`} onClick={() => setFolder("bulletins")}><span className="flex items-center gap-2"><i className="pi pi-folder" />Bulletins générés</span><Tag value={String(bulletins.length)} severity="secondary" /></button>
        </div>
      </aside>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        {failure ? <Message severity="error" text={failure} /> : null}
        {folder === "administrative" ? <div className="space-y-3">
          <div><h2 className="text-base font-semibold text-slate-950">Documents administratifs</h2><p className="text-sm text-slate-500">Pièces demandées, fichiers déposés et état de contrôle.</p></div>
          {requirements.map((requirement) => {
            const document = documentFor(requirement.id);
            const status = document?.status ?? "missing";
            return <article key={requirement.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-600"><i className={`pi ${document?.file_path ? "pi-file-pdf" : "pi-file"}`} /></span><div><strong className="block text-sm text-slate-900">{requirement.name}</strong><span className="text-xs text-slate-500">{requirement.required_for_confirmation ? "Obligatoire pour confirmer" : "Facultatif"}</span></div></div>
              <Dropdown className="w-full" value={status} options={[{ label: "À fournir", value: "missing" }, { label: "Fourni", value: "provided" }, { label: "Non applicable", value: "not_applicable" }, { label: "Refusé / illisible", value: "rejected" }]} onChange={(event) => void saveStudentDocument({ institution_id: institutionId, student_id: studentId, enrollment_id: enrollmentId, requirement_id: requirement.id, status: event.value as StudentDocument["status"], received_on: event.value === "provided" ? new Date().toISOString().slice(0, 10) : null }).then(load)} />
              <div className="flex items-center justify-end gap-2"><Tag value={document?.file_path ? "Fichier déposé" : "Aucun fichier"} severity={document?.file_path ? "success" : "warning"} /><FileUpload mode="basic" name="document" accept="image/png,image/jpeg,image/webp,application/pdf" maxFileSize={10_000_000} chooseLabel={document?.file_path ? "Remplacer" : "Déposer"} customUpload auto uploadHandler={(event) => void upload(requirement, event)} /></div>
            </article>;
          })}
          {!requirements.length ? <Message severity="info" text="Aucune pièce administrative n’est configurée pour cet établissement." /> : null}
        </div> : <div className="space-y-3">
          <div><h2 className="text-base font-semibold text-slate-950">Bulletins générés</h2><p className="text-sm text-slate-500">Versions de bulletins classées par période.</p></div>
          {bulletins.map((bulletin) => <article key={bulletin.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><i className="pi pi-file-pdf" /></span><div><strong className="block text-sm text-slate-900">Bulletin {bulletin.periodName}</strong><span className="text-xs text-slate-500">Version {bulletin.version} · {new Date(bulletin.createdAt).toLocaleDateString("fr-FR")}</span></div></div><div className="flex items-center gap-2"><Tag value={bulletin.status} severity={bulletin.status === "published" ? "success" : "info"} /><Button label="Ouvrir" icon="pi pi-external-link" text disabled title="Le lien de fichier sera disponible après raccordement du stockage des bulletins." /></div></article>)}
          {!bulletins.length ? <Message severity="info" text="Aucun bulletin n’a encore été généré pour cet élève." /> : null}
        </div>}
      </section>
    </div>
  );
}
