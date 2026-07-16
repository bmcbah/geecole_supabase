import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { SelectButton } from "primereact/selectbutton";
import { Tag } from "primereact/tag";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { StructureItemInput } from "../schemas/academic-structure.schema";
import {
  listAcademicStructure,
  listAnnualAcademicLevels,
  saveCycle,
  saveLevel,
  setAnnualCycleLevels,
} from "../services/academic-structure.service";
import type { AcademicCycle, GradeLevel } from "../types/academic-structure";
import type { AcademicYearStatus } from "../types/settings";
import { StructureItemDialog } from "./StructureItemDialog";

interface Props {
  institutionId: string;
}
type Mode = "catalog" | "annual";
type DialogState = {
  kind: "cycle" | "niveau";
  item?: AcademicCycle | GradeLevel;
} | null;

const modes = [
  { label: "Catalogue de l’école", value: "catalog", icon: "pi pi-book" },
  { label: "Configuration annuelle", value: "annual", icon: "pi pi-calendar" },
];
const statusLabels: Record<AcademicYearStatus, string> = {
  preparation: "Préparation",
  open: "Ouverte",
  closed: "Clôturée",
  archived: "Archivée",
};
const toInput = (
  item?: AcademicCycle | GradeLevel,
): StructureItemInput | undefined =>
  item
    ? {
        name: item.name,
        code: item.code,
        sortOrder: item.sort_order,
        isActive: item.is_active,
      }
    : undefined;

