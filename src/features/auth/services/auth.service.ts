import { supabase } from "../../../shared/lib/supabase/client";
export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
export async function signUp(
  email: string,
  password: string,
  fullName: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}
export async function acceptPendingInvitation() {
  const token = localStorage.getItem("geecole.invitation");
  if (!token) return;
  const { error } = await supabase.rpc("accept_person_invitation", {
    raw_token: token,
  });
  if (error) throw error;
  localStorage.removeItem("geecole.invitation");
}
