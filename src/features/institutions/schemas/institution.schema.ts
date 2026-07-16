import { z } from "zod";
export const institutionSchema = z.object({
  name: z.string().trim().min(2, "Le nom est obligatoire").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Utilisez des minuscules, chiffres et tirets",
    ),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+224)?\d{9}$/, "Numéro guinéen attendu")
    .or(z.literal("")),
  email: z.email("Adresse e-mail invalide").or(z.literal("")),
  address: z.string().trim().max(240),
});
export type InstitutionInput = z.infer<typeof institutionSchema>;
