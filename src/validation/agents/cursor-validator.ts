/**
 * Cursor IDE validator with versioned support
 * Validates .mdc rules and .md commands
 */

import matter from 'gray-matter';
import { BaseValidator, type ValidationResult, type ValidationIssue, type ValidatorOptions } from '../validator-framework.js';
import type { ComponentType } from '../../core/types.js';

// Version 0.46+ - March 2025 - .mdc format introduced, .cursorrules deprecated
// Version 0.40+ - 2025 - Initial rules system
const CURSOR_VERSIONS = ['0.40.0', '0.45.0', '0.46.0'];

interface CursorFrontmatter {
  description?: string;
  globs?: string[];
  alwaysApply?: boolean;
  // Legacy .cursorrules didn't use frontmatter
}

export class CursorValidator extends BaseValidator {
  readonly agentId = 'cursor' as const;
  readonly supportedVersions = CURSOR_VERSIONS;
  readonly componentTypes: ComponentType[] = ['rule', 'command'];

  validate(
    content: string,
    componentType: ComponentType,
    options?: ValidatorOptions
  ): ValidationResult {
    const version = options?.version ?? this.getLatestVersion();
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    // Detect if this is legacy .cursorrules format
    const isLegacyCursorrules = !content.startsWith('---') && !content.includes('globs:');

    if (isLegacyCursorrules && componentType === 'rule') {
      if (!options?.skipDeprecatedWarnings) {
        warnings.push(
          this.createIssue(
            'DEPRECATED_FORMAT',
            '.cursorrules format is deprecated. Migrate to .cursor/rules/*.mdc',
            'warning',
            undefined,
            'Create .cursor/rules/<name>.mdc with frontmatter (description, globs, alwaysApply)'
          )
        );
      }

      // Still validate legacy format
      return this.validateLegacyCursorrules(content, version, issues, warnings, info);
    }

    try {
      const parsed = matter(content);
      const fm = parsed.data as CursorFrontmatter;
      const body = parsed.content.trim();

      switch (componentType) {
        case 'rule':
          this.validateRule(fm, body, version, issues, warnings, info, options);
          break;
        case 'command':
          this.validateCommand(fm, body, version, issues, warnings, info, options);
          break;
        default:
          issues.push(
            this.createIssue(
              'UNSUPPORTED_TYPE',
              `Component type ${componentType} not supported for Cursor`,
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
          isLegacyFormat: isLegacyCursorrules,
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

  private validateRule(
    fm: CursorFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    // Required fields for .mdc
    if (!fm.description) {
      issues.push(
        this.createIssue(
          'MISSING_DESCRIPTION',
          '.mdc rules must have a "description" field in frontmatter',
          'error',
          'description',
          'Add ---\ndescription: "What this rule does"\n--- at the top'
        )
      );
    }

    // Validate globs
    if (fm.globs) {
      if (!Array.isArray(fm.globs)) {
        issues.push(
          this.createIssue(
            'INVALID_GLOBS',
            'globs must be an array of strings',
            'error',
            'globs',
            'Use format: globs: ["src/**/*.ts", "**/*.tsx"]'
          )
        );
      } else {
        // Validate glob patterns
        for (const glob of fm.globs) {
          if (typeof glob !== 'string') {
            issues.push(
              this.createIssue(
                'INVALID_GLOB',
                `Invalid glob: ${glob}. Must be a string.`,
                'error',
                'globs'
              )
            );
          } else if (!glob.includes('*') && !glob.includes('.')) {
            warnings.push(
              this.createIssue(
                'SIMPLE_GLOB',
                `Glob "${glob}" is very specific and may not match multiple files`,
                'warning',
                'globs'
              )
            );
          }
        }

        info.push(
          this.createIssue(
            'GLOBS',
            `Rule applies to ${fm.globs.length} file patterns`,
            'info',
            'globs'
          )
        );
      }
    }

    // Validate alwaysApply
    if (fm.alwaysApply !== undefined) {
      if (typeof fm.alwaysApply !== 'boolean') {
        issues.push(
          this.createIssue(
            'INVALID_ALWAYS_APPLY',
            'alwaysApply must be a boolean (true or false)',
            'error',
            'alwaysApply'
          )
        );
      } else {
        if (fm.alwaysApply) {
          info.push(
            this.createIssue(
              'ALWAYS_APPLY',
              'Rule will always be applied to all conversations',
              'info',
              'alwaysApply'
            )
          );
        } else if (!fm.globs || fm.globs.length === 0) {
          info.push(
            this.createIssue(
              'AGENT_DECIDED',
              'Rule has alwaysApply: false with no globs - agent will decide when to use it',
              'info',
              'alwaysApply'
            )
          );
        }
      }
    }

    // Body validations
    if (body.length < 50) {
      warnings.push(
        this.createIssue(
          'SHORT_BODY',
          'Rule body is very short. Consider adding more detailed instructions.',
          'warning'
        )
      );
    }

    // Check for ALways follow instruction (helps AI select rule)
    if (!body.toLowerCase().includes('always follow') && !body.toLowerCase().includes('always apply')) {
      warnings.push(
        this.createIssue(
          'NO_ALWAYS_PHRASE',
          'Consider adding "Always follow this rule" or similar to help AI select this rule',
          'warning',
          undefined,
          'Add a sentence like: "Always follow this rule when working with [topic]"'
        )
      );
    }

    // Version-specific checks
    if (this.compareVersions(version, '0.45.0') < 0) {
      if (fm.globs || fm.alwaysApply !== undefined) {
        warnings.push(
          this.createIssue(
            'NEW_FORMAT',
            'Frontmatter fields (globs, alwaysApply) require Cursor v0.45+',
            'warning'
          )
        );
      }
    }
  }

  private validateCommand(
    fm: CursorFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    // Commands use plain markdown (no required frontmatter)
    // But can have optional frontmatter

    if (Object.keys(fm).length > 0) {
      // If frontmatter exists, warn that it's not typically used
      info.push(
        this.createIssue(
          'COMMAND_FRONTMATTER',
          'Commands typically use plain markdown without frontmatter',
          'info'
        )
      );
    }

    if (body.length < 30) {
      issues.push(
        this.createIssue(
          'SHORT_COMMAND',
          'Command body is too short. Add detailed instructions.',
          'error'
        )
      );
    }

    // Check for @ mentions (file references)
    const mentions = body.match(/@(\w+)/g);
    if (mentions) {
      info.push(
        this.createIssue(
          'MENTIONS',
          `Command references ${mentions.length} file/agent mentions`,
          'info'
        )
      );
    }
  }

  private validateLegacyCursorrules(
    content: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[]
  ): ValidationResult {
    // Legacy .cursorrules was just markdown content
    if (content.length < 100) {
      warnings.push(
        this.createIssue(
          'SHORT_CURSORRULES',
          '.cursorrules file is quite short',
          'warning'
        )
      );
    }

    return {
      valid: issues.length === 0,
      agent: this.agentId,
      componentType: 'rule',
      version,
      issues,
      warnings,
      info,
      metadata: {
        isLegacyFormat: true,
        bodyLength: content.length,
      },
    };
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