export function AcademicStructurePanel({ institutionId }: Props) {
  const notify = useToast();
  const { year: selectedYear } = useAcademicSession();
  const [mode, setMode] = useState<Mode>("catalog");
  const [cycles, setCycles] = useState<AcademicCycle[]>([]);
  const [levels, setLevels] = useState<GradeLevel[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<AcademicCycle | null>(
    null,
  );
  const [annualLevelIds, setAnnualLevelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailure("");
    try {
      const structure = await listAcademicStructure(institutionId);
      setCycles(structure.cycles);
      setLevels(structure.levels);
      setSelectedCycle(
        (current) =>
          structure.cycles.find((item) => item.id === current?.id) ??
          structure.cycles[0] ??
          null,
      );
    } catch {
      setFailure("Impossible de charger la structure scolaire.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!selectedYear) {
      setAnnualLevelIds([]);
      return;
    }
    void listAnnualAcademicLevels(selectedYear.id)
      .then((items) => setAnnualLevelIds(items.map((item) => item.level_id)))
      .catch(() =>
        setFailure("Impossible de charger la configuration annuelle."),
      );
  }, [selectedYear]);

  const visibleLevels = useMemo(
    () => levels.filter((item) => item.cycle_id === selectedCycle?.id),
    [levels, selectedCycle],
  );
  const selectedAnnualLevels = useMemo(
    () => visibleLevels.filter((item) => annualLevelIds.includes(item.id)),
    [annualLevelIds, visibleLevels],
  );
  const annualLocked = selectedYear?.status !== "preparation";

  const submitCatalogItem = async (input: StructureItemInput) => {
    if (!dialog) return;
    setSaving(true);
    try {
      if (dialog.kind === "cycle")
        await saveCycle(institutionId, input, dialog.item?.id);
      else if (selectedCycle)
        await saveLevel(
          institutionId,
          selectedCycle.id,
          input,
          dialog.item?.id,
        );
      setDialog(null);
      notify({ severity: "success", summary: "Catalogue enregistré" });
      await load();
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Le nom ou le code existe peut-être déjà.",
      });
    } finally {
      setSaving(false);
    }
  };
  const saveAnnualConfiguration = async () => {
    if (!selectedYear || !selectedCycle) return;
    setSaving(true);
    try {
      await setAnnualCycleLevels(
        selectedYear.id,
        selectedCycle.id,
        selectedAnnualLevels.map((item) => item.id),
      );
      notify({
        severity: "success",
        summary: "Configuration annuelle enregistrée",
      });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Seule une année en préparation peut être modifiée.",
      });
    } finally {
      setSaving(false);
    }
  };
  const status = (item: AcademicCycle | GradeLevel) => (
    <Tag
      value={item.is_active ? "Actif" : "Inactif"}
      severity={item.is_active ? "success" : "secondary"}
    />
  );

  if (failure) return <Message severity="error" text={failure} />;
  return (
    <div className="structure-page">
      <Card>
        <div className="structure-heading">
          <div>
            <h2>Organisation pédagogique</h2>
            <p>
              Définissez d’abord le catalogue de l’école, puis activez les
              niveaux réellement proposés pour chaque année scolaire.
            </p>
          </div>
          <SelectButton
            value={mode}
            options={modes}
            optionLabel="label"
            optionValue="value"
            onChange={(event) => {
              const value = event.value as unknown;
              if (value === "catalog" || value === "annual") setMode(value);
            }}
            allowEmpty={false}
          />
        </div>
      </Card>

      {mode === "catalog" ? (
        <Card
          title="Catalogue de l’école"
          subTitle="Ces cycles et niveaux sont réutilisables d’une année à l’autre"
        >
          <div className="structure-filters">
            <div className="field structure-cycle-field">
              <label htmlFor="catalog-cycle">Cycle</label>
              <Dropdown
                inputId="catalog-cycle"
                value={selectedCycle?.id}
                options={cycles}
                optionLabel="name"
                optionValue="id"
                placeholder="Choisir un cycle"
                loading={loading}
                onChange={(event) => {
                  const value = event.value as unknown;
                  if (typeof value === "string")
                    setSelectedCycle(
                      cycles.find((item) => item.id === value) ?? null,
                    );
                }}
              />
            </div>
            <div className="table-actions">
              <Button
                label="Nouveau cycle"
                icon="pi pi-plus"
                outlined
                onClick={() => setDialog({ kind: "cycle" })}
              />
              <Button
                label="Modifier le cycle"
                icon="pi pi-pencil"
                text
                disabled={!selectedCycle}
                onClick={() =>
                  selectedCycle &&
                  setDialog({ kind: "cycle", item: selectedCycle })
                }
              />
            </div>
          </div>
          <div className="panel-toolbar">
            <div>
              <strong>Niveaux du cycle</strong>
              <p>Ordonnez les niveaux dans le parcours de l’élève.</p>
            </div>
            <Button
              label="Nouveau niveau"
              icon="pi pi-plus"
              disabled={!selectedCycle}
              onClick={() => setDialog({ kind: "niveau" })}
            />
          </div>
          <DataTable
            value={visibleLevels}
            loading={loading}
            dataKey="id"
            emptyMessage="Aucun niveau dans ce cycle"
            stripedRows
          >
            <Column field="sort_order" header="Ordre" />
            <Column field="name" header="Niveau" />
            <Column field="code" header="Code" />
            <Column header="Statut" body={status} />
            <Column
              header="Actions"
              body={(item: GradeLevel) => (
                <Button
                  icon="pi pi-pencil"
                  text
                  aria-label={`Modifier ${item.name}`}
                  onClick={() => setDialog({ kind: "niveau", item })}
                />
              )}
            />
          </DataTable>
        </Card>
      ) : (
        <Card
          title="Configuration annuelle"
          subTitle="Choisissez les niveaux ouverts aux inscriptions pour l’année sélectionnée"
        >
          <div className="structure-filters annual-filters">
            <div className="field">
              <label>Année scolaire</label>
              <strong>
                {selectedYear?.name ?? "Aucune année sélectionnée"}
              </strong>
            </div>
            <div className="field">
              <label htmlFor="annual-cycle">Cycle à configurer</label>
              <Dropdown
                inputId="annual-cycle"
                value={selectedCycle?.id}
                options={cycles.filter((item) => item.is_active)}
                optionLabel="name"
                optionValue="id"
                placeholder="Choisir un cycle"
                onChange={(event) => {
                  const value = event.value as unknown;
                  if (typeof value === "string")
                    setSelectedCycle(
                      cycles.find((item) => item.id === value) ?? null,
                    );
                }}
              />
            </div>
            {selectedYear && (
              <Tag
                value={statusLabels[selectedYear.status]}
                severity={annualLocked ? "secondary" : "info"}
              />
            )}
          </div>
          {annualLocked && selectedYear ? (
            <Message
              severity="info"
              text="Cette année n’est plus en préparation : sa structure est consultable mais verrouillée."
            />
          ) : (
            <Message
              severity="secondary"
              text="Cochez les niveaux que l’école proposera cette année. Vous pourrez ensuite créer les classes et inscrire les élèves."
            />
          )}
          <DataTable
            value={visibleLevels.filter((item) => item.is_active)}
            dataKey="id"
            selectionMode="multiple"
            isDataSelectable={() => !annualLocked}
            selection={selectedAnnualLevels}
            onSelectionChange={(event) => {
              const selected = event.value;
              const otherCycles = annualLevelIds.filter(
                (id) => !visibleLevels.some((level) => level.id === id),
              );
              setAnnualLevelIds([
                ...otherCycles,
                ...selected.map((item) => item.id),
              ]);
            }}
            emptyMessage="Aucun niveau actif dans ce cycle"
            stripedRows
          >
            <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
            <Column field="sort_order" header="Ordre" />
            <Column field="name" header="Niveau" />
            <Column field="code" header="Code" />
          </DataTable>
          <div className="form-actions structure-save">
            <Button
              label="Enregistrer les niveaux ouverts"
              icon="pi pi-check"
              loading={saving}
              disabled={!selectedYear || !selectedCycle || annualLocked}
              onClick={() => void saveAnnualConfiguration()}
            />
          </div>
        </Card>
      )}

      <StructureItemDialog
        kind={dialog?.kind ?? "cycle"}
        visible={Boolean(dialog)}
        loading={saving}
        initial={toInput(dialog?.item)}
        onHide={() => setDialog(null)}
        onSubmit={submitCatalogItem}
      />
    </div>
  );
}
