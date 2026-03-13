/**
 * Claude Code validator with versioned support
 * Validates skills, rules, and hooks for different Claude versions
 */

import matter from 'gray-matter';
import { BaseValidator, type ValidationResult, type ValidationIssue, type ValidatorOptions } from '../validator-framework.js';
import type { ComponentType } from '../../core/types.js';

// Version 2.1.0 - January 2026 - Skills/commands unification, context: fork
// Version 2.0.0 - 2025 - Initial skills system
const CLAUDE_VERSIONS = ['2.0.0', '2.1.0', '2.1.3'];

interface ClaudeFrontmatter {
  name?: string;
  description?: string;
  aliases?: string[];
  'argument-hint'?: string;
  'disable-model-invocation'?: boolean;
  'user-invocable'?: boolean;
  'allowed-tools'?: string[];
  model?: string;
  context?: 'main' | 'fork' | 'isolated';
  agent?: string;
  version?: string;
}

export class ClaudeValidator extends BaseValidator {
  readonly agentId = 'claude' as const;
  readonly supportedVersions = CLAUDE_VERSIONS;
  readonly componentTypes: ComponentType[] = ['skill', 'rule', 'hook', 'memory'];

  validate(
    content: string,
    componentType: ComponentType,
    options?: ValidatorOptions
  ): ValidationResult {
    const version = options?.version ?? this.getLatestVersion();
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    if (componentType === 'hook' && content.trim().startsWith('{')) {
      return this.validateHookConfig(content, version);
    }

    try {
      const parsed = matter(content);
      const fm = parsed.data as ClaudeFrontmatter;
      const body = parsed.content.trim();

      // Validate structure (check for leading comments)
      this.validateStructure(body, issues);

      // Validate based on component type
      switch (componentType) {
        case 'skill':
          this.validateSkill(fm, body, version, issues, warnings, info, options);
          break;
        case 'rule':
          this.validateRule(fm, body, version, issues, warnings, info, options);
          break;
        case 'hook':
          this.validateHook(fm, body, version, issues, warnings, info, options);
          break;
        case 'memory':
          this.validateMemory(fm, body, version, issues, warnings, info, options);
          break;
        default:
          issues.push(
            this.createIssue(
              'UNSUPPORTED_TYPE',
              `Component type ${componentType} not supported for Claude`,
              'error'
            )
          );
      }

      return {
        valid: issues.length === 0,
        agent: this.agentId,
        componentType,
        version,
        issues,
        warnings,
        info,
        metadata: {
          hasFrontmatter: Object.keys(fm).length > 0,
          bodyLength: body.length,
          detectedFields: Object.keys(fm),
        },
      };
    } catch (err) {
      return this.createErrorResult(
        componentType,
        version,
        [
          this.createIssue(
            'PARSE_ERROR',
            `Failed to parse content: ${err instanceof Error ? err.message : String(err)}`,
            'error'
          ),
        ],
        { parseError: true }
      );
    }
  }

