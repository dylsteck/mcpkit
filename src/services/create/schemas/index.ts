import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Zod schema for discovered actions
export const DiscoveredActionSchema = z.object({
  name: z.string(),
  description: z.string(),
  steps: z.array(z.string()),
  parameters: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["string", "number", "boolean"]),
        description: z.string(),
        required: z.boolean().optional(),
      })
    )
    .optional(),
  extractionSchema: z.record(z.any()).optional(),
});

export const DiscoveredActionsResponseSchema = z.object({
  actions: z.array(DiscoveredActionSchema),
});

export const AuthAnalysisSchema = z.object({
  requiresAuth: z.boolean(),
  loginButton: z.string().optional(), // The action to click to start login flow
  summary: z.string().optional(),
  canAutofill: z.boolean().optional(),
  recommendedStrategy: z
    .enum(["autofill", "manual", "passwordless", "unknown"])
    .optional(),
  steps: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional(),
  mfa: z
    .object({
      required: z.boolean(),
      description: z.string().optional(),
    })
    .optional(),
});

export type DiscoveredAction = z.infer<typeof DiscoveredActionSchema>;
export type AuthAnalysis = z.infer<typeof AuthAnalysisSchema>;

export type StagehandPage = Awaited<
  ReturnType<Stagehand["context"]["awaitActivePage"]>
>;
