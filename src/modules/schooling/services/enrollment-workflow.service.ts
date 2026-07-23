import { supabase } from "../../../shared/lib/supabase/client";

export type EnrollmentValidationSeverity =
  | "blocking"
  | "warning"
  | "information"
  | "success";

export type EnrollmentValidationResult = {
  id: string;
  enrollment_id: string;
  code: string;
  severity: EnrollmentValidationSeverity;
  domain: string;
  message_key: string;
  details: Record<string, unknown>;
  resolution_action: string | null;
};

export type DocumentRequirement = {
  id: string;
  name: string;
  code: string;
  required_for_pre_registration: boolean;
  required_for_confirmation: boolean;
};

type RpcResponse = Promise<{
  data: unknown;
  error: { message: string } | null;
}>;

type WorkflowRpc = (
  name: string,
  args: Record<string, unknown>,
) => RpcResponse;

const workflowRpc = supabase.rpc.bind(supabase) as unknown as WorkflowRpc;

export async function listEnrollmentDocumentRequirements(institutionId: string) {
  const { data, error } = await supabase
    .from("document_requirements")
    .select("id,name,code,required_for_pre_registration,required_for_confirmation")
    .eq("institution_id", institutionId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data as DocumentRequirement[];
}

export async function saveEnrollmentDocuments(
  institutionId: string,
  studentId: string,
  enrollmentId: string,
  providedRequirementIds: string[],
  requirements: DocumentRequirement[],
) {
  const rows = requirements.map((requirement) => ({
    institution_id: institutionId,
    student_id: studentId,
    enrollment_id: enrollmentId,
    requirement_id: requirement.id,
    status: providedRequirementIds.includes(requirement.id) ? "provided" : "missing",
    received_on: providedRequirementIds.includes(requirement.id)
      ? new Date().toISOString().slice(0, 10)
      : null,
  }));

  if (!rows.length) return;
  const { error } = await supabase
    .from("student_documents")
    .upsert(rows, { onConflict: "student_id,enrollment_id,requirement_id" });
  if (error) throw error;
}

export async function getEnrollmentStudentId(enrollmentId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("id", enrollmentId)
    .single();
  if (error) throw error;
  return data.student_id;
}

export async function evaluateEnrollment(enrollmentId: string) {
  const { error } = await workflowRpc("evaluate_enrollment", {
    target_enrollment_id: enrollmentId,
  });
  if (error) throw new Error(error.message);

  const { data, error: resultError } = await supabase
    .from("enrollment_validation_results" as never)
    .select(
      "id,enrollment_id,code,severity,domain,message_key,details,resolution_action",
    )
    .eq("enrollment_id", enrollmentId)
    .is("resolved_at", null)
    .order("severity");
  if (resultError) throw resultError;
  return data as unknown as EnrollmentValidationResult[];
}

export async function submitEnrollment(enrollmentId: string) {
  const { error } = await workflowRpc("submit_enrollment", {
    target_enrollment_id: enrollmentId,
  });
  if (error) throw new Error(error.message);
}

export async function confirmEnrollment(enrollmentId: string) {
  const { error } = await workflowRpc("confirm_enrollment", {
    target_enrollment_id: enrollmentId,
  });
  if (error) throw new Error(error.message);
}

export function hasBlockingValidation(results: EnrollmentValidationResult[]) {
  return results.some((result) => result.severity === "blocking");
}
