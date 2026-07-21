import { useCallback, useEffect, useState } from "react";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  listOperationsContext,
  listOperationsPage,
  type AppreciationItem,
  type AverageControlItem,
  type OperationsMode,
  type PostponedResultItem,
} from "../services/notes-operations.service";

export type NotesOperationRow =
  PostponedResultItem | AppreciationItem | AverageControlItem;

export function useNotesOperationsPage(mode: OperationsMode) {
  const session = useAcademicSession();
  const [items, setItems] = useState<NotesOperationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [first, setFirst] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [state, setState] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!session.yearId) return;
    setLoading(true);
    setError("");
    try {
      const [page, context] = await Promise.all([
        listOperationsPage(session.institutionId, session.yearId, mode, {
          first,
          rows: pageSize,
          search: query,
          classId,
          periodId,
          state,
        }),
        listOperationsContext(session.institutionId, session.yearId),
      ]);
      setItems(page.rows);
      setTotal(page.total);
      setClasses(context.classes);
      setPeriods(context.periods);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger les données pédagogiques.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    classId,
    first,
    mode,
    pageSize,
    periodId,
    query,
    session.institutionId,
    session.yearId,
    state,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const reset = () => {
    setQuery("");
    setClassId("");
    setPeriodId("");
    setState("");
    setFirst(0);
  };

  return {
    ...session,
    items,
    total,
    first,
    setFirst,
    pageSize,
    setPageSize,
    query,
    setQuery,
    classId,
    setClassId,
    periodId,
    setPeriodId,
    state,
    setState,
    advanced,
    setAdvanced,
    classes,
    periods,
    loading,
    error,
    setError,
    load,
    reset,
  };
}
