import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import {
  changeEnrollmentStatus,
  updateGuardian,
  updateStudent,
} from "../services/schooling.service";
import {
  confirmEnrollment,
  evaluateEnrollment,
  hasBlockingValidation,
  type EnrollmentValidationResult,
} from "../services/enrollment-workflow.service";
import type { Database } from "../../../shared/lib/supabase/database.types";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Guardian = Database["public"]["Tables"]["guardians"]["Row"];
type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];

interface Props {
  student: Student;
  guardian?: Guardian;
  enrollment: Enrollment | null;
  onSaved: () => Promise<void>;
}

const severity = (value: EnrollmentValidationResult["severity"]) => {
  if (value === "blocking") return "error" as const;
  if (value === "warning") return "warn" as const;
  if (value === "success") return "success" as const;
  return "info" as const;
};

export function StudentProfileActions({
  student,
  guardian,
  enrollment,
  onSaved,
}: Props) {
  const menu = useRef<Menu>(null);
  const [dialog, setDialog] = useState<
    "student" | "guardian" | "status" | "validation" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [reason, setReason] = useState("");
  const [validations, setValidations] = useState<EnrollmentValidationResult[]>([]);
  const [studentForm, setStudentForm] = useState({
    first_name: student.first_name,
    last_name: student.last_name,
    birth_date: student.birth_date ?? "",
    birth_place: student.birth_place ?? "",
    address: student.address ?? "",
  });
  const [guardianForm, setGuardianForm] = useState({
    first_name: guardian?.first_name ?? "",
    last_name: guardian?.last_name ?? "",
    primary_phone: guardian?.primary_phone ?? "",
  });

  useEffect(() => {
    setStudentForm({
      first_name: student.first_name,
      last_name: student.last_name,
      birth_date: student.birth_date ?? "",
      birth_place: student.birth_place ?? "",
      address: student.address ?? "",
    });
  }, [student]);

  useEffect(() => {
    setGuardianForm({
      first_name: guardian?.first_name ?? "",
      last_name: guardian?.last_name ?? "",
      primary_phone: guardian?.primary_phone ?? "",
    });
  }, [guardian]);

  const finish = async (action: () => Promise<void>) => {
    setBusy(true);
    setFailure("");
    try {
      await action();
      await onSaved();
      setDialog(null);
      setReason("");
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "La modification n’a pas pu être enregistrée.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!enrollment) return;
    setBusy(true);
    setFailure("");
    setValidations([]);
    try {
      const results = await evaluateEnrollment(enrollment.id);
      setValidations(results);
      if (hasBlockingValidation(results)) {
        setDialog("validation");
        return;
      }
      await confirmEnrollment(enrollment.id);
      await onSaved();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "La confirmation n’a pas pu être enregistrée.",
      );
      setDialog("validation");
    } finally {
      setBusy(false);
    }
  };

  const canConfirm = Boolean(
    enrollment && ["draft", "pre_registered", "pending"].includes(enrollment.status),
  );

  const menuItems: MenuItem[] = [
    {
      label: "Modifier l’élève",
      icon: "pi pi-pencil",
      command: () => setDialog("student"),
    },
    ...(guardian
      ? [
          {
            label: "Modifier le responsable",
            icon: "pi pi-user-edit",
            command: () => setDialog("guardian" as const),
          },
        ]
      : []),
    ...(enrollment &&
    !["cancelled", "rejected", "withdrawn", "transferred"].includes(
      enrollment.status,
    )
      ? [
          { separator: true },
          {
            label: "Annuler l’inscription",
            icon: "pi pi-times",
            className: "menu-danger",
            command: () => setDialog("status" as const),
          },
        ]
      : []),
  ];

  return (
    <div className="student-profile-actions">
      {canConfirm ? (
        <Button
          label="Contrôler et confirmer"
          icon="pi pi-check"
          loading={busy}
          onClick={() => void confirm()}
        />
      ) : null}

      <Menu model={menuItems} popup ref={menu} />
      <Button
        label="Actions"
        icon="pi pi-ellipsis-v"
        severity="secondary"
        outlined
        onClick={(event) => menu.current?.toggle(event)}
      />

      <Dialog
        header="Contrôles de l’inscription"
        visible={dialog === "validation"}
        onHide={() => setDialog(null)}
        className="form-dialog medium-controls"
      >
        {failure ? <Message severity="error" text={failure} /> : null}
        <div className="space-y-2">
          {validations.map((validation) => (
            <Message
              key={validation.id}
              severity={severity(validation.severity)}
              text={`${validation.domain} · ${validation.message_key}`}
            />
          ))}
        </div>
        <div className="dialog-actions">
          <Button
            label="Fermer"
            severity="secondary"
            outlined
            onClick={() => setDialog(null)}
          />
        </div>
      </Dialog>

      <Dialog
        header="Modifier l’identité"
        visible={dialog === "student"}
        onHide={() => setDialog(null)}
        className="form-dialog medium-controls"
      >
        <div className="schooling-form-grid">
          <Field label="Prénom" value={studentForm.first_name} onChange={(value) => setStudentForm((current) => ({ ...current, first_name: value }))} />
          <Field label="Nom" value={studentForm.last_name} onChange={(value) => setStudentForm((current) => ({ ...current, last_name: value }))} />
          <Field label="Date de naissance" type="date" value={studentForm.birth_date} onChange={(value) => setStudentForm((current) => ({ ...current, birth_date: value }))} />
          <Field label="Lieu de naissance" value={studentForm.birth_place} onChange={(value) => setStudentForm((current) => ({ ...current, birth_place: value }))} />
          <Field label="Adresse" value={studentForm.address} onChange={(value) => setStudentForm((current) => ({ ...current, address: value }))} />
        </div>
        {failure ? <Message severity="error" text={failure} /> : null}
        <Actions
          busy={busy}
          onCancel={() => setDialog(null)}
          onSave={() => void finish(() => updateStudent(student.id, {
            ...studentForm,
            birth_date: studentForm.birth_date || null,
          }))}
        />
      </Dialog>

      <Dialog
        header="Modifier le responsable"
        visible={dialog === "guardian"}
        onHide={() => setDialog(null)}
        className="form-dialog medium-controls"
      >
        <div className="schooling-form-grid">
          <Field label="Prénom" value={guardianForm.first_name} onChange={(value) => setGuardianForm((current) => ({ ...current, first_name: value }))} />
          <Field label="Nom" value={guardianForm.last_name} onChange={(value) => setGuardianForm((current) => ({ ...current, last_name: value }))} />
          <Field label="Téléphone" value={guardianForm.primary_phone} onChange={(value) => setGuardianForm((current) => ({ ...current, primary_phone: value }))} />
        </div>
        {failure ? <Message severity="error" text={failure} /> : null}
        <Actions
          busy={busy}
          onCancel={() => setDialog(null)}
          onSave={() => guardian && void finish(() => updateGuardian(guardian.id, guardianForm))}
        />
      </Dialog>

      <Dialog
        header="Annuler l’inscription"
        visible={dialog === "status"}
        onHide={() => setDialog(null)}
        className="form-dialog medium-controls"
      >
        <Message
          severity="warn"
          text="L’inscription restera dans l’historique. Cette action ne supprime pas l’élève."
        />
        <Field label="Motif obligatoire" value={reason} onChange={setReason} />
        {failure ? <Message severity="error" text={failure} /> : null}
        <div className="dialog-actions">
          <Button label="Retour" severity="secondary" outlined onClick={() => setDialog(null)} />
          <Button
            label="Annuler l’inscription"
            severity="danger"
            loading={busy}
            disabled={reason.trim().length < 3}
            onClick={() => enrollment && void finish(() => changeEnrollmentStatus(enrollment.id, "cancelled", reason))}
          />
        </div>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  type,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <InputText type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Actions({
  busy,
  onCancel,
  onSave,
}: {
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="dialog-actions">
      <Button label="Annuler" severity="secondary" outlined onClick={onCancel} />
      <Button label="Enregistrer" icon="pi pi-check" loading={busy} onClick={onSave} />
    </div>
  );
}
