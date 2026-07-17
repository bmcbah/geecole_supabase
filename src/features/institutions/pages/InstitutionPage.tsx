import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useToast } from "../../../shared/components/toast-context";
import {
  createInstitution,
  getMyInstitutions,
} from "../services/institution.service";
import {
  institutionSchema,
  type InstitutionInput,
} from "../schemas/institution.schema";
import type { Institution } from "../types/institution";
import { EnrollmentPolicyPanel } from "../../../modules/schooling/components/EnrollmentPolicyPanel";

const defaults: InstitutionInput = {
  name: "",
  slug: "",
  phone: "",
  email: "",
  address: "",
};
export function InstitutionPage() {
  const notify = useToast();
  const [items, setItems] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [open, setOpen] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstitutionInput>({
    resolver: zodResolver(institutionSchema),
    defaultValues: defaults,
  });
  const load = useCallback(async () => {
    setLoading(true);
    setFailure("");
    try {
      setItems(await getMyInstitutions());
    } catch {
      setFailure("Impossible de charger les établissements.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const submit = handleSubmit(async (input) => {
    try {
      await createInstitution(input);
      notify({
        severity: "success",
        summary: "Établissement créé",
        detail: input.name,
      });
      setOpen(false);
      reset(defaults);
      await load();
    } catch {
      notify({
        severity: "error",
        summary: "Création impossible",
        detail: "Le code établissement est peut-être déjà utilisé.",
      });
    }
  });
  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Fondation</span>
          <h1>Mon établissement</h1>
          <p>
            Les informations et règles propres à chaque école seront
            centralisées ici.
          </p>
        </div>
        <Button
          label="Créer un établissement"
          icon="pi pi-plus"
          onClick={() => setOpen(true)}
        />
      </div>
      {loading ? (
        <div className="content-state">
          <ProgressSpinner />
        </div>
      ) : failure ? (
        <Message severity="error" text={failure} />
      ) : items.length === 0 ? (
        <Card className="empty-card">
          <i className="pi pi-building empty-icon" />
          <h2>Aucun établissement</h2>
          <p>Créez le premier établissement pour commencer la configuration.</p>
        </Card>
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <Card key={item.id} title={item.name} subTitle={item.slug}>
              <dl>
                <div>
                  <dt>Devise</dt>
                  <dd>{item.currency}</dd>
                </div>
                <div>
                  <dt>Fuseau horaire</dt>
                  <dd>{item.timezone}</dd>
                </div>
                <div>
                  <dt>Téléphone</dt>
                  <dd>{item.phone ?? "Non renseigné"}</dd>
                </div>
              </dl>
              <EnrollmentPolicyPanel institutionId={item.id} />
            </Card>
          ))}
        </div>
      )}
      <Dialog
        header="Créer un établissement"
        visible={open}
        modal
        className="form-dialog"
        onHide={() => setOpen(false)}
      >
        <form
          className="form-stack"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          {(["name", "slug", "phone", "email", "address"] as const).map(
            (name) => (
              <div className="field" key={name}>
                <label htmlFor={name}>
                  {
                    {
                      name: "Nom",
                      slug: "Code établissement",
                      phone: "Téléphone",
                      email: "E-mail",
                      address: "Adresse",
                    }[name]
                  }
                </label>
                <Controller
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <InputText
                      {...field}
                      id={name}
                      invalid={Boolean(errors[name])}
                    />
                  )}
                />
                {errors[name] && (
                  <small className="p-error">{errors[name]?.message}</small>
                )}
              </div>
            ),
          )}
          <div className="dialog-actions">
            <Button
              type="button"
              label="Annuler"
              severity="secondary"
              outlined
              onClick={() => setOpen(false)}
            />
            <Button
              type="submit"
              label="Créer"
              icon="pi pi-check"
              loading={isSubmitting}
            />
          </div>
        </form>
      </Dialog>
    </section>
  );
}
