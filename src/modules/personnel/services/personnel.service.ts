import { supabase } from "../../../shared/lib/supabase/client";
import type { Employee, LeaveRequest, PayrollEntry, PayrollPeriod, WorkEntry } from "../domain/personnel";
export type CatalogItem = { id: string; category: string; code: string; default_label: string; local_label: string | null; is_system: boolean; is_active: boolean; display_order: number };

const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

export async function listEmployees(institutionId: string): Promise<Employee[]> {
  const { data, error } = await supabase.from("employees" as never).select("*").eq("institution_id", institutionId).order("last_name"); fail(error); return (data ?? []) as Employee[];
}
export async function createEmployee(input: Omit<Employee, "id" | "membership_id">) {
  const { error } = await supabase.from("employees" as never).insert(input as never); fail(error);
}
export async function listWorkEntries(institutionId: string): Promise<WorkEntry[]> {
  const { data, error } = await supabase.from("work_entries" as never).select("*, employee:employees(first_name,last_name,employee_number)").eq("institution_id", institutionId).order("work_date", { ascending: false }); fail(error); return (data ?? []) as WorkEntry[];
}
export async function setWorkEntryStatus(id: string, status: WorkEntry["status"]) {
  const payload = status === "validated" ? { status, validated_at: new Date().toISOString() } : { status };
  const { error } = await supabase.from("work_entries" as never).update(payload as never).eq("id", id); fail(error);
}
export async function listLeaveRequests(institutionId: string): Promise<LeaveRequest[]> {
  const { data, error } = await supabase.from("leave_requests" as never).select("*, employee:employees(first_name,last_name,employee_number)").eq("institution_id", institutionId).order("starts_on", { ascending: false }); fail(error); return (data ?? []) as LeaveRequest[];
}
export async function setLeaveStatus(id: string, status: LeaveRequest["status"]) {
  const { error } = await supabase.from("leave_requests" as never).update({ status } as never).eq("id", id); fail(error);
}
export async function listPayrollPeriods(institutionId: string): Promise<PayrollPeriod[]> {
  const { data, error } = await supabase.from("payroll_periods" as never).select("*").eq("institution_id", institutionId).order("starts_on", { ascending: false }); fail(error); return (data ?? []) as PayrollPeriod[];
}
export async function listPayrollEntries(periodId: string): Promise<PayrollEntry[]> {
  const { data, error } = await supabase.from("payroll_entries" as never).select("*, employee:employees(first_name,last_name,employee_number)").eq("period_id", periodId).order("created_at"); fail(error); return (data ?? []) as PayrollEntry[];
}
export async function calculatePayroll(periodId: string) { const { error } = await supabase.rpc("calculate_payroll_period" as never, { target_period_id: periodId } as never); fail(error); }
export async function transitionPayroll(periodId: string, status: "validated" | "closed") { const { error } = await supabase.rpc("transition_payroll_period" as never, { target_period_id: periodId, new_status: status } as never); fail(error); }
export async function listPersonnelCatalog(institutionId: string): Promise<CatalogItem[]> {
  const { data, error } = await supabase.from("personnel_catalog_items" as never).select("*").eq("institution_id", institutionId).order("category").order("display_order"); fail(error); return (data ?? []) as CatalogItem[];
}
export async function updatePersonnelCatalogItem(id: string, changes: Pick<CatalogItem, "is_active" | "local_label">) {
  const { error } = await supabase.from("personnel_catalog_items" as never).update(changes as never).eq("id", id); fail(error);
}