  private validateSkill(
    fm: ClaudeFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    // Required fields
    if (!fm.name) {
      issues.push(
        this.createIssue(
          'MISSING_NAME',
          'Skill must have a "name" field in frontmatter',
          'error',
          'name',
          'Add ---\nname: your-skill-name\n--- at the top of the file'
        )
      );
    }

    if (!fm.description) {
      warnings.push(
        this.createIssue(
          'MISSING_DESCRIPTION',
          'Skill should have a "description" field for better discoverability',
          'warning',
          'description',
          'Add description: "Brief description of what this skill does"'
        )
      );
    }

    // Version-specific validations
    if (this.compareVersions(version, '2.1.0') >= 0) {
      // v2.1.0+ features
      if (fm.context === 'fork') {
        info.push(
          this.createIssue(
            'FORK_CONTEXT',
            'Using fork context for isolated execution (v2.1.0+)',
            'info',
            'context'
          )
        );
      }

      if (fm.agent) {
        const validAgents = ['explore', 'plan', 'general'];
        if (!validAgents.includes(fm.agent)) {
          warnings.push(
            this.createIssue(
              'UNKNOWN_AGENT',
              `Agent "${fm.agent}" is not a standard subagent. Valid options: ${validAgents.join(', ')}`,
              'warning',
              'agent'
            )
          );
        }
      }

      if (fm.aliases && fm.aliases.length > 0) {
        info.push(
          this.createIssue(
            'ALIASES',
            `Skill has ${fm.aliases.length} aliases for alternative invocation`,
            'info',
            'aliases'
          )
        );
      }
    } else {
      // Pre-2.1.0 deprecated features
      if (fm.context === 'fork') {
        issues.push(
          this.createIssue(
            'UNSUPPORTED_CONTEXT',
            'context: fork requires Claude Code v2.1.0 or later',
            'error',
            'context',
            'Upgrade to Claude Code v2.1.0+ or use context: main'
          )
        );
      }
    }

    // Validate allowed-tools
    if (fm['allowed-tools']) {
      const validTools = [
        'Read',
        'Edit',
        'Write',
        'Bash',
        'Task',
        'UserInput',
        'Search',
        'Grep',
        'Glob',
        'GitCommit',
        'GitDiff',
        'GitLog',
        'GitBranch',
        'GitStatus',
        'LS',
        'View',
        'TodoWrite',
        'TodoRead',
        'AskUser',
        'Print',
        'Exit',
      ];

      for (const tool of fm['allowed-tools']) {
        if (!validTools.includes(tool)) {
          warnings.push(
            this.createIssue(
              'UNKNOWN_TOOL',
              `Tool "${tool}" may not be valid. Valid tools: ${validTools.join(', ')}`,
              'warning',
              'allowed-tools'
            )
          );
        }
      }
    }

    // Validate model
    if (fm.model) {
      const validModels = ['sonnet', 'opus', 'haiku', 'claude-3-5-sonnet', 'claude-3-opus'];
      if (!validModels.some((m) => fm.model?.toLowerCase().includes(m))) {
        warnings.push(
          this.createIssue(
            'UNKNOWN_MODEL',
            `Model "${fm.model}" may not be valid`,
            'warning',
            'model'
          )
        );
      }
    }

    // Body validations
    if (body.length < 50) {
      warnings.push(
        this.createIssue(
          'SHORT_BODY',
          'Skill body is very short. Consider adding more detailed instructions.',
          'warning'
        )
      );
    }

    if (!options?.skipDeprecatedWarnings) {
      // Check for deprecated patterns
      if (body.includes('SlashCommand')) {
        info.push(
          this.createIssue(
            'SLASH_COMMAND_TOOL',
            'Using SlashCommand tool for skill chaining (v2.1.0+)',
            'info'
          )
        );
      }
    }

    // === Structural Standards Validation (SKILL-E/W/I codes) ===
    // Based on business-os/docs/standards/SKILL-STANDARDS.md
    // Enabled via options.enforceStructuralStandards

    if (!options?.enforceStructuralStandards) return;

    // SKILL-E003: Missing scope_constraints
    if (!body.includes('<scope_constraints>')) {
      issues.push(
        this.createIssue(
          'SKILL-E003',
          'Skill must have a <scope_constraints> section defining operational boundaries',
          'error',
          undefined,
          'Add <scope_constraints>\\n...boundaries, modes, defaults...\\n</scope_constraints> after the title'
        )
      );
    }

    // SKILL-E004: Missing context
    if (!body.includes('<context>')) {
      issues.push(
        this.createIssue(
          'SKILL-E004',
          'Skill must have a <context> section listing dependencies and prerequisites',
          'error',
          undefined,
          'Add <context>\\n...dependencies, DB tables, MCP servers...\\n</context>'
        )
      );
    }

    // SKILL-E005: Missing instructions
    if (!body.includes('<instructions>')) {
      issues.push(
        this.createIssue(
          'SKILL-E005',
          'Skill must have an <instructions> section with inputs, outputs, and steps',
          'error',
          undefined,
          'Wrap your workflow in <instructions>\\n## Inputs\\n...\\n## Steps\\n...\\n</instructions>'
        )
      );
    }

    // SKILL-E006: Tag order violation
    if (body.includes('<scope_constraints>') && body.includes('<context>') && body.includes('<instructions>')) {
      const scopeIdx = body.indexOf('<scope_constraints>');
      const contextIdx = body.indexOf('<context>');
      const instructionsIdx = body.indexOf('<instructions>');

      if (scopeIdx > contextIdx || contextIdx > instructionsIdx) {
        issues.push(
          this.createIssue(
            'SKILL-E006',
            'XML tags must appear in order: <scope_constraints>, <context>, <instructions>, <output_format>',
            'error',
            undefined,
            'Reorder sections: scope_constraints → context → instructions → output_format'
          )
        );
      }

      // Check output_format order if present
      if (body.includes('<output_format>')) {
        const outputIdx = body.indexOf('<output_format>');
        if (outputIdx < instructionsIdx) {
          issues.push(
            this.createIssue(
              'SKILL-E006',
              '<output_format> must appear after <instructions>',
              'error',
              undefined,
              'Move <output_format> section after </instructions>'
            )
          );
        }
      }
    }

    // SKILL-E007: Missing inputs inside instructions
    if (body.includes('<instructions>') && body.includes('</instructions>')) {
      const instructionsContent = body.substring(
        body.indexOf('<instructions>') + '<instructions>'.length,
        body.indexOf('</instructions>')
      );
      if (!instructionsContent.includes('## Inputs') && !instructionsContent.includes('## Input')) {
        issues.push(
          this.createIssue(
            'SKILL-E007',
            'Instructions block must contain an ## Inputs section',
            'error',
            undefined,
            'Add ## Inputs section inside <instructions>'
          )
        );
      }
    }

    // SKILL-E008: Missing steps inside instructions
    if (body.includes('<instructions>') && body.includes('</instructions>')) {
      const instructionsContent = body.substring(
        body.indexOf('<instructions>') + '<instructions>'.length,
        body.indexOf('</instructions>')
      );
      if (!instructionsContent.includes('## Steps') && !instructionsContent.includes('### Step')) {
        issues.push(
          this.createIssue(
            'SKILL-E008',
            'Instructions block must contain workflow steps (## Steps or ### Step N)',
            'error',
            undefined,
            'Add ## Steps with ### Step 1, ### Step 2, etc. inside <instructions>'
          )
        );
      }
    }

    // SKILL-W001: Missing output_format for artifact-producing skills
    if (!body.includes('<output_format>')) {
      // Heuristic: if the skill mentions writing files or producing reports
      const producesArtifacts = /write.*file|workspace\/|\.md\b|report|briefing|frontmatter/i.test(body);
      if (producesArtifacts) {
        warnings.push(
          this.createIssue(
            'SKILL-W001',
            'Skill appears to produce file artifacts but has no <output_format> section',
            'warning',
            undefined,
            'Add <output_format> section with report template and progressive disclosure levels'
          )
        );
      }
    }

    // SKILL-W002: Missing error handling
    if (body.includes('<instructions>') && body.includes('</instructions>')) {
      const instructionsContent = body.substring(
        body.indexOf('<instructions>') + '<instructions>'.length,
        body.indexOf('</instructions>')
      );
      if (!instructionsContent.toLowerCase().includes('error handling') && !instructionsContent.toLowerCase().includes('error hand')) {
        warnings.push(
          this.createIssue(
            'SKILL-W002',
            'Instructions should include an error handling section',
            'warning',
            undefined,
            'Add ## Error Handling section inside <instructions>'
          )
        );
      }
    }

    // SKILL-W003: No code examples
    if (body.includes('<instructions>') && !body.includes('```')) {
      warnings.push(
        this.createIssue(
          'SKILL-W003',
          'Instructions lack executable code examples',
          'warning',
          undefined,
          'Add code blocks (```bash, ```sql, etc.) with example commands or queries'
        )
      );
    }

    // SKILL-W004: Missing when_to_use
    if (!(fm as Record<string, unknown>)['when_to_use']) {
      warnings.push(
        this.createIssue(
          'SKILL-W004',
          'Skill should have a "when_to_use" field for activation guidance',
          'warning',
          'when_to_use',
          'Add when_to_use: "Use when..." in frontmatter'
        )
      );
    }

    // SKILL-W005: Missing argument-hint for user-invocable skills
    if (fm['user-invocable'] && !fm['argument-hint']) {
      warnings.push(
        this.createIssue(
          'SKILL-W005',
          'User-invocable skill should have an "argument-hint" for usage guidance',
          'warning',
          'argument-hint',
          'Add argument-hint: "[args description]" in frontmatter'
        )
      );
    }

    // SKILL-I001: Progressive disclosure detected
    if (/L[0-3]/i.test(body) && /disclosure/i.test(body)) {
      info.push(
        this.createIssue(
          'SKILL-I001',
          'Progressive disclosure (L0-L3) levels detected',
          'info'
        )
      );
    }

    // SKILL-I002: MCP integration detected
    if (body.includes('mcp-cli') || body.includes('mcp_') || body.includes('google-workspace')) {
      info.push(
        this.createIssue(
          'SKILL-I002',
          'MCP server integration detected',
          'info'
        )
      );
    }

    // SKILL-I003: Agent delegation detected
    if (/tier-[12]/i.test(body) || /agent.*scanner/i.test(body)) {
      info.push(
        this.createIssue(
          'SKILL-I003',
          'Tier-1/2 agent delegation detected',
          'info'
        )
      );
    }

    // SKILL-I004: Database queries detected
    if (body.includes('sqlite3') || body.includes('index.db')) {
      info.push(
        this.createIssue(
          'SKILL-I004',
          'SQLite database queries detected',
          'info'
        )
      );
    }
  }

