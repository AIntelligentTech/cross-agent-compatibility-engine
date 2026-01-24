/**
 * CLI validate command
 */

import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import type { AgentId } from '../core/types.js';
import { SUPPORTED_AGENTS } from '../core/constants.js';
import { parseComponent, detectAgent } from '../parsing/parser-factory.js';
import { validateComponentSpec } from '../core/schema.js';

export interface ValidateOptions {
  from?: AgentId;
  verbose?: boolean;
  strict?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  detectedAgent?: AgentId;
  componentId?: string;
  componentType?: string;
}

export function validateCommand(
  sourcePath: string,
  options: ValidateOptions
): ValidationResult {
  // Read source file
  let content: string;
  try {
    content = readFileSync(sourcePath, 'utf-8');
  } catch (err) {
    console.error(chalk.red(`Error reading file: ${sourcePath}`));
    console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
    return { valid: false, errors: [`Could not read file: ${sourcePath}`], warnings: [] };
  }

  // Detect agent
  const detectedAgent = options.from ?? detectAgent(content, sourcePath);
  
  if (!detectedAgent) {
    console.error(chalk.red('Could not detect agent type'));
    console.error(chalk.gray('Use --from <agent> to specify the source agent'));
    return { valid: false, errors: ['Could not detect agent type'], warnings: [] };
  }

  if (!SUPPORTED_AGENTS.includes(detectedAgent)) {
    console.error(chalk.red(`Unsupported agent: ${detectedAgent}`));
    return { valid: false, errors: [`Unsupported agent: ${detectedAgent}`], warnings: [] };
  }

  if (options.verbose) {
    console.log(chalk.blue(`Validating ${sourcePath} as ${detectedAgent} component...`));
  }

  // Parse the component
  const parseResult = parseComponent(content, {
    agentId: detectedAgent,
    sourceFile: sourcePath,
    strict: options.strict,
  });

  if (!parseResult.success || !parseResult.spec) {
    console.error(chalk.red('Parse errors:'));
    for (const error of parseResult.errors) {
      console.error(chalk.red(`  • ${error}`));
    }
    return {
      valid: false,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      detectedAgent,
    };
  }

  // Validate against schema
  const schemaResult = validateComponentSpec(parseResult.spec);
  
  if (!schemaResult.valid) {
    console.error(chalk.red('Schema validation errors:'));
    for (const error of schemaResult.errors) {
      console.error(chalk.red(`  • ${error}`));
    }
    return {
      valid: false,
      errors: schemaResult.errors,
      warnings: parseResult.warnings,
      detectedAgent,
      componentId: parseResult.spec.id,
      componentType: parseResult.spec.componentType,
    };
  }

  // Print warnings
  if (parseResult.warnings.length > 0) {
    console.log(chalk.yellow('Warnings:'));
    for (const warning of parseResult.warnings) {
      console.log(chalk.yellow(`  ⚠ ${warning}`));
    }
  }

  // Success output
  console.log(chalk.green(`✓ Valid ${detectedAgent} ${parseResult.spec.componentType}: ${parseResult.spec.id}`));
  
  if (options.verbose) {
    console.log(chalk.gray('\nComponent details:'));
    console.log(chalk.gray(`  ID: ${parseResult.spec.id}`));
    console.log(chalk.gray(`  Type: ${parseResult.spec.componentType}`));
    console.log(chalk.gray(`  Summary: ${parseResult.spec.intent.summary}`));
    console.log(chalk.gray(`  Activation: ${parseResult.spec.activation.mode}`));
    console.log(chalk.gray(`  Safety: ${parseResult.spec.activation.safetyLevel}`));
    
    if (parseResult.spec.category && parseResult.spec.category.length > 0) {
      console.log(chalk.gray(`  Categories: ${parseResult.spec.category.join(', ')}`));
    }
  }

  return {
    valid: true,
    errors: [],
    warnings: parseResult.warnings,
    detectedAgent,
    componentId: parseResult.spec.id,
    componentType: parseResult.spec.componentType,
  };
}

export function batchValidate(
  sourcePaths: string[],
  options: ValidateOptions
): { valid: number; invalid: number } {
  let valid = 0;
  let invalid = 0;

  for (const sourcePath of sourcePaths) {
    const result = validateCommand(sourcePath, { ...options, verbose: false });
    if (result.valid) {
      valid++;
    } else {
      invalid++;
    }
  }

  console.log(chalk.blue(`\nBatch validation complete: ${valid} valid, ${invalid} invalid`));
  return { valid, invalid };
}
