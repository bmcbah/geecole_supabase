import { createClient } from "@supabase/supabase-js";

export default async function globalSetup() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!url || !serviceKey || !email || !password)
    throw new Error(
      "Configuration E2E complète obligatoire; aucun test authentifié ne sera ignoré en CI.",
    );
  if (process.env.CI && !/^https?:\/\/(127\.0\.0\.1|localhost):/.test(url))
    throw new Error(
      "La CI E2E refuse de créer ses données hors du Supabase local.",
    );

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: created, error: userError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Administrateur Recette" },
    });
  if (userError || !created.user)
    throw userError ?? new Error("Utilisateur E2E non créé");

  const { data: institution, error: institutionError } = await supabase
    .from("institutions")
    .insert({
      name: "École Recette E2E",
      slug: `ecole-recette-${created.user.id.slice(0, 8)}`,
    })
    .select("id")
    .single();
  if (institutionError) throw institutionError;
  const { error: membershipError } = await supabase.from("memberships").insert({
    institution_id: institution.id,
    user_id: created.user.id,
    role: "owner",
    status: "active",
  });
  if (membershipError) throw membershipError;
  const { error: yearError } = await supabase.from("academic_years").insert({
    institution_id: institution.id,
    name: "2026-2027",
    starts_on: "2026-09-01",
    ends_on: "2027-06-30",
    status: "preparation",
  });
  if (yearError) throw yearError;
}
