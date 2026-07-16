import { z } from "zod";

const schema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});
const result = schema.safeParse(import.meta.env);
if (!result.success)
  throw new Error(
    "Configuration Supabase invalide. Copiez .env.example vers .env.local et renseignez les valeurs de `supabase status`.",
  );
export const env = result.data;
