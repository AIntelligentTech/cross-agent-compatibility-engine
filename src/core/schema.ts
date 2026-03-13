/**
 * Zod schemas for validation of ComponentSpec and related types
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

export const AgentIdSchema = z.enum([
  'claude',
  'windsurf',
  'cursor',
  'opencode',
  'aider',
  'continue',
  'codex',
  'gemini',
  'universal',
]);

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
  purpose: z.string().optional(),
  detailed: z.string().optional(),
  whenToUse: z.string().optional(),
  category: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
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
  sourcePath: z.string().optional(),
  sourceDirectory: z.string().optional(),
  originalFormat: z.string().optional(),
  rawFrontmatter: z.record(z.unknown()).optional(),
  rawConfig: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  preservedKeys: z.array(z.string()).optional(),
  model: z.string().optional(),
  approvalPolicy: z.string().optional(),
  sandboxMode: z.string().optional(),
  webSearch: z.string().optional(),
  mcpServers: z.record(z.unknown()).optional(),
  allowedTools: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  features: z.record(z.boolean()).optional(),
  subtask: z.boolean().optional(),
  mode: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().int().optional(),
  codeExecution: z.boolean().optional(),
  googleSearch: z.boolean().optional(),
  includeDirectories: z.array(z.string()).optional(),
  instruction: z.string().optional(),
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

export const RuleActivationSchema = z.object({
  globs: z.array(z.string()).optional(),
  paths: z.array(z.string()).optional(),
  alwaysApply: z.boolean(),
  agentDecided: z.boolean(),
  description: z.string().optional(),
  scope: z.enum(['system', 'user', 'project', 'local']),
});

export const HookSpecSchema = z.object({
  event: z.enum([
    'PreToolUse',
    'PostToolUse',
    'Stop',
    'SubagentStop',
    'SessionStart',
    'SessionEnd',
    'UserPromptSubmit',
    'Notification',
    'PreCompact',
    'Setup',
    'PermissionRequest',
    'pre_read_code',
    'post_read_code',
    'pre_write_code',
    'post_write_code',
    'pre_run_command',
    'post_run_command',
    'pre_mcp_tool_use',
    'post_mcp_tool_use',
    'pre_user_prompt',
    'post_cascade_response',
    'post_setup_worktree',
  ]),
  matcher: z.string().optional(),
  command: z.string(),
  timeout: z.number().int().optional(),
  workingDirectory: z.string().optional(),
});

export const ImportSpecSchema = z.object({
  path: z.string(),
  type: z.enum(['file', 'url', 'package']),
  resolved: z.string().optional(),
  optional: z.boolean().optional(),
});

export const MemorySectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  required: z.boolean().optional(),
});

export const MemorySpecSchema = z.object({
  imports: z.array(ImportSpecSchema).optional(),
  scope: z.enum(['system', 'user', 'project', 'local']),
  hierarchical: z.boolean(),
  sections: z.array(MemorySectionSchema).optional(),
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
  ruleActivation: RuleActivationSchema.optional(),
  memorySpec: MemorySpecSchema.optional(),
  hooks: z.array(HookSpecSchema).optional(),
  metadata: ComponentMetadataSchema,
});

// ============================================================================
// Conversion Report Schemas
// ============================================================================

export const LossCategorySchema = z.enum([
  'activation',
  'execution',
  'capability',
  'metadata',
  'content',
  'security',
  'configuration',
  'tools',
]);
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
