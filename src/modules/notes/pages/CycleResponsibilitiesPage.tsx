import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  closeCycleResponsibility,
  listCycleResponsibilityContext,
  saveCycleResponsibility,
  type CycleResponsibilityRow,
  type ResponsibilityCapacity,
} from "../services/cycle-responsibilities.service";

const capacityOptions = [
  { label: "Titulaire", value: "holder" },
  { label: "Intérimaire", value: "acting" },
  { label: "Adjoint", value: "deputy" },
];
const capacityLabels = {
  holder: "Titulaire",
  acting: "Intérimaire",
  deputy: "Adjoint",
};
const emptyDraft = {
  cycleId: "",
  typeId: "",
  personId: "",
  capacity: "holder" as ResponsibilityCapacity,
  startsOn: "",
  endsOn: "",
  replacedPersonId: "",
};

export function CycleResponsibilitiesPage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [context, setContext] = useState<Awaited<
    ReturnType<typeof listCycleResponsibilityContext>
  > | null>(null);
  const [cycleId, setCycleId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    try {
      setContext(await listCycleResponsibilityContext(institutionId, yearId));
      setError("");
    } catch {
      setError("Impossible de charger les responsables de cycle.");
    }
  }, [institutionId, yearId]);
  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () =>
      (context?.rows ?? []).filter((row) => {
        const needle = query.trim().toLocaleLowerCase("fr");
        return (
          (!cycleId || row.cycleId === cycleId) &&
          (!needle ||
            [
              row.personName,
              row.typeName,
              row.cycleName,
              capacityLabels[row.capacity],
            ].some((value) => value.toLocaleLowerCase("fr").includes(needle)))
        );
      }),
    [context, cycleId, query],
  );

  const submit = async () => {
    if (
      !yearId ||
      !draft.cycleId ||
      !draft.typeId ||
      !draft.personId ||
      !draft.startsOn ||
      (draft.capacity === "acting" && !draft.replacedPersonId)
    ) {
      setFormError(
        draft.capacity === "acting" && !draft.replacedPersonId
          ? "Sélectionnez la personne remplacée pour un intérim."
          : "Renseignez le cycle, la responsabilité, la personne et la date de début.",
      );
      return;
    }
    if (draft.endsOn && draft.endsOn < draft.startsOn) {
      setFormError("La date de fin doit être postérieure à la date de début.");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      await saveCycleResponsibility({
        institutionId,
        yearId,
        ...draft,
        endsOn: draft.endsOn || null,
        replacedPersonId: draft.replacedPersonId || null,
        status: "active",
      });
      setOpen(false);
      setDraft(emptyDraft);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Affectation impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow="Notes & Bulletins · Configuration"
        title="Responsables de cycle"
        description={`Affectations administratives et pédagogiques historisées · ${year?.name ?? "Année"}`}
        actions={
          <Button
            label="Affecter une responsabilité"
            icon="pi pi-plus"
            onClick={() => {
              setDraft(emptyDraft);
              setFormError("");
              setOpen(true);
            }}
          />
        }
      />
      <Message
        severity="info"
        text="Une responsabilité de cycle ne transforme pas automatiquement la fonction professionnelle ni le rôle applicatif de la personne."
      />
      {error ? <Message severity="error" text={error} /> : null}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Personne, fonction ou cycle"
              className="w-full"
            />
          </span>
          <Dropdown
            value={cycleId}
            options={[
              { label: "Tous les cycles", value: "" },
              ...(context?.cycles ?? []).map((cycle) => ({
                label: cycle.name,
                value: cycle.cycle_id,
              })),
            ]}
            onChange={(event) => setCycleId(String(event.value ?? ""))}
            className="w-full"
          />
        </div>
        <DataTable
          value={rows}
          dataKey="id"
          stripedRows
          paginator
          rows={10}
          emptyMessage="Aucune responsabilité affectée"
        >
          <Column field="cycleName" header="Cycle" sortable />
          <Column field="typeName" header="Responsabilité" sortable />
          <Column field="personName" header="Personne" sortable />
          <Column
            field="capacity"
            header="Qualité"
            body={(row: CycleResponsibilityRow) => (
              <Tag
                value={capacityLabels[row.capacity]}
                severity={
                  row.capacity === "acting"
                    ? "warning"
                    : row.capacity === "holder"
                      ? "success"
                      : "info"
                }
              />
            )}
          />
          <Column
            header="Validité"
            body={(row: CycleResponsibilityRow) =>
              `${new Date(`${row.startsOn}T00:00:00`).toLocaleDateString("fr-FR")} → ${row.endsOn ? new Date(`${row.endsOn}T00:00:00`).toLocaleDateString("fr-FR") : "en cours"}`
            }
          />
          <Column
            field="status"
            header="État"
            body={(row: CycleResponsibilityRow) => (
              <Tag
                value={row.status === "active" ? "Active" : "Clôturée"}
                severity={row.status === "active" ? "success" : "secondary"}
              />
            )}
          />
          <Column
            header=""
            body={(row: CycleResponsibilityRow) =>
              row.status === "active" ? (
                <Button
                  label="Clôturer"
                  icon="pi pi-stop"
                  text
                  severity="secondary"
                  onClick={() =>
                    void closeCycleResponsibility(
                      row.id,
                      new Date().toISOString().slice(0, 10),
                    ).then(load)
                  }
                />
              ) : null
            }
          />
        </DataTable>
      </section>
      <Dialog
        header="Affecter une responsabilité"
        visible={open}
        modal
        className="w-[min(94vw,46rem)]"
        onHide={() => {
          setOpen(false);
          setFormError("");
        }}
      >
        <div className="space-y-5">
          {formError ? <Message severity="error" text={formError} /> : null}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Périmètre et responsabilité
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cycle">
                <Dropdown
                  value={draft.cycleId}
                  options={(context?.cycles ?? []).map((cycle) => ({
                    label: cycle.name,
                    value: cycle.cycle_id,
                  }))}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      cycleId: String(event.value ?? ""),
                    }))
                  }
                  className="w-full"
                />
              </Field>
              <Field label="Responsabilité">
                <Dropdown
                  value={draft.typeId}
                  options={(context?.types ?? []).map((type) => ({
                    label: type.name,
                    value: type.id,
                  }))}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      typeId: String(event.value ?? ""),
                    }))
                  }
                  className="w-full"
                />
              </Field>
            </div>
          </section>
          <section className="border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Personne désignée
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Personne">
                <Dropdown
                  filter
                  value={draft.personId}
                  options={(context?.people ?? []).map((person) => ({
                    label: `${person.first_name} ${person.last_name}`,
                    value: person.id,
                  }))}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      personId: String(event.value ?? ""),
                    }))
                  }
                  className="w-full"
                />
              </Field>
              <Field label="Qualité">
                <Dropdown
                  value={draft.capacity}
                  options={capacityOptions}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      capacity: event.value as ResponsibilityCapacity,
                      replacedPersonId: "",
                    }))
                  }
                  className="w-full"
                />
              </Field>
              {draft.capacity === "acting" ? (
                <Field label="Personne remplacée">
                  <Dropdown
                    filter
                    value={draft.replacedPersonId}
                    options={(context?.people ?? [])
                      .filter((person) => person.id !== draft.personId)
                      .map((person) => ({
                        label: `${person.first_name} ${person.last_name}`,
                        value: person.id,
                      }))}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        replacedPersonId: String(event.value ?? ""),
                      }))
                    }
                    className="w-full"
                  />
                </Field>
              ) : null}
            </div>
          </section>
          <section className="border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Période de responsabilité
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Début">
                <InputText
                  type="date"
                  value={draft.startsOn}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      startsOn: event.target.value,
                    }))
                  }
                  className="w-full"
                />
              </Field>
              <Field label="Fin facultative">
                <InputText
                  type="date"
                  value={draft.endsOn}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      endsOn: event.target.value,
                    }))
                  }
                  className="w-full"
                />
              </Field>
            </div>
          </section>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            severity="secondary"
            outlined
            onClick={() => {
              setOpen(false);
              setFormError("");
            }}
          />
          <Button
            label="Affecter"
            icon="pi pi-check"
            loading={saving}
            onClick={() => void submit()}
          />
        </div>
      </Dialog>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}
