# Extended Artifact Support Architecture

## Overview

This document outlines the architecture for extending the Cross-Agent Compatibility Engine to support a wider range of agent artifacts beyond skills/workflows/commands.

---

## 1. Extended Type System

### 1.1 Artifact Categories

```typescript
type ArtifactCategory = 
  | 'component'    // Skills, workflows, commands (existing)
  | 'memory'       // CLAUDE.md, AGENTS.md, GEMINI.md
  | 'rule'         // .claude/rules/, .windsurf/rules/, .cursor/rules/
  | 'hook'         // Lifecycle hooks
  | 'config';      // Agent configuration files
```

### 1.2 Extended AgentId

```typescript
type AgentId = 
  | 'claude'       // Claude Code
  | 'windsurf'     // Windsurf/Cascade
  | 'cursor'       // Cursor
  | 'gemini'       // Gemini CLI
  | 'universal';   // AGENTS.md (cross-agent)
```

### 1.3 Component Types by Agent

```typescript
const COMPONENT_TYPES: Record<AgentId, string[]> = {
  claude: ['skill', 'memory', 'rule', 'hook', 'config'],
  windsurf: ['skill', 'workflow', 'memory', 'rule', 'hook', 'config'],
  cursor: ['command', 'memory', 'rule', 'config'],
  gemini: ['memory', 'config'],
  universal: ['memory'],
};
```

---

## 2. Extended ComponentSpec Schema

### 2.1 Base Spec (Existing + Extensions)

```typescript
interface ComponentSpec {
  // Identity
  id: string;
  version: SemanticVersion;
  sourceAgent: AgentDescriptor;
  componentType: ComponentType;
  category: string[];
  
  // Intent
  intent: SemanticIntent;
  
  // Activation (extended)
  activation: ActivationModel;
  
  // Invocation
  invocation: InvocationModel;
  
  // Execution
  execution: ExecutionModel;
  
  // Content
  body: string;
  
  // Capabilities
  capabilities: CapabilitySet;
  
  // Metadata
  metadata: ComponentMetadata;
  
  // Agent-specific overrides
  agentOverrides?: Record<AgentId, AgentOverride>;
  
  // NEW: Extended fields
  imports?: ImportSpec[];
  rules?: RuleSpec;
  hooks?: HookSpec[];
  scope?: ScopeLevel;
}
```

### 2.2 New: ImportSpec

```typescript
interface ImportSpec {
  path: string;           // @path/to/file
  type: 'file' | 'url' | 'package';
  resolved?: string;      // Resolved content (optional)
  optional?: boolean;
}
```

### 2.3 New: RuleSpec

```typescript
interface RuleSpec {
  // Activation conditions
  globs?: string[];           // File patterns (Windsurf/Cursor style)
  paths?: string[];           // Path patterns (Claude style)
  
  // Behavior
  alwaysApply: boolean;       // Always include in context
  agentDecided: boolean;      // Let agent decide based on description
  
  // Metadata for agent decision
  description?: string;       // Human-readable description
  
  // Scope
  scope: 'project' | 'user' | 'team' | 'system';
}
```

### 2.4 New: HookSpec

```typescript
type HookEvent = 
  // Claude events
  | 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SubagentStop'
  | 'SessionStart' | 'SessionEnd' | 'UserPromptSubmit'
  | 'Notification' | 'PreCompact' | 'Setup' | 'PermissionRequest'
  // Windsurf events
  | 'pre_read_code' | 'post_read_code'
  | 'pre_write_code' | 'post_write_code'
  | 'pre_run_command' | 'post_run_command'
  | 'pre_mcp_tool_use' | 'post_mcp_tool_use'
  | 'pre_user_prompt' | 'post_cascade_response'
  | 'post_setup_worktree';

interface HookSpec {
  event: HookEvent;
  matcher?: string;           // Tool/notification type filter
  command: string;            // Shell command to execute
  timeout?: number;           // Timeout in ms
  workingDirectory?: string;
}
```

### 2.5 New: ScopeLevel

```typescript
type ScopeLevel = 
  | 'system'    // /etc/, /Library/Application Support/
  | 'user'      // ~/.claude/, ~/.windsurf/, etc.
  | 'project'   // .claude/, .windsurf/, .cursor/
  | 'local';    // CLAUDE.local.md (gitignored)
```

---

## 3. Parser Architecture

### 3.1 Parser Interface (Extended)

