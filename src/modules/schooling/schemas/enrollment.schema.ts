import { z } from "zod";

export const enrollmentSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est obligatoire").max(80),
  lastName: z.string().trim().min(1, "Le nom est obligatoire").max(80),
  gender: z.enum(["female", "male", "other"]),
  birthDate: z.string(),
  birthPlace: z.string().trim().max(120),
  address: z.string().trim().max(250),
  guardianFirstName: z
    .string()
    .trim()
    .min(1, "Le prénom du responsable est obligatoire"),
  guardianLastName: z
    .string()
    .trim()
    .min(1, "Le nom du responsable est obligatoire"),
  guardianPhone: z.string().trim().min(8, "Le téléphone est obligatoire"),
  guardianRelationship: z.string().trim().min(1),
  annualLevelId: z.string().uuid("Sélectionnez un niveau"),
  kind: z.enum(["pre_registered", "confirmed"]),
});