  private validateRule(
    fm: ClaudeFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    // Rules use paths field instead of name
    if (!fm.description) {
      warnings.push(
        this.createIssue(
          'MISSING_DESCRIPTION',
          'Rule should have a description',
          'warning',
          'description'
        )
      );
    }

    // Rules don't use most skill fields
    const invalidRuleFields = [
      'user-invocable',
      'disable-model-invocation',
      'argument-hint',
      'agent',
    ];

    for (const field of invalidRuleFields) {
      if (fm[field as keyof ClaudeFrontmatter] !== undefined) {
        warnings.push(
          this.createIssue(
            'RULE_FIELD',
            `Field "${field}" is not typically used in rules (meant for skills)`,
            'warning',
            field
          )
        );
      }
    }
  }

  private validateHook(
    _fm: ClaudeFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    _warnings: ValidationIssue[],
    _info: ValidationIssue[],
    _options?: ValidatorOptions
  ): void {
    // Hooks are defined in settings.json, not markdown
    // This is a basic validation for hook documentation
    if (!body.includes('PreToolUse') && !body.includes('PostToolUse') && !body.includes('Session')) {
      issues.push(
        this.createIssue(
          'HOOK_CONTENT',
          'Hook documentation should reference valid hook events',
          'error'
        )
      );
    }
  }

