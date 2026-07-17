import { useCallback, useEffect, useState } from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import type { Database } from "../../../shared/lib/supabase/database.types";
import {
  listDocumentRequirements,
  listStudentDocuments,
  saveStudentDocument,
} from "../services/documents.service";

type Requirement = Database["public"]["Tables"]["document_requirements"]["Row"];
type StudentDocument = Database["public"]["Tables"]["student_documents"]["Row"];

export function StudentDocumentsPanel({
  institutionId,
  studentId,
  enrollmentId,
}: {
  institutionId: string;
  studentId: string;
  enrollmentId: string;
}) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const load = useCallback(async () => {
    const [requirementData, documentData] = await Promise.all([
      listDocumentRequirements(institutionId),
      listStudentDocuments(studentId, enrollmentId),
    ]);
    setRequirements(requirementData);
    setDocuments(documentData);
  }, [enrollmentId, institutionId, studentId]);
  useEffect(() => void load(), [load]);
  const documentFor = (requirementId: string) =>
    documents.find((item) => item.requirement_id === requirementId);
  return (
    <DataTable
      value={requirements}
      dataKey="id"
      emptyMessage="Aucune pièce demandée"
    >
      <Column field="name" header="Document" />
      <Column
        header="Exigence"
        body={(item: Requirement) =>
          item.required_for_confirmation ? "Obligatoire" : "Facultatif"
        }
      />
      <Column
        header="Statut"
        body={(item: Requirement) => {
          const document = documentFor(item.id);
          return (
            <Dropdown
              value={document?.status ?? "missing"}
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
                  requirement_id: item.id,
                  status: event.value as StudentDocument["status"],
                  received_on:
                    event.value === "provided"
                      ? new Date().toISOString().slice(0, 10)
                      : null,
                }).then(load)
              }
            />
          );
        }}
      />
      <Column
        header="Référence fichier"
        body={(item: Requirement) => {
          const document = documentFor(item.id);
          return (
            <InputText
              placeholder="Chemin ou référence"
              defaultValue={document?.file_path ?? ""}
              onBlur={(event) =>
                void saveStudentDocument({
                  institution_id: institutionId,
                  student_id: studentId,
                  enrollment_id: enrollmentId,
                  requirement_id: item.id,
                  status: document?.status ?? "missing",
                  file_path: event.target.value || null,
                }).then(load)
              }
            />
          );
        }}
      />
      <Column
        header="Contrôle"
        body={(item: Requirement) => {
          const status = documentFor(item.id)?.status ?? "missing";
          return (
            <Tag
              value={status === "provided" ? "Complet" : "À contrôler"}
              severity={status === "provided" ? "success" : "warning"}
            />
          );
        }}
      />
    </DataTable>
  );
}
