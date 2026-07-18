import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import type { Database } from "../../../shared/lib/supabase/database.types";
import {
  createAndLinkGuardian,
  linkGuardian,
  searchGuardians,
  updateStudentGuardian,
  type StudentGuardian,
} from "../services/schooling.service";

type Guardian = Database["public"]["Tables"]["guardians"]["Row"];

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  relationship: "guardian",
  primary: false,
  financial: false,
  emergency: false,
};

export function AddGuardianDialog({
  visible,
  institutionId,
  studentId,
  editing,
  onHide,
  onSaved,
}: {
  visible: boolean;
  institutionId: string;
  studentId: string;
  editing?: StudentGuardian | null;
  onHide: () => void;
  onSaved: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Guardian[]>([]);
  const [selected, setSelected] = useState<Guardian | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (!visible) return;
    setFailure("");
    setSelected(null);
    setQuery("");
    setResults([]);
    setForm(
      editing
        ? {
            firstName: editing.first_name,
            lastName: editing.last_name,
            phone: editing.primary_phone,
            relationship: editing.relationship,
            primary: editing.is_primary_contact,
            financial: editing.is_financial_responsible,
            emergency: editing.is_emergency_contact,
          }
        : emptyForm,
    );
  }, [editing, visible]);

  useEffect(() => {
    if (!visible || editing || query.trim().length < 3) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(
      () => void searchGuardians(institutionId, query).then(setResults),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [editing, institutionId, query, visible]);

  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (
        !form.firstName.trim() ||
        !form.lastName.trim() ||
        form.phone.trim().length < 8
      ) {
        throw new Error("Informations incomplètes");
      }

      if (editing) {
        await updateStudentGuardian(studentId, editing.id, form);
      } else {
        const common = {
          studentId,
          relationship: form.relationship,
          primary: form.primary,
          financial: form.financial,
          emergency: form.emergency,
        };
        if (selected) {
          await linkGuardian({ ...common, guardianId: selected.id });
        } else {
          await createAndLinkGuardian({ ...common, ...form });
        }
      }
      await onSaved();
      onHide();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer ce responsable.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      header={editing ? "Modifier le responsable" : "Ajouter un responsable"}
      visible={visible}
      onHide={onHide}
      className="form-dialog medium-controls"
    >
      {!editing ? (
        <>
          <label className="field">
            <span>Rechercher avant de créer</span>
            <InputText
              value={query}
              placeholder="Nom ou téléphone"
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
              }}
            />
          </label>
          {results.map((item) => (
            <button
              type="button"
              className={`guardian-result ${selected?.id === item.id ? "is-selected" : ""}`}
              key={item.id}
              onClick={() => {
                setSelected(item);
                setForm((value) => ({
                  ...value,
                  firstName: item.first_name,
                  lastName: item.last_name,
                  phone: item.primary_phone,
                }));
              }}
            >
              <span>
                <strong>
                  {item.first_name} {item.last_name}
                </strong>
                <small>{item.primary_phone}</small>
              </span>
              <i className="pi pi-check" />
            </button>
          ))}
        </>
      ) : null}

      <div className="schooling-form-grid">
        <label className="field">
          <span>Prénom</span>
          <InputText
            value={form.firstName}
            disabled={Boolean(selected)}
            onChange={(event) =>
              setForm((value) => ({ ...value, firstName: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Nom</span>
          <InputText
            value={form.lastName}
            disabled={Boolean(selected)}
            onChange={(event) =>
              setForm((value) => ({ ...value, lastName: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Téléphone</span>
          <InputText
            value={form.phone}
            disabled={Boolean(selected)}
            onChange={(event) =>
              setForm((value) => ({ ...value, phone: event.target.value }))
            }
          />
        </label>
      </div>

      <label className="field">
        <span>Lien avec l’élève</span>
        <Dropdown
          value={form.relationship}
          options={[
            { label: "Père", value: "father" },
            { label: "Mère", value: "mother" },
            { label: "Tuteur / Tutrice", value: "guardian" },
            { label: "Autre", value: "other" },
          ]}
          onChange={(event) =>
            setForm((value) => ({
              ...value,
              relationship: String(event.value),
            }))
          }
        />
      </label>

      <div className="guardian-permissions">
        {(
          [
            ["primary", "Contact principal"],
            ["financial", "Responsable financier"],
            ["emergency", "Contact d’urgence"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <Checkbox
              checked={form[key]}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  [key]: Boolean(event.checked),
                }))
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {failure ? <Message severity="error" text={failure} /> : null}
      <div className="dialog-actions">
        <Button label="Annuler" text severity="secondary" onClick={onHide} />
        <Button
          label={editing ? "Enregistrer" : selected ? "Lier ce responsable" : "Créer et lier"}
          icon={editing ? "pi pi-check" : "pi pi-user-plus"}
          loading={busy}
          onClick={() => void save()}
        />
      </div>
    </Dialog>
  );
}
