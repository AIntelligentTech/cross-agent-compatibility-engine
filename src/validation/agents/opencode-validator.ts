/**
 * OpenCode validator with versioned support
 * Validates Skills, Commands, and Agents
 */

import matter from 'gray-matter';
import { BaseValidator, type ValidationResult, type ValidationIssue, type ValidatorOptions } from '../validator-framework.js';
import type { ComponentType } from '../../core/types.js';

// Version 1.1+ - January 2026 - Plugin system, Claude compatibility
// Version 1.0+ - 2025 - Initial release
const OPENCODE_VERSIONS = ['1.0.0', '1.1.0', '1.1.34'];

interface OpenCodeFrontmatter {
  name?: string;
  description?: string;
  // Skill-specific
  agent?: string;
  model?: string;
  subtask?: boolean;
  // Command-specific
  arguments?: string[];
  // Agent-specific
  mode?: 'primary' | 'subagent';
  temperature?: number;
  maxSteps?: number;
  tools?: string[];
  permission?: 'allow' | 'deny' | 'ask';
  hidden?: boolean;
}

export class OpenCodeValidator extends BaseValidator {
  readonly agentId = 'opencode' as const;
  readonly supportedVersions = OPENCODE_VERSIONS;
  readonly componentTypes: ComponentType[] = ['skill', 'command', 'agent'];

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
      const fm = parsed.data as OpenCodeFrontmatter;
      const body = parsed.content.trim();

      switch (componentType) {
        case 'skill':
          this.validateSkill(fm, body, version, issues, warnings, info, options);
          break;
        case 'command':
          this.validateCommand(fm, body, version, issues, warnings, info, options);
          break;
        case 'agent':
          this.validateAgent(fm, body, version, issues, warnings, info, options);
          break;
        default:
          issues.push(
            this.createIssue(
              'UNSUPPORTED_TYPE',
              `Component type ${componentType} not supported for OpenCode`,
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
    fm: OpenCodeFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    // Skills require name
    if (!fm.name) {
      issues.push(
        this.createIssue(
          'MISSING_NAME',
          'Skill must have a "name" field',
          'error',
          'name'
        )
      );
    }

    if (!fm.description) {
      warnings.push(
        this.createIssue(
          'MISSING_DESCRIPTION',
          'Skill should have a description',
          'warning',
          'description'
        )
      );
    }

    // Skills use skill() tool, not slash commands
    info.push(
      this.createIssue(
        'SKILL_TOOL',
        'Skills are invoked via the skill() tool, not slash commands',
        'info'
      )
    );

    // subtask mode
    if (fm.subtask === true) {
      info.push(
        this.createIssue(
          'SUBTASK_MODE',
          'Skill runs in isolated subtask context (like Claude\'s context: fork)',
          'info',
          'subtask'
        )
      );
    }

    // agent field
    if (fm.agent) {
      info.push(
        this.createIssue(
          'AGENT_SPECIFIED',
          `Skill uses agent: ${fm.agent}`,
          'info',
          'agent'
        )
      );
    }

    // model field
    if (fm.model) {
      info.push(
        this.createIssue(
          'MODEL_SPECIFIED',
          `Skill uses model: ${fm.model}`,
          'info',
          'model'
        )
      );
    }
  }

  private validateCommand(
    fm: OpenCodeFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    if (!fm.description) {
      warnings.push(
        this.createIssue(
          'MISSING_DESCRIPTION',
          'Command should have a description',
          'warning',
          'description'
        )
      );
    }

    // Check for $ARGUMENTS placeholder
    if (!body.includes('$ARGUMENTS') && !body.includes('$1')) {
      if (body.toLowerCase().includes('argument') || body.toLowerCase().includes('input')) {
        warnings.push(
          this.createIssue(
            'NO_ARGUMENTS_PLACEHOLDER',
            'Command mentions arguments but has no $ARGUMENTS or $1 placeholder',
            'warning',
            undefined,
            'Add $ARGUMENTS to use command arguments'
          )
        );
      }
    }

    // Check for shell injection
    const shellMatches = body.match(/!\`([^`]+)\`/g);
    if (shellMatches) {
      info.push(
        this.createIssue(
          'SHELL_INJECTION',
          `Command uses shell injection for ${shellMatches.length} commands`,
          'info'
        )
      );
    }

    // Check for file references
    const fileRefs = body.match(/@([\w.\/]+)/g);
    if (fileRefs) {
      info.push(
        this.createIssue(
          'FILE_REFERENCES',
          `Command references ${fileRefs.length} files`,
          'info'
        )
      );
    }

    // agent field
    if (fm.agent) {
      info.push(
        this.createIssue(
          'AGENT_COMMAND',
          `Command uses agent: ${fm.agent}`,
          'info',
          'agent'
        )
      );
    }

    // subtask field
    if (fm.subtask === true) {
      info.push(
        this.createIssue(
          'SUBTASK_COMMAND',
          'Command runs as subtask (isolated context)',
          'info',
          'subtask'
        )
      );
    }

    // arguments frontmatter (for named args)
    if (fm.arguments) {
      info.push(
        this.createIssue(
          'NAMED_ARGUMENTS',
          `Command has ${fm.arguments.length} named arguments: ${fm.arguments.join(', ')}`,
          'info',
          'arguments'
        )
      );
    }
  }

  private validateAgent(
    fm: OpenCodeFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    if (!fm.name) {
      issues.push(
        this.createIssue(
          'MISSING_NAME',
          'Agent must have a name',
          'error',
          'name'
        )
      );
    }

    if (!fm.description) {
      warnings.push(
        this.createIssue(
          'MISSING_DESCRIPTION',
          'Agent should have a description',
          'warning',
          'description'
        )
      );
    }

    // Mode validation
    if (fm.mode) {
      if (!['primary', 'subagent'].includes(fm.mode)) {
        issues.push(
          this.createIssue(
            'INVALID_MODE',
            `Invalid mode "${fm.mode}". Must be "primary" or "subagent"`,
            'error',
            'mode'
          )
        );
      } else {
        info.push(
          this.createIssue(
            'AGENT_MODE',
            `Agent is ${fm.mode} mode`,
            'info',
            'mode'
          )
        );
      }
    }

    // Temperature validation
    if (fm.temperature !== undefined) {
      if (fm.temperature < 0 || fm.temperature > 1) {
        issues.push(
          this.createIssue(
            'INVALID_TEMPERATURE',
            `Temperature ${fm.temperature} is out of range (0.0-1.0)`,
            'error',
            'temperature'
          )
        );
      }
    }

    // Tools
    if (fm.tools) {
      info.push(
        this.createIssue(
          'AGENT_TOOLS',
          `Agent has ${fm.tools.length} tools: ${fm.tools.join(', ')}`,
          'info',
          'tools'
        )
      );
    }

    // Permission
    if (fm.permission) {
      info.push(
        this.createIssue(
          'PERMISSION_MODE',
          `Agent uses permission: ${fm.permission}`,
          'info',
          'permission'
        )
      );
    }
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
