import { useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import type { Institution } from "../../../features/institutions/types/institution";
import { supabase } from "../../../shared/lib/supabase/client";
import { useToast } from "../../../shared/components/toast-context";
export function ClassOrganizationCard({
  institution,
  onSaved,
}: {
  institution: Institution;
  onSaved: () => Promise<void>;
}) {
  const notify = useToast();
  const [mode, setMode] = useState(institution.class_structure_mode);
  const [busy, setBusy] = useState(false);
  return (
    <Card
      title="Organisation des classes"
      subTitle="Adaptez le vocabulaire et la structure à l’établissement"
      className="policy-card medium-controls"
    >
      <label className="field">
        <span>Mode d’organisation</span>
        <Dropdown
          value={mode}
          options={[
            { label: "Niveaux puis classes", value: "levels_and_classes" },
            {
              label: "Classes faisant office de niveaux",
              value: "classes_as_levels",
            },
          ]}
          onChange={(e) => setMode(e.value as typeof mode)}
        />
        <small>
          {mode === "levels_and_classes"
            ? "Exemple : niveau 7e, puis classes 7e A et 7e B."
            : "Créer une classe crée aussi son niveau pédagogique annuel."}
        </small>
      </label>
      <div className="dialog-actions">
        <Button
          label="Enregistrer"
          icon="pi pi-check"
          loading={busy}
          disabled={mode === institution.class_structure_mode}
          onClick={() => {
            setBusy(true);
            void supabase
              .from("institutions")
              .update({ class_structure_mode: mode })
              .eq("id", institution.id)
              .then(({ error }) => {
                if (error) throw error;
                return onSaved();
              })
              .then(() =>
                notify({
                  severity: "success",
                  summary: "Organisation enregistrée",
                }),
              )
              .finally(() => setBusy(false));
          }}
        />
      </div>
    </Card>
  );
}