  private validateHookConfig(
    content: string,
    version: string,
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return this.createErrorResult(
        'hook',
        version,
        [
          this.createIssue(
            'PARSE_ERROR',
            `Failed to parse hook config: ${err instanceof Error ? err.message : String(err)}`,
            'error'
          ),
        ],
        { parseError: true }
      );
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      issues.push(
        this.createIssue(
          'INVALID_ROOT',
          'Claude hook config must be a JSON object',
          'error'
        )
      );
    }

    const settings = parsed as Record<string, unknown>;
    const hooks = settings['hooks'];

    if (typeof hooks !== 'object' || hooks === null || Array.isArray(hooks)) {
      issues.push(
        this.createIssue(
          'MISSING_HOOKS',
          'Claude hook config must contain a "hooks" object',
          'error',
          'hooks'
        )
      );
    } else {
      for (const [event, groups] of Object.entries(hooks as Record<string, unknown>)) {
        if (!Array.isArray(groups)) {
          issues.push(
            this.createIssue(
              'INVALID_EVENT_GROUP',
              `Hook event "${event}" must map to an array`,
              'error',
              event
            )
          );
          continue;
        }

        info.push(
          this.createIssue(
            'HOOK_EVENT',
            `Found ${groups.length} hook group(s) for ${event}`,
            'info',
            event
          )
        );
      }
    }

    return {
      valid: issues.length === 0,
      agent: this.agentId,
      componentType: 'hook',
      version,
      issues,
      warnings,
      info,
      metadata: {
        isJsonConfig: true,
      },
    };
  }

  private validateMemory(
    _fm: ClaudeFrontmatter,
    body: string,
    _version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    _info: ValidationIssue[],
    _options?: ValidatorOptions
  ): void {
    // Validate CLAUDE.md style memory files
    if (body.length < 100) {
      warnings.push(
        this.createIssue(
          'SHORT_MEMORY',
          'Memory file is quite short. Consider adding more context.',
          'warning'
        )
      );
    }

    // Check for @import syntax
    const importMatches = body.match(/@([\w\/.-]+)/g);
    if (importMatches) {
      _info.push(
        this.createIssue(
          'IMPORTS',
          `Found ${importMatches.length} file references`,
          'info'
        )
      );
    }
  }

  private compareVersions(a: string, b: string): number {
    const parse = (v: string) => v.split('.').map(Number);
    const aparts = parse(a);
    const bparts = parse(b);

    for (let i = 0; i < Math.max(aparts.length, bparts.length); i++) {
      const anum = aparts[i] ?? 0;
      const bnum = bparts[i] ?? 0;
      if (anum > bnum) return 1;
      if (anum < bnum) return -1;
    }
    return 0;
  }

  protected createIssue(
    code: string,
    message: string,
    severity: ValidationIssue['severity'],
    field?: string,
    suggestion?: string
  ): ValidationIssue {
    return {
      code,
      message,
      severity,
      field,
      suggestion,
    };
  }
}
