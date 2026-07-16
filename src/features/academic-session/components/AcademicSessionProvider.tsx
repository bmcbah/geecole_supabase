import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/components/auth-context";
import { getMyInstitutions } from "../../institutions/services/institution.service";
import type { Institution } from "../../institutions/types/institution";
import { listAcademicYears } from "../../settings/services/settings.service";
import type { AcademicYear } from "../../settings/types/settings";
import { AcademicSessionContext } from "./academic-session-context";

const institutionKey = "geecole.institution";
const yearKey = (institutionId: string) => `geecole.year.${institutionId}`;

export function AcademicSessionProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionIdState] = useState("");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");

  const loadInstitutions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFailure("");
    try {
      const data = await getMyInstitutions();
      setInstitutions(data);
      const stored = localStorage.getItem(institutionKey);
      setInstitutionIdState(
        data.some((item) => item.id === stored) ? stored! : data[0]?.id || "",
      );
    } catch {
      setFailure("Impossible de charger le contexte de l’établissement.");
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    void loadInstitutions();
  }, [loadInstitutions]);
  useEffect(() => {
    if (!institutionId) {
      setYears([]);
      setYearIdState("");
      return;
    }
    localStorage.setItem(institutionKey, institutionId);
    setLoading(true);
    void listAcademicYears(institutionId)
      .then((data) => {
        setYears(data);
        const stored = localStorage.getItem(yearKey(institutionId));
        const defaultYear =
          data.find((item) => item.id === stored) ??
          data.find((item) => item.status === "open") ??
          data.find((item) => item.status === "preparation") ??
          data[0];
        setYearIdState(defaultYear?.id ?? "");
      })
      .catch(() => setFailure("Impossible de charger les années scolaires."))
      .finally(() => setLoading(false));
  }, [institutionId]);

  const setInstitutionId = (id: string) => setInstitutionIdState(id);
  const setYearId = (id: string) => {
    setYearIdState(id);
    if (institutionId) localStorage.setItem(yearKey(institutionId), id);
  };
  const institution = useMemo(
    () => institutions.find((item) => item.id === institutionId) ?? null,
    [institutionId, institutions],
  );
  const year = useMemo(
    () => years.find((item) => item.id === yearId) ?? null,
    [yearId, years],
  );
  const refresh = useCallback(async () => {
    await loadInstitutions();
  }, [loadInstitutions]);

  return (
    <AcademicSessionContext.Provider
      value={{
        institutions,
        institution,
        institutionId,
        years,
        year,
        yearId,
        loading,
        failure,
        setInstitutionId,
        setYearId,
        refresh,
      }}
    >
      {children}
    </AcademicSessionContext.Provider>
  );
}
