import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import {
  installStudentDocumentCatalog,
  listDocumentRequirements,
  saveDocumentRequirement,
} from "../services/documents.service";
import type { Database } from "../../../shared/lib/supabase/database.types";
import { useToast } from "../../../shared/components/toast-context";
type Requirement = Database["public"]["Tables"]["document_requirements"]["Row"];
export function DocumentRequirementsPanel({
  institutionId,
}: {
  institutionId: string;
}) {
  const notify = useToast();
  const [items, setItems] = useState<Requirement[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    pre: false,
    confirmation: true,
  });
  const load = useCallback(
    () => listDocumentRequirements(institutionId).then(setItems),
    [institutionId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const installCatalog = async () => {
    try {
      const installed = await installStudentDocumentCatalog(institutionId);
      await load();
      notify({
        severity: "success",
        summary: "Catalogue GeEcole chargé",
        detail:
          Number(installed) > 0
            ? `${installed} pièce(s) ajoutée(s).`
            : "Le catalogue est déjà à jour.",
      });
    } catch {
      notify({
        severity: "error",
        summary: "Chargement du catalogue impossible",
      });
    }
  };
  return (
    <Card
      title="Documents exigés"
      subTitle="Liste configurable des pièces demandées"
      className="policy-card medium-controls"
    >
      <DataTable
        value={items}
        size="small"
        emptyMessage="Aucune pièce configurée"
      >
        <Column field="name" header="Pièce" />
        <Column
          header="Préinscription"
          body={(r: Requirement) =>
            r.required_for_pre_registration ? "Oui" : "Non"
          }
        />
        <Column
          header="Confirmation"
          body={(r: Requirement) =>
            r.required_for_confirmation ? "Oui" : "Non"
          }
        />
      </DataTable>
      <div className="dialog-actions">
        <Button
          label="Catalogue GeEcole"
          icon="pi pi-download"
          severity="secondary"
          outlined
          onClick={() => void installCatalog()}
        />
        <Button
          label="Ajouter une pièce"
          icon="pi pi-plus"
          outlined
          onClick={() => setOpen(true)}
        />
      </div>
      <Dialog
        header="Nouvelle pièce"
        visible={open}
        onHide={() => setOpen(false)}
        className="form-dialog"
      >
        <div className="schooling-form-grid">
          <label className="field">
            <span>Nom</span>
            <InputText
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Code</span>
            <InputText
              value={form.code}
              onChange={(e) =>
                setForm((v) => ({ ...v, code: e.target.value.toUpperCase() }))
              }
            />
          </label>
        </div>
        <div className="guardian-permissions">
          <label>
            <Checkbox
              checked={form.pre}
              onChange={(e) =>
                setForm((v) => ({ ...v, pre: Boolean(e.checked) }))
              }
            />
            <span>Obligatoire à la préinscription</span>
          </label>
          <label>
            <Checkbox
              checked={form.confirmation}
              onChange={(e) =>
                setForm((v) => ({ ...v, confirmation: Boolean(e.checked) }))
              }
            />
            <span>Obligatoire à la confirmation</span>
          </label>
        </div>
        <div className="dialog-actions">
          <Button
            label="Enregistrer"
            disabled={!form.name || !form.code}
            onClick={() =>
              void saveDocumentRequirement({
                institution_id: institutionId,
                name: form.name,
                code: form.code,
                required_for_pre_registration: form.pre,
                required_for_confirmation: form.confirmation,
              })
                .then(load)
                .then(() => setOpen(false))
            }
          />
        </div>
      </Dialog>
    </Card>
  );
}
