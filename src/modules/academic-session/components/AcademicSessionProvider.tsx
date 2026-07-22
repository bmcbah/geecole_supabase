import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/components/auth-context";
import {
  getMyAuthorizationSummary,
  getMyInstitutions,
} from "../../institutions/services/institution.service";
import type { AuthorizationSummary } from "../../institutions/services/institution.service";
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
  const [canChangeYear, setCanChangeYear] = useState(true);
  const [authorization, setAuthorization] =
    useState<AuthorizationSummary | null>(null);

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
    if (!institutionId || !user) {
      setYears([]);
      setYearIdState("");
      setAuthorization(null);
      return;
    }
    localStorage.setItem(institutionKey, institutionId);
    setLoading(true);
    setAuthorization(null);
    void Promise.all([
      listAcademicYears(institutionId),
      getMyAuthorizationSummary(institutionId),
    ])
      .then(([data, authorization]) => {
        setYears(data);
        setAuthorization(authorization);
        const allowed =
          authorization.isOwner ||
          authorization.profiles.some(
            (profile) => !["parent", "student"].includes(profile.code),
          );
        setCanChangeYear(allowed);
        const stored = localStorage.getItem(yearKey(institutionId));
        const defaultYear =
          (allowed ? data.find((item) => item.id === stored) : undefined) ??
          data.find((item) => item.status === "open") ??
          data.find((item) => item.status === "preparation") ??
          data[0];
        setYearIdState(defaultYear?.id ?? "");
      })
      .catch(() => setFailure("Impossible de charger les années scolaires."))
      .finally(() => setLoading(false));
  }, [institutionId, user]);

  const setInstitutionId = (id: string) => setInstitutionIdState(id);
  const setYearId = (id: string) => {
    if (!canChangeYear) return;
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
  const refreshAuthorization = useCallback(async () => {
    if (!institutionId || !user) {
      setAuthorization(null);
      return;
    }
    setAuthorization(await getMyAuthorizationSummary(institutionId));
  }, [institutionId, user]);

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
        canChangeYear,
        authorization,
        enabledModules: authorization?.enabledModules ?? null,
        setInstitutionId,
        setYearId,
        refresh,
        refreshAuthorization,
      }}
    >
      {children}
    </AcademicSessionContext.Provider>
  );
}
