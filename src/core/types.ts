/**
 * Core types for the Cross-Agent Compatibility Engine
 * Defines the Canonical Intermediate Representation (IR)
 */

// ============================================================================
// Agent Identifiers
// ============================================================================

export type AgentId = 'claude' | 'windsurf' | 'cursor' | 'gemini' | 'universal' | 'opencode' | 'aider' | 'continue';

export interface AgentDescriptor {
  id: AgentId;
  version?: SemanticVersion;
  detectedAt?: string;
}

// ============================================================================
// Semantic Versioning
// ============================================================================

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export function parseVersion(version: string): SemanticVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    return { major: 1, minor: 0, patch: 0 };
  }
  return {
    major: parseInt(match[1] ?? '1', 10),
    minor: parseInt(match[2] ?? '0', 10),
    patch: parseInt(match[3] ?? '0', 10),
    prerelease: match[4],
  };
}

export function formatVersion(version: SemanticVersion): string {
  const base = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease ? `${base}-${version.prerelease}` : base;
}

// ============================================================================
// Component Types
// ============================================================================

export type ComponentType =
  | 'skill'      // Claude Code skill
  | 'workflow'   // Windsurf workflow
  | 'command'    // Cursor command
  | 'rule'       // Windsurf rule / behavioral guideline
  | 'hook'       // Lifecycle hook (Claude)
  | 'memory'     // Persistent memory/context
  | 'agent'      // Sub-agent definition
  | 'config';    // Configuration fragment

// ============================================================================
// Activation Model
// ============================================================================

export type ActivationMode = 'manual' | 'suggested' | 'auto' | 'contextual' | 'hooked';
export type SafetyLevel = 'safe' | 'sensitive' | 'dangerous';

export interface TriggerSpec {
  type: 'glob' | 'keyword' | 'context' | 'hook';
  pattern?: string;
  keywords?: string[];
  hookName?: string;
}

export interface ActivationModel {
  mode: ActivationMode;
  triggers?: TriggerSpec[];
  safetyLevel: SafetyLevel;
  requiresConfirmation?: boolean;
}

// ============================================================================
// Invocation Model
// ============================================================================

export interface ArgumentSpec {
  name: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  type?: 'string' | 'number' | 'boolean' | 'file' | 'directory';
}

export interface InvocationModel {
  slashCommand?: string;
  argumentHint?: string;
  arguments?: ArgumentSpec[];
  userInvocable: boolean;
}

// ============================================================================
// Execution Model
// ============================================================================

export type ExecutionContext = 'main' | 'fork' | 'isolated';

export interface ExecutionModel {
  context: ExecutionContext;
  allowedTools?: string[];
  restrictedTools?: string[];
  preferredModel?: string;
  subAgent?: string;
}

// ============================================================================
// Capability Set
// ============================================================================

export interface CapabilitySet {
  // What the component needs
  needsShell: boolean;
  needsFilesystem: boolean;
  needsNetwork: boolean;
  needsGit: boolean;
  needsCodeSearch: boolean;
  needsBrowser: boolean;
  needsMcp?: string[];

  // What the component provides
  providesAnalysis: boolean;
  providesCodeGeneration: boolean;
  providesRefactoring: boolean;
  providesDocumentation: boolean;
}

export function createDefaultCapabilities(): CapabilitySet {
  return {
    needsShell: false,
    needsFilesystem: true,
    needsNetwork: false,
    needsGit: false,
    needsCodeSearch: true,
    needsBrowser: false,
    providesAnalysis: false,
    providesCodeGeneration: false,
    providesRefactoring: false,
    providesDocumentation: false,
  };
}

// ============================================================================
// Semantic Intent
// ============================================================================

export interface SemanticIntent {
  summary: string;
  purpose: string;
  whenToUse?: string;
  category?: string[];
}

// ============================================================================
// Metadata
// ============================================================================

export interface ComponentMetadata {
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  license?: string;
  tags?: string[];
  sourceFile?: string;
  originalFormat?: string;
}

// ============================================================================
// Agent-Specific Overrides
// ============================================================================

export interface AgentOverride {
  agentId: AgentId;
  frontmatterOverrides?: Record<string, unknown>;
  bodyPrefix?: string;
  bodySuffix?: string;
  capabilityOverrides?: Partial<CapabilitySet>;
}

