import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [cycleId, setCycleId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [state, setState] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [classes, setClasses] = useState<
    Array<{ id: string; name: string; academic_year_level_id: string }>
  >([]);
  const [periods, setPeriods] = useState<
    Array<{
      id: string;
      name: string;
      cycle_id: string;
      cycleName: string;
      status: string;
    }>
  >([]);
  const [cycles, setCycles] = useState<Array<{ id: string; name: string }>>([]);
  const [levels, setLevels] = useState<
    Array<{ id: string; cycle_id: string; level_name_snapshot: string }>
  >([]);
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
          cycleId,
          levelId,
          periodId,
          state,
        }),
        listOperationsContext(session.institutionId, session.yearId),
      ]);
      setItems(page.rows);
      setTotal(page.total);
      setClasses(context.classes);
      setPeriods(context.periods);
      setCycles(context.cycles);
      setLevels(context.levels);
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
    cycleId,
    first,
    mode,
    pageSize,
    periodId,
    levelId,
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
    setCycleId("");
    setLevelId("");
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
    cycleId,
    setCycleId: (value: string) => {
      setCycleId(value);
      setLevelId("");
      setClassId("");
      setPeriodId("");
      setFirst(0);
    },
    levelId,
    setLevelId: (value: string) => {
      setLevelId(value);
      setClassId("");
      setFirst(0);
    },
    periodId,
    setPeriodId,
    state,
    setState,
    advanced,
    setAdvanced,
    classes: useMemo(
      () =>
        classes.filter(
          (item) => !levelId || item.academic_year_level_id === levelId,
        ),
      [classes, levelId],
    ),
    periods: useMemo(
      () => periods.filter((item) => !cycleId || item.cycle_id === cycleId),
      [cycleId, periods],
    ),
    cycles,
    levels: useMemo(
      () => levels.filter((level) => !cycleId || level.cycle_id === cycleId),
      [cycleId, levels],
    ),
    loading,
    error,
    setError,
    load,
    reset,
  };
}
