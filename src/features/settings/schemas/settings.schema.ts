import { z } from "zod";

export const institutionSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+224)?\d{9}$/, "Numéro guinéen attendu")
    .or(z.literal("")),
  email: z.email("Adresse e-mail invalide").or(z.literal("")),
  address: z.string().trim().max(240),
  currency: z.string().length(3),
  timezone: z.string().min(1),
  locale: z.string().min(2),
});

export const academicYearSchema = z
  .object({
    name: z.string().trim().min(4, "Le libellé est obligatoire").max(30),
    startsOn: z.date("Date de début obligatoire"),
    endsOn: z.date("Date de fin obligatoire"),
  })
  .refine((value) => value.startsOn < value.endsOn, {
    message: "La fin doit être postérieure au début",
    path: ["endsOn"],
  });

export type InstitutionSettingsInput = z.infer<
  typeof institutionSettingsSchema
>;
export type AcademicYearInput = z.infer<typeof academicYearSchema>;
