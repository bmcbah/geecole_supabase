import { useCallback, useEffect, useMemo, useState } from "react";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { TabPanel, TabView } from "primereact/tabview";
import { getMyInstitutions } from "../../institutions/services/institution.service";
import type { Institution } from "../../institutions/types/institution";
import { AcademicYearsPanel } from "../components/AcademicYearsPanel";
import { InstitutionDetailsForm } from "../components/InstitutionDetailsForm";
import { InstitutionSelector } from "../components/InstitutionSelector";

export function SettingsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyInstitutions();
      setInstitutions(data);
      setSelectedId((current) => current || data[0]?.id || "");
    } catch {
      setFailure("Impossible de charger le paramétrage.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const selected = useMemo(
    () => institutions.find((item) => item.id === selectedId),
    [institutions, selectedId],
  );
  const replaceInstitution = (updated: Institution) =>
    setInstitutions((items) =>
      items.map((item) => (item.id === updated.id ? updated : item)),
    );
  if (loading)
    return (
      <div className="content-state">
        <ProgressSpinner />
      </div>
    );
  if (failure) return <Message severity="error" text={failure} />;
  if (!selected)
    return (
      <Message
        severity="warn"
        text="Créez d’abord un établissement depuis la page Établissement."
      />
    );
  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Paramétrage</h1>
          <p>Configurez les règles propres à {selected.name}.</p>
        </div>
        <InstitutionSelector
          institutions={institutions}
          value={selectedId}
          onChange={setSelectedId}
        />
      </div>
      <TabView>
        <TabPanel header="Établissement" leftIcon="pi pi-building mr-2">
          <InstitutionDetailsForm
            institution={selected}
            onUpdated={replaceInstitution}
          />
        </TabPanel>
        <TabPanel header="Années scolaires" leftIcon="pi pi-calendar mr-2">
          <AcademicYearsPanel institutionId={selected.id} />
        </TabPanel>
      </TabView>
    </section>
  );
}
