import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/components/auth-context";
import {
  getMyInstitutions,
  getMyMembership,
} from "../../institutions/services/institution.service";
import type { Institution } from "../../institutions/types/institution";
import { listAcademicYears } from "../../settings/services/settings.service";
import type { AcademicYear } from "../../settings/types/settings";
import { AcademicSessionContext } from "./academic-session-context";

const institutionKey = "geecole.institution";
const yearKey = (institutionId: string) => `geecole.year.${institutionId}`;

export function AcademicSessionProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionIdState] = useState("");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [canChangeYear, setCanChangeYear] = useState(true);

  const loadInstitutions = useCallback(async () => {
    if (!userId) {
      setInstitutions([]);
      setInstitutionIdState("");
      setLoading(false);
      return;
    }

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
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    void loadInstitutions().catch(() => {
      if (!cancelled) {
        setFailure("Impossible de charger le contexte de l’établissement.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadInstitutions]);

  useEffect(() => {
    let cancelled = false;

    if (!institutionId || !userId) {
      setYears([]);
      setYearIdState("");
      return () => {
        cancelled = true;
      };
    }

    localStorage.setItem(institutionKey, institutionId);
    setLoading(true);
    setFailure("");

    void Promise.all([
      listAcademicYears(institutionId),
      getMyMembership(institutionId, userId),
    ])
      .then(([data, membership]) => {
        if (cancelled) return;

        setYears(data);
        const allowed = !["parent", "student"].includes(membership.role);
        setCanChangeYear(allowed);
        const stored = localStorage.getItem(yearKey(institutionId));
        const defaultYear =
          (allowed ? data.find((item) => item.id === stored) : undefined) ??
          data.find((item) => item.status === "open") ??
          data.find((item) => item.status === "preparation") ??
          data[0];
        setYearIdState(defaultYear?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setFailure("Impossible de charger les années scolaires.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [institutionId, userId]);

  const setInstitutionId = useCallback(
    (id: string) => setInstitutionIdState((current) => (current === id ? current : id)),
    [],
  );

  const setYearId = useCallback(
    (id: string) => {
      if (!canChangeYear) return;
      setYearIdState((current) => (current === id ? current : id));
      if (institutionId) localStorage.setItem(yearKey(institutionId), id);
    },
    [canChangeYear, institutionId],
  );

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

  const value = useMemo(
    () => ({
      institutions,
      institution,
      institutionId,
      years,
      year,
      yearId,
      loading,
      failure,
      canChangeYear,
      setInstitutionId,
      setYearId,
      refresh,
    }),
    [
      institutions,
      institution,
      institutionId,
      years,
      year,
      yearId,
      loading,
      failure,
      canChangeYear,
      setInstitutionId,
      setYearId,
      refresh,
    ],
  );

  return (
    <AcademicSessionContext.Provider value={value}>
      {children}
    </AcademicSessionContext.Provider>
  );
}
