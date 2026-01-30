/**
 * Core validation framework for CACE
 * Provides versioned validation for all agent artifacts
 */

import type { AgentId, ComponentType } from '../core/types.js';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  field?: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  agent: AgentId;
  componentType: ComponentType;
  version: string;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  metadata?: Record<string, unknown>;
}

export interface ValidatorOptions {
  strict?: boolean;
  version?: string;
  allowFutureFeatures?: boolean;
  skipDeprecatedWarnings?: boolean;
}

export abstract class BaseValidator {
  abstract readonly agentId: AgentId;
  abstract readonly supportedVersions: string[];
  abstract readonly componentTypes: ComponentType[];

  abstract validate(
    content: string,
    componentType: ComponentType,
    options?: ValidatorOptions
  ): ValidationResult;

  protected createSuccessResult(
    componentType: ComponentType,
    version: string,
    metadata?: Record<string, unknown>
  ): ValidationResult {
    return {
      valid: true,
      agent: this.agentId,
      componentType,
      version,
      issues: [],
      warnings: [],
      info: [],
      metadata,
    };
  }

  protected createErrorResult(
    componentType: ComponentType,
    version: string,
    errors: ValidationIssue[],
    metadata?: Record<string, unknown>
  ): ValidationResult {
    return {
      valid: false,
      agent: this.agentId,
      componentType,
      version,
      issues: errors,
      warnings: [],
      info: [],
      metadata,
    };
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

  isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  getLatestVersion(): string {
    return this.supportedVersions[this.supportedVersions.length - 1] ?? '1.0.0';
  }

  protected validateStructure(
    body: string,
    issues: ValidationIssue[]
  ): void {
    if (body.trimStart().startsWith('<!--')) {
      issues.push(
        this.createIssue(
          'LEADING_COMMENT',
          'Body content must not start with a comment. Ensure YAML frontmatter is immediately followed by meaningful content.',
          'error',
          undefined,
          'Remove comments between --- and the start of the body content.'
        )
      );
    }
  }
}

export class ValidatorRegistry {
  private validators = new Map<AgentId, Map<ComponentType, BaseValidator[]>>();

  register(validator: BaseValidator): void {
    if (!this.validators.has(validator.agentId)) {
      this.validators.set(validator.agentId, new Map());
    }

    const agentValidators = this.validators.get(validator.agentId)!;
    for (const type of validator.componentTypes) {
      if (!agentValidators.has(type)) {
        agentValidators.set(type, []);
      }
      agentValidators.get(type)!.push(validator);
    }
  }

  getValidator(
    agent: AgentId,
    componentType: ComponentType,
    version?: string
  ): BaseValidator | undefined {
    const agentValidators = this.validators.get(agent);
    if (!agentValidators) return undefined;

    const typeValidators = agentValidators.get(componentType);
    if (!typeValidators) return undefined;

    if (version) {
      return typeValidators.find((v) => v.isVersionSupported(version));
    }

    return typeValidators[typeValidators.length - 1];
  }

  getSupportedVersions(agent: AgentId, componentType: ComponentType): string[] {
    const validator = this.getValidator(agent, componentType);
    return validator?.supportedVersions ?? [];
  }

  validate(
    content: string,
    agent: AgentId,
    componentType: ComponentType,
    options?: ValidatorOptions
  ): ValidationResult {
    const validator = this.getValidator(agent, componentType, options?.version);

    if (!validator) {
      return {
        valid: false,
        agent,
        componentType,
        version: options?.version ?? 'unknown',
        issues: [
          {
            code: 'VALIDATOR_NOT_FOUND',
            message: `No validator available for ${agent} ${componentType}`,
            severity: 'error',
          },
        ],
        warnings: [],
        info: [],
      };
    }

    return validator.validate(content, componentType, options);
  }
}

export const globalValidatorRegistry = new ValidatorRegistry();
