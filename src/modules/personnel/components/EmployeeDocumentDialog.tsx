import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { FileUpload, type FileUploadHandlerEvent } from "primereact/fileupload";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import type { CatalogItem } from "../services/personnel.service";
import {
  createEmployeeDocument,
  uploadPersonnelDocument,
} from "../services/personnel.service";
export function EmployeeDocumentDialog({
  visible,
  onHide,
  onSaved,
  institutionId,
  employeeId,
  catalogs,
}: {
  visible: boolean;
  onHide: () => void;
  onSaved: () => Promise<void>;
  institutionId: string;
  employeeId: string;
  catalogs: CatalogItem[];
}) {
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [issued, setIssued] = useState("");
  const [expires, setExpires] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const choose = (e: FileUploadHandlerEvent) => setFile(e.files[0] || null);
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (!name.trim() || !file)
        throw new Error("Le nom et le fichier sont obligatoires.");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = await uploadPersonnelDocument(
        `${institutionId}/personnel/${employeeId}/documents/${crypto.randomUUID()}-${safe}`,
        file,
      );
      await createEmployeeDocument({
        institution_id: institutionId,
        employee_id: employeeId,
        document_type_item_id: type,
        name,
        file_path: path,
        issued_on: issued,
        expires_on: expires,
        notes,
      });
      await onSaved();
      onHide();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Dépôt impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      header="Ajouter un document"
      visible={visible}
      onHide={onHide}
      className="w-[min(94vw,42rem)]"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type de document">
          <Dropdown
            value={type}
            showClear
            options={catalogs
              .filter((x) => x.category === "document_type" && x.is_active)
              .map((x) => ({
                value: x.id,
                label: x.local_label || x.default_label,
              }))}
            onChange={(e) => {
              setType(e.value || "");
              const x = catalogs.find((x) => x.id === e.value);
              if (x && !name) setName(x.local_label || x.default_label);
            }}
          />
        </Field>
        <Field label="Nom du document *">
          <InputText value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Date d’émission">
          <InputText
            type="date"
            value={issued}
            onChange={(e) => setIssued(e.target.value)}
          />
        </Field>
        <Field label="Date d’expiration">
          <InputText
            type="date"
            min={issued}
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Fichier PDF ou image (10 Mo max) *">
            <FileUpload
              mode="basic"
              name="document"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              maxFileSize={10000000}
              chooseLabel={file ? file.name : "Choisir un fichier"}
              customUpload
              auto
              uploadHandler={choose}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <InputTextarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
      </div>
      {failure && (
        <Message severity="error" text={failure} className="mt-4 w-full" />
      )}
      <Actions onHide={onHide} busy={busy} save={save} />
    </Dialog>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Actions({
  onHide,
  busy,
  save,
}: {
  onHide: () => void;
  busy: boolean;
  save: () => Promise<void>;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
      <Button label="Annuler" text severity="secondary" onClick={onHide} />
      <Button
        label="Déposer le document"
        icon="pi pi-upload"
        loading={busy}
        onClick={() => void save()}
      />
    </div>
  );
}