// ============================================================================
// ComponentSpec - The Canonical IR
// ============================================================================

export interface ComponentSpec {
  // Identity
  id: string;
  version: SemanticVersion;
  sourceAgent?: AgentDescriptor;

  // Classification
  componentType: ComponentType;
  category?: string[];

  // Semantic Intent
  intent: SemanticIntent;

  // Behavioral Model
  activation: ActivationModel;
  invocation: InvocationModel;
  execution: ExecutionModel;

  // Content
  body: string;
  arguments?: ArgumentSpec[];

  // Capabilities & Requirements
  capabilities: CapabilitySet;

  // Agent-Specific Overrides
  agentOverrides?: Record<AgentId, AgentOverride>;

  // Metadata
  metadata: ComponentMetadata;
}

// ============================================================================
// Conversion Report
// ============================================================================

export type LossCategory = 'activation' | 'execution' | 'capability' | 'metadata' | 'content';
export type LossSeverity = 'info' | 'warning' | 'critical';

export interface ConversionLoss {
  category: LossCategory;
  severity: LossSeverity;
  description: string;
  sourceField: string;
  recommendation?: string;
}

export interface ConversionWarning {
  code: string;
  message: string;
  field?: string;
}

export interface ConversionReport {
  source: {
    agent: AgentId;
    componentType: ComponentType;
    id: string;
  };
  target: {
    agent: AgentId;
    componentType: ComponentType;
    id: string;
  };

  // What was preserved
  preservedSemantics: string[];

  // What was lost or degraded
  losses: ConversionLoss[];

  // Warnings about potential behavioral differences
  warnings: ConversionWarning[];

  // Suggestions for manual review
  suggestions: string[];

  // Overall fidelity score (0-100)
  fidelityScore: number;

  // Timing
  convertedAt: string;
  durationMs: number;
}

// ============================================================================
// Mapping Strategies
// ============================================================================

export type MappingStrategy =
  | { type: 'direct'; targetField: string }
  | { type: 'transform'; transformer: string; description: string }
  | { type: 'fallback'; fallbackValue: unknown; warning: string }
  | { type: 'unsupported'; lossDescription: string };

export interface CapabilityMapping {
  sourceAgent: AgentId;
  targetAgent: AgentId;
  sourceField: string;
  strategy: MappingStrategy;
}

// ============================================================================
// Parse Result
// ============================================================================

export interface ParseResult {
  success: boolean;
  spec?: ComponentSpec;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Render Result
// ============================================================================

export interface RenderResult {
  success: boolean;
  content?: string;
  filename?: string;
  errors: string[];
  report?: ConversionReport;
}

// ============================================================================
// Memory/Context File Types (Extended)
// ============================================================================

export type ScopeLevel = 'system' | 'user' | 'project' | 'local';

export interface ImportSpec {
  path: string;
  type: 'file' | 'url' | 'package';
  resolved?: string;
  optional?: boolean;
}

export interface RuleActivation {
  globs?: string[];
  paths?: string[];
  alwaysApply: boolean;
  agentDecided: boolean;
  description?: string;
  scope: ScopeLevel;
}

export type HookEvent =
  | 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SubagentStop'
  | 'SessionStart' | 'SessionEnd' | 'UserPromptSubmit'
  | 'Notification' | 'PreCompact' | 'Setup' | 'PermissionRequest'
  | 'pre_read_code' | 'post_read_code'
  | 'pre_write_code' | 'post_write_code'
  | 'pre_run_command' | 'post_run_command'
  | 'pre_mcp_tool_use' | 'post_mcp_tool_use'
  | 'pre_user_prompt' | 'post_cascade_response'
  | 'post_setup_worktree';

export interface HookSpec {
  event: HookEvent;
  matcher?: string;
  command: string;
  timeout?: number;
  workingDirectory?: string;
}

export interface MemorySpec {
  imports?: ImportSpec[];
  scope: ScopeLevel;
  hierarchical: boolean;
  sections?: MemorySection[];
}

export interface MemorySection {
  title: string;
  content: string;
  level: number;
}

// Extended ComponentSpec fields (optional, for memory/rule/hook types)
export interface ExtendedComponentFields {
  memorySpec?: MemorySpec;
  ruleActivation?: RuleActivation;
  hooks?: HookSpec[];
}