```typescript
interface AgentParser {
  agentId: AgentId;
  supportedTypes: ComponentType[];
  
  // Detection
  canParse(content: string, context: ParseContext): boolean;
  detectType(content: string, context: ParseContext): ComponentType | null;
  
  // Parsing
  parse(content: string, context: ParseContext): ParseResult;
  
  // NEW: Type-specific parsing
  parseMemory?(content: string, context: ParseContext): ParseResult;
  parseRule?(content: string, context: ParseContext): ParseResult;
  parseHook?(content: string, context: ParseContext): ParseResult;
}
```

### 3.2 New Parsers

| Parser | Artifact Types | File Patterns |
|--------|---------------|---------------|
| `ClaudeMemoryParser` | memory | `CLAUDE.md`, `CLAUDE.local.md` |
| `ClaudeRuleParser` | rule | `.claude/rules/*.md` |
| `ClaudeHookParser` | hook | `.claude/settings.json` (hooks section) |
| `WindsurfMemoryParser` | memory | Auto-memories (JSON export) |
| `WindsurfRuleParser` | rule | `.windsurf/rules/*.md` |
| `WindsurfHookParser` | hook | `.windsurf/hooks.json` |
| `CursorMemoryParser` | memory | `AGENTS.md` |
| `CursorRuleParser` | rule | `.cursor/rules/*.mdc` |
| `GeminiMemoryParser` | memory | `GEMINI.md` |
| `UniversalMemoryParser` | memory | `AGENTS.md` |

### 3.3 Parse Context (Extended)

```typescript
interface ParseContext {
  agentId?: AgentId;
  sourceFile?: string;
  sourcePath?: string;
  
  // NEW: Extended context
  projectRoot?: string;
  gitRoot?: string;
  scope?: ScopeLevel;
  resolveImports?: boolean;
}
```

---

## 4. Renderer Architecture

### 4.1 Renderer Interface (Extended)

```typescript
interface AgentRenderer {
  agentId: AgentId;
  supportedTypes: ComponentType[];
  
  // Rendering
  render(spec: ComponentSpec, options: RenderOptions): RenderResult;
  
  // NEW: Type-specific rendering
  renderMemory?(spec: ComponentSpec, options: RenderOptions): RenderResult;
  renderRule?(spec: ComponentSpec, options: RenderOptions): RenderResult;
  renderHook?(spec: ComponentSpec, options: RenderOptions): RenderResult;
  
  // Output path generation
  getOutputPath(spec: ComponentSpec, options: RenderOptions): string;
}
```

### 4.2 New Renderers

| Renderer | Output Formats |
|----------|---------------|
| `ClaudeMemoryRenderer` | `CLAUDE.md` with imports |
| `ClaudeRuleRenderer` | `.claude/rules/<name>.md` |
| `ClaudeHookRenderer` | JSON hooks config |
| `WindsurfRuleRenderer` | `.windsurf/rules/<name>.md` |
| `WindsurfHookRenderer` | `.windsurf/hooks.json` |
| `CursorRuleRenderer` | `.cursor/rules/<name>.mdc` |
| `GeminiMemoryRenderer` | `GEMINI.md` |
| `UniversalMemoryRenderer` | `AGENTS.md` |

---

## 5. Conversion Mapping

### 5.1 Memory File Conversions

```typescript
const MEMORY_CONVERSIONS: ConversionMap = {
  // Claude → Others
  'claude:memory → windsurf:memory': {
    strategy: 'inline-imports',
    fidelity: 85,
    losses: ['import-structure', 'local-overrides'],
  },
  'claude:memory → cursor:memory': {
    strategy: 'to-agents-md',
    fidelity: 90,
    losses: ['import-structure'],
  },
  'claude:memory → gemini:memory': {
    strategy: 'direct',
    fidelity: 95,
    losses: [],
  },
  
  // Universal AGENTS.md
  'universal:memory → *': {
    strategy: 'direct',
    fidelity: 95,
    losses: [],
  },
};
```

### 5.2 Rule Conversions

```typescript
const RULE_CONVERSIONS: ConversionMap = {
  'claude:rule → windsurf:rule': {
    strategy: 'paths-to-globs',
    fidelity: 90,
    transformations: [
      { from: 'paths', to: 'globs', fn: pathsToGlobs },
    ],
  },
  'windsurf:rule → claude:rule': {
    strategy: 'globs-to-paths',
    fidelity: 90,
    transformations: [
      { from: 'globs', to: 'paths', fn: globsToPaths },
    ],
  },
  'windsurf:rule → cursor:rule': {
    strategy: 'direct',
    fidelity: 95,
    losses: [],
  },
};
```

### 5.3 Hook Event Mapping

