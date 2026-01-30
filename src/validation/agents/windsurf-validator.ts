/**
 * Windsurf validator with versioned support
 * Validates Skills, Workflows, and Rules
 */

import matter from 'gray-matter';
import { BaseValidator, type ValidationResult, type ValidationIssue, type ValidatorOptions } from '../validator-framework.js';
import type { ComponentType } from '../../core/types.js';

// Version 1.12+ (Wave 13) - January 2026 - Hooks system, Skills refinement
// Version 1.8+ (Wave 8) - May 2025 - Skills vs Workflows distinction
const WINDSURF_VERSIONS = ['1.8.0', '1.10.0', '1.12.0'];

interface WindsurfFrontmatter {
  name?: string;
  description?: string;
  globs?: string[];
  alwaysApply?: boolean;
  auto_execution_mode?: 'manual' | 'automatic';
  // Skill-specific
  tags?: string[];
  // Workflow-specific
  steps?: string[];
}

export class WindsurfValidator extends BaseValidator {
  readonly agentId = 'windsurf' as const;
  readonly supportedVersions = WINDSURF_VERSIONS;
  readonly componentTypes: ComponentType[] = ['skill', 'workflow', 'rule'];

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
      const fm = parsed.data as WindsurfFrontmatter;
      const body = parsed.content.trim();

      // Validate structure (check for leading comments)
      this.validateStructure(body, issues);

      switch (componentType) {
        case 'skill':
          this.validateSkill(fm, body, version, issues, warnings, info, options);
          break;
        case 'workflow':
          this.validateWorkflow(fm, body, version, issues, warnings, info, options);
          break;
        case 'rule':
          this.validateRule(fm, body, version, issues, warnings, info, options);
          break;
        default:
          issues.push(
            this.createIssue(
              'UNSUPPORTED_TYPE',
              `Component type ${componentType} not supported for Windsurf`,
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
    fm: WindsurfFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    // Skills require name field
    if (!fm.name) {
      issues.push(
        this.createIssue(
          'MISSING_NAME',
          'Skill must have a "name" field in frontmatter',
          'error',
          'name',
          'Add ---\nname: your-skill-name\n--- at the top'
        )
      );
    }

    if (!fm.description) {
      warnings.push(
        this.createIssue(
          'MISSING_DESCRIPTION',
          'Skill should have a description for progressive disclosure',
          'warning',
          'description'
        )
      );
    }

    // Skills support tags for categorization
    if (fm.tags) {
      info.push(
        this.createIssue(
          'SKILL_TAGS',
          `Skill has ${fm.tags.length} tags: ${fm.tags.join(', ')}`,
          'info',
          'tags'
        )
      );
    }

    // Skills are auto-invokable
    info.push(
      this.createIssue(
        'AUTO_INVOCATION',
        'Skills use progressive disclosure and can be auto-invoked by Cascade',
        'info'
      )
    );

    // Body should be procedural instructions
    if (body.length < 50) {
      warnings.push(
        this.createIssue(
          'SHORT_BODY',
          'Skill body is very short. Add detailed procedural instructions.',
          'warning'
        )
      );
    }

    // Check for workflow-style steps (warning - skills shouldn't use explicit steps)
    if (body.match(/^\d+\./m) && body.includes('1.') && body.includes('2.')) {
      warnings.push(
        this.createIssue(
          'STEPS_IN_SKILL',
          'Skill contains numbered steps. Consider if this should be a Workflow instead.',
          'warning',
          undefined,
          'Skills = procedural knowledge (how). Workflows = sequential steps (what).'
        )
      );
    }
  }

  private validateWorkflow(
    fm: WindsurfFrontmatter,
    body: string,
    version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[],
    options?: ValidatorOptions
  ): void {
    // Workflows need description but not name (uses filename)
    if (!fm.description) {
      warnings.push(
        this.createIssue(
          'MISSING_DESCRIPTION',
          'Workflow should have a description',
          'warning',
          'description'
        )
      );
    }

    // Workflows are manual-only
    if (fm.auto_execution_mode === 'automatic') {
      warnings.push(
        this.createIssue(
          'AUTO_WORKFLOW',
          'Workflows cannot be automatic. Use Skills for auto-invocation.',
          'warning',
          'auto_execution_mode'
        )
      );
    }

    info.push(
      this.createIssue(
        'MANUAL_INVOCATION',
        'Workflows require manual invocation via /workflow-name',
        'info'
      )
    );

    // Check for step structure
    const hasSteps = body.match(/^\d+\./m) || body.includes('Step ') || body.includes('Call /');
    if (!hasSteps) {
      warnings.push(
        this.createIssue(
          'NO_STEPS',
          'Workflow should have numbered steps or "Call /other-workflow" for chaining',
          'warning'
        )
      );
    }

    // Check for workflow chaining
    const chainedWorkflows = body.match(/Call \/([\w-]+)/g);
    if (chainedWorkflows) {
      info.push(
        this.createIssue(
          'CHAINING',
          `Workflow chains to ${chainedWorkflows.length} other workflows`,
          'info'
        )
      );
    }
  }

  private validateRule(
    fm: WindsurfFrontmatter,
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
          'Rule should have a description',
          'warning',
          'description'
        )
      );
    }

    // Validate globs
    if (fm.globs) {
      if (!Array.isArray(fm.globs)) {
        issues.push(
          this.createIssue(
            'INVALID_GLOBS',
            'globs must be an array',
            'error',
            'globs'
          )
        );
      } else {
        info.push(
          this.createIssue(
            'GLOBS',
            `Rule applies to ${fm.globs.length} patterns`,
            'info',
            'globs'
          )
        );
      }
    }

    // alwaysApply
    if (fm.alwaysApply === true) {
      info.push(
        this.createIssue(
          'ALWAYS_APPLY',
          'Rule is set to always apply',
          'info',
          'alwaysApply'
        )
      );
    } else if (!fm.globs && !fm.description) {
      warnings.push(
        this.createIssue(
          'RULE_ACTIVATION',
          'Rule has no globs, alwaysApply:false, and no description. It may never be activated.',
          'warning'
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
