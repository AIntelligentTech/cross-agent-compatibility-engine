/**
 * Zod schemas for validation of ComponentSpec and related types
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

export const AgentIdSchema = z.enum(['claude', 'windsurf', 'cursor', 'opencode', 'aider', 'continue']);

export const SemanticVersionSchema = z.object({
  major: z.number().int().min(0),
  minor: z.number().int().min(0),
  patch: z.number().int().min(0),
  prerelease: z.string().optional(),
});

export const ComponentTypeSchema = z.enum([
  'skill',
  'workflow',
  'command',
  'rule',
  'hook',
  'memory',
  'agent',
  'config',
]);

// ============================================================================
// Activation Model
// ============================================================================

export const ActivationModeSchema = z.enum(['manual', 'suggested', 'auto', 'contextual', 'hooked']);
export const SafetyLevelSchema = z.enum(['safe', 'sensitive', 'dangerous']);

export const TriggerSpecSchema = z.object({
  type: z.enum(['glob', 'keyword', 'context', 'hook']),
  pattern: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  hookName: z.string().optional(),
});

export const ActivationModelSchema = z.object({
  mode: ActivationModeSchema,
  triggers: z.array(TriggerSpecSchema).optional(),
  safetyLevel: SafetyLevelSchema,
  requiresConfirmation: z.boolean().optional(),
});

// ============================================================================
// Invocation Model
// ============================================================================

export const ArgumentSpecSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  defaultValue: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'file', 'directory']).optional(),
});

export const InvocationModelSchema = z.object({
  slashCommand: z.string().optional(),
  argumentHint: z.string().optional(),
  arguments: z.array(ArgumentSpecSchema).optional(),
  userInvocable: z.boolean(),
});

// ============================================================================
// Execution Model
// ============================================================================

export const ExecutionContextSchema = z.enum(['main', 'fork', 'isolated']);

export const ExecutionModelSchema = z.object({
  context: ExecutionContextSchema,
  allowedTools: z.array(z.string()).optional(),
  restrictedTools: z.array(z.string()).optional(),
  preferredModel: z.string().optional(),
  subAgent: z.string().optional(),
});

// ============================================================================
// Capability Set
// ============================================================================

export const CapabilitySetSchema = z.object({
  needsShell: z.boolean(),
  needsFilesystem: z.boolean(),
  needsNetwork: z.boolean(),
  needsGit: z.boolean(),
  needsCodeSearch: z.boolean(),
  needsBrowser: z.boolean(),
  needsMcp: z.array(z.string()).optional(),
  providesAnalysis: z.boolean(),
  providesCodeGeneration: z.boolean(),
  providesRefactoring: z.boolean(),
  providesDocumentation: z.boolean(),
});

// ============================================================================
// Semantic Intent
// ============================================================================

export const SemanticIntentSchema = z.object({
  summary: z.string(),
  purpose: z.string(),
  whenToUse: z.string().optional(),
  category: z.array(z.string()).optional(),
});

// ============================================================================
// Metadata
// ============================================================================

export const ComponentMetadataSchema = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sourceFile: z.string().optional(),
  originalFormat: z.string().optional(),
});

// ============================================================================
// Agent Descriptor
// ============================================================================

export const AgentDescriptorSchema = z.object({
  id: AgentIdSchema,
  version: SemanticVersionSchema.optional(),
  detectedAt: z.string().optional(),
});

// ============================================================================
// Agent Override
// ============================================================================

export const AgentOverrideSchema = z.object({
  agentId: AgentIdSchema,
  frontmatterOverrides: z.record(z.unknown()).optional(),
  bodyPrefix: z.string().optional(),
  bodySuffix: z.string().optional(),
  capabilityOverrides: CapabilitySetSchema.partial().optional(),
});

// ============================================================================
// ComponentSpec - The Main Schema
// ============================================================================

export const ComponentSpecSchema = z.object({
  id: z.string().min(1),
  version: SemanticVersionSchema,
  sourceAgent: AgentDescriptorSchema.optional(),
  componentType: ComponentTypeSchema,
  category: z.array(z.string()).optional(),
  intent: SemanticIntentSchema,
  activation: ActivationModelSchema,
  invocation: InvocationModelSchema,
  execution: ExecutionModelSchema,
  body: z.string(),
  arguments: z.array(ArgumentSpecSchema).optional(),
  capabilities: CapabilitySetSchema,
  agentOverrides: z.record(AgentIdSchema, AgentOverrideSchema).optional(),
  metadata: ComponentMetadataSchema,
});

// ============================================================================
// Conversion Report Schemas
// ============================================================================

export const LossCategorySchema = z.enum(['activation', 'execution', 'capability', 'metadata', 'content']);
export const LossSeveritySchema = z.enum(['info', 'warning', 'critical']);

export const ConversionLossSchema = z.object({
  category: LossCategorySchema,
  severity: LossSeveritySchema,
  description: z.string(),
  sourceField: z.string(),
  recommendation: z.string().optional(),
});

export const ConversionWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

export const ConversionReportSchema = z.object({
  source: z.object({
    agent: AgentIdSchema,
    componentType: ComponentTypeSchema,
    id: z.string(),
  }),
  target: z.object({
    agent: AgentIdSchema,
    componentType: ComponentTypeSchema,
    id: z.string(),
  }),
  preservedSemantics: z.array(z.string()),
  losses: z.array(ConversionLossSchema),
  warnings: z.array(ConversionWarningSchema),
  suggestions: z.array(z.string()),
  fidelityScore: z.number().min(0).max(100),
  convertedAt: z.string(),
  durationMs: z.number(),
});

// ============================================================================
// Validation Helper
// ============================================================================

export function validateComponentSpec(data: unknown): { valid: boolean; errors: string[] } {
  const result = ComponentSpecSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`),
  };
}
