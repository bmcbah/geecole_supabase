import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { FileUpload, type FileUploadHandlerEvent } from "primereact/fileupload";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import type { Database } from "../../../shared/lib/supabase/database.types";
import {
  listStudentResults,
  type StudentBulletinSummary,
} from "../../notes/services/student-results.service";
import {
  listDocumentRequirements,
  listStudentDocuments,
  saveStudentDocument,
  uploadSchoolFile,
} from "../services/documents.service";

type Requirement = Database["public"]["Tables"]["document_requirements"]["Row"];
type StudentDocument = Database["public"]["Tables"]["student_documents"]["Row"];
type FolderId = "administrative" | "bulletins";

const buttonReset =
  "appearance-none border-0 bg-transparent p-0 font-inherit text-inherit shadow-none outline-none";

export function StudentDocumentsPanel({
  institutionId,
  studentId,
  enrollmentId,
  yearId,
}: {
  institutionId: string;
  studentId: string;
  enrollmentId: string;
  yearId: string;
}) {
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

  const documentFor = (requirementId: string) =>
    documents.find((item) => item.requirement_id === requirementId);

  const completed = useMemo(
    () => requirements.filter((item) => documentFor(item.id)?.status === "provided").length,
    [documents, requirements],
  );

  const upload = async (requirement: Requirement, event: FileUploadHandlerEvent) => {
    const file = event.files[0];
    if (!file) return;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = await uploadSchoolFile(
      `${institutionId}/students/${studentId}/documents/${enrollmentId}/${requirement.id}-${safe}`,
      file,
    );
    await saveStudentDocument({
      institution_id: institutionId,
      student_id: studentId,
      enrollment_id: enrollmentId,
      requirement_id: requirement.id,
      status: "provided",
      file_path: path,
      received_on: new Date().toISOString().slice(0, 10),
    });
    await load();
  };

  return (
    <div className="w-full space-y-4">
      <nav className="flex items-center gap-6 border-b border-slate-200 bg-white" aria-label="Dossiers documentaires">
        <button
          type="button"
          className={`${buttonReset} relative flex h-11 items-center gap-2 px-1 text-sm font-medium ${
            folder === "administrative"
              ? "text-emerald-700"
              : "text-slate-500 hover:text-slate-900"
          }`}
          onClick={() => setFolder("administrative")}
        >
          Documents administratifs
          <Tag value={`${completed}/${requirements.length}`} severity="secondary" />
          {folder === "administrative" ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600" />
          ) : null}
        </button>
        <button
          type="button"
          className={`${buttonReset} relative flex h-11 items-center gap-2 px-1 text-sm font-medium ${
            folder === "bulletins"
              ? "text-emerald-700"
              : "text-slate-500 hover:text-slate-900"
          }`}
          onClick={() => setFolder("bulletins")}
        >
          Bulletins générés
          <Tag value={String(bulletins.length)} severity="secondary" />
          {folder === "bulletins" ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600" />
          ) : null}
        </button>
      </nav>

      {failure ? <Message severity="error" text={failure} /> : null}

      {folder === "administrative" ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="m-0 text-sm font-semibold text-slate-950">Documents administratifs</h2>
            <p className="mt-1 text-xs text-slate-500">Pièces demandées, état du contrôle et fichier associé.</p>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3">Document</th>
                  <th className="w-40 border-b border-slate-200 px-4 py-3">Exigence</th>
                  <th className="w-52 border-b border-slate-200 px-4 py-3">Statut</th>
                  <th className="w-48 border-b border-slate-200 px-4 py-3 text-right">Fichier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((requirement) => {
                  const document = documentFor(requirement.id);
                  const status = document?.status ?? "missing";
                  return (
                    <tr key={requirement.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500">
                            <i className={document?.file_path ? "pi pi-file-pdf" : "pi pi-file"} />
                          </span>
                          <div>
                            <strong className="block text-sm font-semibold text-slate-900">{requirement.name}</strong>
                            <span className="text-xs text-slate-500">
                              {document?.file_path ? "Fichier déposé" : "Aucun fichier"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {requirement.required_for_confirmation ? "Obligatoire" : "Facultatif"}
                      </td>
                      <td className="px-4 py-3">
                        <Dropdown
                          className="h-10 w-full rounded-md"
                          value={status}
                          options={[
                            { label: "À fournir", value: "missing" },
                            { label: "Fourni", value: "provided" },
                            { label: "Non applicable", value: "not_applicable" },
                            { label: "Refusé / illisible", value: "rejected" },
                          ]}
                          onChange={(event) =>
                            void saveStudentDocument({
                              institution_id: institutionId,
                              student_id: studentId,
                              enrollment_id: enrollmentId,
                              requirement_id: requirement.id,
                              status: event.value as StudentDocument["status"],
                              received_on:
                                event.value === "provided"
                                  ? new Date().toISOString().slice(0, 10)
                                  : null,
                            }).then(load)
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <FileUpload
                          mode="basic"
                          name="document"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          maxFileSize={10_000_000}
                          chooseLabel={document?.file_path ? "Remplacer" : "Déposer"}
                          chooseOptions={{
                            icon: document?.file_path ? "pi pi-refresh" : "pi pi-upload",
                            className: "p-button-sm p-button-outlined",
                          }}
                          customUpload
                          auto
                          uploadHandler={(event) => void upload(requirement, event)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!requirements.length ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Aucune pièce administrative n’est configurée.
            </div>
          ) : null}
        </section>
      ) : (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="m-0 text-sm font-semibold text-slate-950">Bulletins générés</h2>
            <p className="mt-1 text-xs text-slate-500">Versions classées par période scolaire.</p>
          </header>
          <div className="divide-y divide-slate-100">
            {bulletins.map((bulletin) => (
              <div
                key={bulletin.id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_120px_140px_auto] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                    <i className="pi pi-file-pdf" />
                  </span>
                  <div>
                    <strong className="block text-sm font-semibold text-slate-900">Bulletin {bulletin.periodName}</strong>
                    <span className="text-xs text-slate-500">Version {bulletin.version}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-600">
                  {new Date(bulletin.createdAt).toLocaleDateString("fr-FR")}
                </span>
                <Tag
                  value={bulletin.status}
                  severity={bulletin.status === "published" ? "success" : "info"}
                />
                <Button
                  label="Ouvrir"
                  icon="pi pi-external-link"
                  text
                  disabled
                  title="Le lien de fichier sera disponible après raccordement du stockage des bulletins."
                />
              </div>
            ))}
            {!bulletins.length ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">Aucun bulletin généré.</div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
