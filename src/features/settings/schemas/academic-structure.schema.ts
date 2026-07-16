import { z } from "zod";

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]+$/, "Majuscules, chiffres, tirets ou underscore");
export const structureItemSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").max(80),
  code: code.min(1).max(20),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
  periodSystem: z.enum(["term", "semester", "custom"]).optional(),
  periodCount: z.number().int().min(1).max(6).optional(),
  subjectsPeriodScope: z.enum(["all", "selectable"]).optional(),
  gradingScale: z.number().positive().optional(),
  passAverage: z.number().min(0).optional(),
  rankingEnabled: z.boolean().optional(),
  absencesOnReport: z.boolean().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  repeatAllowed: z.boolean().optional(),
});
export type StructureItemInput = z.infer<typeof structureItemSchema>;
