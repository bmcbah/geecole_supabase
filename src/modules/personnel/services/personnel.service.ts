import { supabase } from "../../../shared/lib/supabase/client";
import type {
  CompensationMode,
  Employee,
  EmployeeProfile,
  LeaveRequest,
  PayrollEntry,
  PayrollPeriod,
  WorkEntry,
} from "../domain/personnel";
export type CatalogItem = {
  id: string;
  category: string;
  code: string;
  default_label: string;
  local_label: string | null;
  is_system: boolean;
  is_active: boolean;
  display_order: number;
};

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export async function listEmployees(
  institutionId: string,
): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees" as never)
    .select("*")
    .eq("institution_id", institutionId)
    .order("last_name");
  fail(error);
  return (data ?? []) as Employee[];
}
export type CreateEmployeeInput = Partial<
  Omit<
    Employee,
    | "id"
    | "institution_id"
    | "employee_number"
    | "membership_id"
    | "status"
    | "exited_on"
    | "exit_reason"
  >
> & {
  institution_id: string;
  first_name: string;
  last_name: string;
  hired_on: string;
  function_item_id?: string;
  responsibility?: string;
  contract_type_item_id?: string;
  compensation_mode?: CompensationMode;
  fixed_amount?: number;
  hourly_rate?: number;
  session_rate?: number;
};
export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<Employee> {
  const {
    function_item_id,
    responsibility,
    contract_type_item_id,
    compensation_mode,
    fixed_amount,
    hourly_rate,
    session_rate,
    ...employee
  } = input;
  const { data, error } = await supabase
    .from("employees" as never)
    .insert({ ...employee, status: "active" } as never)
    .select("*")
    .single();
  fail(error);
  if (!data) throw new Error("employee_creation_failed");
  const created = data as Employee;
  try {
    if (function_item_id) {
      const { error: functionError } = await supabase
        .from("employee_functions" as never)
        .insert({
          institution_id: input.institution_id,
          employee_id: created.id,
          function_item_id,
          is_primary: true,
          responsibility: responsibility || null,
          starts_on: input.hired_on,
          is_active: true,
        } as never);
      fail(functionError);
    }
    if (compensation_mode) {
      const { error: contractError } = await supabase
        .from("employee_contracts" as never)
        .insert({
          institution_id: input.institution_id,
          employee_id: created.id,
          contract_type_item_id: contract_type_item_id || null,
          starts_on: input.hired_on,
          status: "active",
          compensation_mode,
          fixed_amount: fixed_amount ?? 0,
          hourly_rate: hourly_rate ?? 0,
          session_rate: session_rate ?? 0,
        } as never);
      fail(contractError);
    }
  } catch (setupError) {
    await supabase
      .from("employees" as never)
      .delete()
      .eq("id", created.id);
    throw setupError;
  }
  return created;
}
export async function getEmployeeProfile(
  institutionId: string,
  employeeId: string,
): Promise<EmployeeProfile | null> {
  const { data, error } = await supabase
    .from("employees" as never)
    .select(
      "*, functions:employee_functions(*,function_item:personnel_catalog_items(default_label,local_label)), contracts:employee_contracts(*,contract_type:personnel_catalog_items(default_label,local_label)), leave_requests(*), work_entries(*), sanctions:employee_sanctions(*), advances:salary_advances(*)",
    )
    .eq("institution_id", institutionId)
    .eq("id", employeeId)
    .maybeSingle();
  fail(error);
  return data as EmployeeProfile | null;
}
export async function updateEmployee(
  employeeId: string,
  changes: Partial<Employee>,
) {
  const { error } = await supabase
    .from("employees" as never)
    .update(changes as never)
    .eq("id", employeeId);
  fail(error);
}
export async function listWorkEntries(
  institutionId: string,
): Promise<WorkEntry[]> {
  const { data, error } = await supabase
    .from("work_entries" as never)
    .select("*, employee:employees(first_name,last_name,employee_number)")
    .eq("institution_id", institutionId)
    .order("work_date", { ascending: false });
  fail(error);
  return (data ?? []) as WorkEntry[];
}
export async function setWorkEntryStatus(
  id: string,
  status: WorkEntry["status"],
) {
  const payload =
    status === "validated"
      ? { status, validated_at: new Date().toISOString() }
      : { status };
  const { error } = await supabase
    .from("work_entries" as never)
    .update(payload as never)
    .eq("id", id);
  fail(error);
}
export async function createWorkEntry(input: {
  institution_id: string;
  employee_id: string;
  work_type_item_id?: string;
  work_date: string;
  minutes: number;
  quantity?: number;
  rate?: number;
  status: WorkEntry["status"];
  notes?: string;
}) {
  const { error } = await supabase.from("work_entries" as never).insert({
    ...input,
    work_type_item_id: input.work_type_item_id || null,
    quantity: input.quantity ?? 1,
    rate: input.rate ?? null,
    notes: input.notes || null,
  } as never);
  fail(error);
}
export async function listLeaveRequests(
  institutionId: string,
): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from("leave_requests" as never)
    .select("*, employee:employees(first_name,last_name,employee_number)")
    .eq("institution_id", institutionId)
    .order("starts_on", { ascending: false });
  fail(error);
  return (data ?? []) as LeaveRequest[];
}
export async function setLeaveStatus(
  id: string,
  status: LeaveRequest["status"],
) {
  const { error } = await supabase
    .from("leave_requests" as never)
    .update({ status } as never)
    .eq("id", id);
  fail(error);
}
export async function createLeaveRequest(input: {
  institution_id: string;
  employee_id: string;
  leave_type_item_id?: string;
  starts_on: string;
  ends_on: string;
  reason?: string;
  status: LeaveRequest["status"];
}) {
  const { error } = await supabase.from("leave_requests" as never).insert({
    ...input,
    leave_type_item_id: input.leave_type_item_id || null,
    reason: input.reason || null,
  } as never);
  fail(error);
}
export async function listPayrollPeriods(
  institutionId: string,
): Promise<PayrollPeriod[]> {
  const { data, error } = await supabase
    .from("payroll_periods" as never)
    .select("*")
    .eq("institution_id", institutionId)
    .order("starts_on", { ascending: false });
  fail(error);
  return (data ?? []) as PayrollPeriod[];
}
export async function listPayrollEntries(
  periodId: string,
): Promise<PayrollEntry[]> {
  const { data, error } = await supabase
    .from("payroll_entries" as never)
    .select("*, employee:employees(first_name,last_name,employee_number)")
    .eq("period_id", periodId)
    .order("created_at");
  fail(error);
  return (data ?? []) as PayrollEntry[];
}
export async function createPayrollPeriod(input: {
  institution_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
}) {
  const { data, error } = await supabase
    .from("payroll_periods" as never)
    .insert({ ...input, status: "draft" } as never)
    .select("*")
    .single();
  fail(error);
  return data as PayrollPeriod;
}
export async function calculatePayroll(periodId: string) {
  const { error } = await supabase.rpc(
    "calculate_payroll_period" as never,
    { target_period_id: periodId } as never,
  );
  fail(error);
}
export async function transitionPayroll(
  periodId: string,
  status: "validated" | "closed",
) {
  const { error } = await supabase.rpc(
    "transition_payroll_period" as never,
    { target_period_id: periodId, new_status: status } as never,
  );
  fail(error);
}
export async function listPersonnelCatalog(
  institutionId: string,
): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from("personnel_catalog_items" as never)
    .select("*")
    .eq("institution_id", institutionId)
    .order("category")
    .order("display_order");
  fail(error);
  return (data ?? []) as CatalogItem[];
}
export async function updatePersonnelCatalogItem(
  id: string,
  changes: Pick<CatalogItem, "is_active" | "local_label">,
) {
  const { error } = await supabase
    .from("personnel_catalog_items" as never)
    .update(changes as never)
    .eq("id", id);
  fail(error);
}
export async function createPersonnelCatalogItem(input: {
  institution_id: string;
  category: string;
  code: string;
  default_label: string;
}) {
  const { error } = await supabase
    .from("personnel_catalog_items" as never)
    .insert({
      ...input,
      code: input.code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_"),
      is_system: false,
      is_active: true,
    } as never);
  fail(error);
}
