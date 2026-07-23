import { useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import type { StudentGuardian } from "../services/schooling.service";
import {
  removeStudentGuardian,
  updateStudentGuardian,
} from "../services/schooling.service";

type Draft = {
  firstName: string;
  lastName: string;
  phone: string;
  relationship: string;
  primary: boolean;
  financial: boolean;
  emergency: boolean;
};

export function GuardianManagementPanel({
  studentId,
  guardians,
  onAdd,
  onSaved,
}: {
  studentId: string;
  guardians: StudentGuardian[];
  onAdd: () => void;
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<StudentGuardian | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);

  const edit = (guardian: StudentGuardian) => {
    setSelected(guardian);
    setDraft({
      firstName: guardian.first_name,
      lastName: guardian.last_name,
      phone: guardian.primary_phone,
      relationship: guardian.relationship,
      primary: guardian.is_primary_contact,
      financial: guardian.is_financial_responsible,
      emergency: guardian.is_emergency_contact,
    });
    setFailure("");
  };

  const save = async () => {
    if (!selected || !draft) return;
    setSaving(true);
    setFailure("");
    try {
      await updateStudentGuardian(studentId, selected.id, draft);
      setSelected(null);
      setDraft(null);
      await onSaved();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Modification impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (guardian: StudentGuardian) => {
    setFailure("");
    try {
      await removeStudentGuardian(studentId, guardian.id);
      await onSaved();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Suppression impossible.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Responsables de l’élève
          </h2>
          <p className="text-sm text-slate-500">
            Gérez les contacts, rôles et responsabilités sans quitter la fiche.
          </p>
        </div>
        <Button
          label="Ajouter"
          icon="pi pi-user-plus"
          size="small"
          onClick={onAdd}
        />
      </div>
      {failure ? <Message severity="error" text={failure} /> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {guardians.map((guardian) => (
          <article
            key={guardian.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="block text-sm text-slate-900">
                  {guardian.first_name} {guardian.last_name}
                </strong>
                <span className="text-xs text-slate-500">
                  {guardian.relationship}
                </span>
              </div>
              {guardian.is_primary_contact ? (
                <Tag value="Principal" severity="success" />
              ) : null}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              <i className="pi pi-phone mr-2 text-emerald-500" />
              {guardian.primary_phone || "Téléphone non renseigné"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {guardian.is_financial_responsible ? (
                <Tag value="Financier" severity="info" />
              ) : null}
              {guardian.is_emergency_contact ? (
                <Tag value="Urgence" severity="warning" />
              ) : null}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                label="Modifier"
                icon="pi pi-pencil"
                text
                size="small"
                onClick={() => edit(guardian)}
              />
              <Button
                label="Retirer"
                icon="pi pi-trash"
                text
                severity="danger"
                size="small"
                disabled={guardians.length <= 1}
                onClick={() => void remove(guardian)}
              />
            </div>
          </article>
        ))}
      </div>
      <Dialog
        header="Modifier le responsable"
        visible={Boolean(selected && draft)}
        onHide={() => {
          setSelected(null);
          setDraft(null);
        }}
        style={{ width: "min(620px, 95vw)" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              text
              severity="secondary"
              onClick={() => {
                setSelected(null);
                setDraft(null);
              }}
            />
            <Button
              label="Enregistrer"
              loading={saving}
              onClick={() => void save()}
            />
          </div>
        }
      >
        {draft ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-semibold">Prénom</span>
              <InputText
                className="w-full"
                value={draft.firstName}
                onChange={(e) =>
                  setDraft({ ...draft, firstName: e.target.value })
                }
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold">Nom</span>
              <InputText
                className="w-full"
                value={draft.lastName}
                onChange={(e) =>
                  setDraft({ ...draft, lastName: e.target.value })
                }
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold">
                Téléphone
              </span>
              <InputText
                className="w-full"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold">Lien</span>
              <InputText
                className="w-full"
                value={draft.relationship}
                onChange={(e) =>
                  setDraft({ ...draft, relationship: e.target.value })
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={draft.primary}
                onChange={(e) =>
                  setDraft({ ...draft, primary: Boolean(e.checked) })
                }
              />
              <span>Contact principal</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={draft.financial}
                onChange={(e) =>
                  setDraft({ ...draft, financial: Boolean(e.checked) })
                }
              />
              <span>Responsable financier</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={draft.emergency}
                onChange={(e) =>
                  setDraft({ ...draft, emergency: Boolean(e.checked) })
                }
              />
              <span>Contact d’urgence</span>
            </label>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
