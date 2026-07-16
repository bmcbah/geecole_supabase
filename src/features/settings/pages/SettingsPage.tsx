import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { getMyInstitutions } from "../../institutions/services/institution.service";
import type { Institution } from "../../institutions/types/institution";
import { AcademicYearsPanel } from "../components/AcademicYearsPanel";
import { InstitutionDetailsForm } from "../components/InstitutionDetailsForm";
import { InstitutionSelector } from "../components/InstitutionSelector";
import { SettingsSidebar } from "../components/SettingsSidebar";

export function SettingsPage() {
  const { section } = useParams<{ section?: string }>();
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
  if (!section) return <Navigate to="/parametrage/etablissement" replace />;
  if (section !== "etablissement" && section !== "annees-scolaires")
    return <Navigate to="/parametrage/etablissement" replace />;
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
      <div className="settings-layout">
        <SettingsSidebar />
        <div className="settings-content">
          {section === "etablissement" ? (
            <InstitutionDetailsForm
              institution={selected}
              onUpdated={replaceInstitution}
            />
          ) : (
            <AcademicYearsPanel institutionId={selected.id} />
          )}
        </div>
      </div>
    </section>
  );
}
