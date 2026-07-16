import { createContext, useContext } from "react";
import type { Institution } from "../../institutions/types/institution";
import type { AcademicYear } from "../../settings/types/settings";

export interface AcademicSessionValue {
  institutions: Institution[];
  institution: Institution | null;
  institutionId: string;
  years: AcademicYear[];
  year: AcademicYear | null;
  yearId: string;
  loading: boolean;
  failure: string;
  canChangeYear: boolean;
  setInstitutionId: (id: string) => void;
  setYearId: (id: string) => void;
  refresh: () => Promise<void>;
}

export const AcademicSessionContext =
  createContext<AcademicSessionValue | null>(null);

export function useAcademicSession() {
  const value = useContext(AcademicSessionContext);
  if (!value)
    throw new Error("useAcademicSession doit être utilisé dans son provider");
  return value;
}