```typescript
const HOOK_EVENT_MAP: Record<HookEvent, HookEvent[]> = {
  // Claude → Windsurf
  'PreToolUse': ['pre_read_code', 'pre_write_code', 'pre_run_command'],
  'PostToolUse': ['post_read_code', 'post_write_code', 'post_run_command'],
  'UserPromptSubmit': ['pre_user_prompt'],
  
  // Windsurf → Claude
  'pre_read_code': ['PreToolUse'],
  'post_write_code': ['PostToolUse'],
  'pre_user_prompt': ['UserPromptSubmit'],
  'post_cascade_response': [], // No equivalent
};
```

---

## 6. CLI Extensions

### 6.1 New Commands

```bash
# Memory file operations
cace convert-memory CLAUDE.md --to agents.md
cace convert-memory AGENTS.md --to gemini

# Rule operations
cace convert-rule .claude/rules/testing.md --to windsurf
cace batch-convert-rules .claude/rules/*.md --to cursor

# Hook operations
cace convert-hooks .claude/settings.json --to windsurf

# Universal operations
cace detect <file>              # Detect agent and type
cace normalize <file>           # Output canonical IR
cace migrate <dir> --to <agent> # Migrate entire project
```

### 6.2 Extended Options

```bash
# Import handling
cace convert CLAUDE.md --to agents.md --inline-imports
cace convert CLAUDE.md --to agents.md --preserve-imports

# Scope handling
cace convert rule.md --scope project
cace convert rule.md --scope user

# Validation
cace validate --type memory CLAUDE.md
cace validate --type rule .windsurf/rules/
cace validate --type hook .claude/settings.json
```

---

## 7. File Structure

```
src/
├── core/
│   ├── types.ts              # Extended types
│   ├── constants.ts          # Extended constants
│   ├── schema.ts             # Extended Zod schemas
│   └── ...
├── parsing/
│   ├── memory/
│   │   ├── claude-memory-parser.ts
│   │   ├── windsurf-memory-parser.ts
│   │   ├── cursor-memory-parser.ts
│   │   ├── gemini-memory-parser.ts
│   │   └── universal-memory-parser.ts
│   ├── rules/
│   │   ├── claude-rule-parser.ts
│   │   ├── windsurf-rule-parser.ts
│   │   └── cursor-rule-parser.ts
│   ├── hooks/
│   │   ├── claude-hook-parser.ts
│   │   └── windsurf-hook-parser.ts
│   └── ...
├── rendering/
│   ├── memory/
│   │   ├── claude-memory-renderer.ts
│   │   ├── agents-md-renderer.ts
│   │   └── gemini-memory-renderer.ts
│   ├── rules/
│   │   ├── claude-rule-renderer.ts
│   │   ├── windsurf-rule-renderer.ts
│   │   └── cursor-rule-renderer.ts
│   ├── hooks/
│   │   ├── claude-hook-renderer.ts
│   │   └── windsurf-hook-renderer.ts
│   └── ...
├── transformation/
│   ├── memory-mapper.ts
│   ├── rule-mapper.ts
│   ├── hook-mapper.ts
│   └── ...
└── cli/
    ├── convert-memory.ts
    ├── convert-rule.ts
    ├── convert-hook.ts
    ├── migrate.ts
    └── ...
```

---

## 8. Implementation Phases

### Phase 1: Memory Files (Week 1-2)
- [ ] Extend `ComponentSpec` with memory fields
- [ ] Implement `UniversalMemoryParser` (AGENTS.md)
- [ ] Implement `ClaudeMemoryParser` (CLAUDE.md)
- [ ] Implement `GeminiMemoryParser` (GEMINI.md)
- [ ] Implement memory renderers
- [ ] Add `convert-memory` CLI command
- [ ] Tests for memory conversions

### Phase 2: Rules (Week 3-4)
- [ ] Extend `ComponentSpec` with rule fields
- [ ] Implement `ClaudeRuleParser`
- [ ] Implement `WindsurfRuleParser`
- [ ] Implement `CursorRuleParser`
- [ ] Implement rule renderers
- [ ] Add glob ↔ paths conversion utilities
- [ ] Add `convert-rule` CLI command
- [ ] Tests for rule conversions

### Phase 3: Hooks (Week 5)
- [ ] Extend `ComponentSpec` with hook fields
- [ ] Implement `ClaudeHookParser`
- [ ] Implement `WindsurfHookParser`
- [ ] Implement hook renderers
- [ ] Add event mapping utilities
- [ ] Add `convert-hook` CLI command
- [ ] Tests for hook conversions

### Phase 4: Integration (Week 6)
- [ ] `migrate` command for full project migration
- [ ] Import resolution and inlining
- [ ] Comprehensive integration tests
- [ ] Documentation updates

---

*Architecture designed January 2026*
