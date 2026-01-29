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

    try {
      const parsed = matter(content);
      const fm = parsed.data as ClaudeFrontmatter;
      const body = parsed.content.trim();

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
