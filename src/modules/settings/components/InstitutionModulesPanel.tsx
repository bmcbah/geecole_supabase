import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  listInstitutionModules,
  setInstitutionModuleEnabled,
} from "../services/institution-modules.service";

type InstitutionModule = Awaited<
  ReturnType<typeof listInstitutionModules>
>[number];

export function InstitutionModulesPanel() {
  const { institutionId, refreshAuthorization } = useAcademicSession();
  const notify = useToast();
  const [modules, setModules] = useState<InstitutionModule[]>([]);
  const [changingCode, setChangingCode] = useState("");

  const load = useCallback(async () => {
    if (!institutionId) return;
    setModules(await listInstitutionModules(institutionId));
  }, [institutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const change = async (module: InstitutionModule, enabled: boolean) => {
    setChangingCode(module.code);
    try {
      await setInstitutionModuleEnabled({
        institutionId,
        moduleCode: module.code,
        enabled,
        reason: enabled
          ? "Activation depuis le paramétrage de l’établissement"
          : "Désactivation depuis le paramétrage de l’établissement",
      });
      await Promise.all([load(), refreshAuthorization()]);
      notify({
        severity: "success",
        summary: enabled ? "Module activé" : "Module désactivé",
        detail: module.name,
      });
    } catch {
      notify({
        severity: "error",
        summary: "Modification du module impossible",
        detail:
          "Vérifiez vos permissions et reconnectez-vous si cette action sensible a expiré.",
      });
    } finally {
      setChangingCode("");
    }
  };

  const requestChange = (module: InstitutionModule, enabled: boolean) => {
    if (enabled) {
      void change(module, true);
      return;
    }
    confirmDialog({
      header: `Désactiver ${module.name} ?`,
      message:
        "Les menus seront masqués et les appels directs devront être refusés. Les données existantes sont conservées.",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Désactiver",
      rejectLabel: "Annuler",
      acceptClassName: "p-button-danger",
      accept: () => void change(module, false),
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <ConfirmDialog />
      <PageHeader
        title="Modules de l’établissement"
        description="Activez uniquement les domaines utilisés. Les modules obligatoires protègent le paramétrage et la traçabilité."
        headingAs="h2"
        compact
      />
      <DataTable
        value={modules}
        dataKey="code"
        emptyMessage="Aucun module disponible"
        stripedRows
        responsiveLayout="scroll"
        size="small"
      >
        <Column field="name" header="Module" />
        <Column field="description" header="Périmètre" />
        <Column
          header="Type"
          body={(module: InstitutionModule) => (
            <Tag
              value={module.is_mandatory ? "Obligatoire" : "Optionnel"}
              severity={module.is_mandatory ? "info" : "secondary"}
            />
          )}
        />
        <Column
          header="État"
          body={(module: InstitutionModule) => (
            <Tag
              value={module.is_enabled ? "Actif" : "Inactif"}
              severity={module.is_enabled ? "success" : "secondary"}
            />
          )}
        />
        <Column
          header="Activation"
          headerClassName="text-right"
          bodyClassName="text-right"
          body={(module: InstitutionModule) => (
            <div className="inline-flex items-center gap-2">
              {changingCode === module.code ? (
                <Button
                  icon="pi pi-spin pi-spinner"
                  text
                  disabled
                  aria-label={`Modification de ${module.name} en cours`}
                />
              ) : (
                <InputSwitch
                  checked={module.is_enabled}
                  disabled={module.is_mandatory}
                  aria-label={`${module.is_enabled ? "Désactiver" : "Activer"} ${module.name}`}
                  onChange={(event) => requestChange(module, event.value)}
                />
              )}
            </div>
          )}
        />
      </DataTable>
    </section>
  );
}
