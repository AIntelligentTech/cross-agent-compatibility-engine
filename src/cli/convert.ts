/**
 * CLI convert command
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, basename } from 'node:path';
import chalk from 'chalk';
import type { AgentId } from '../core/types.js';
import { SUPPORTED_AGENTS } from '../core/constants.js';
import { transform } from '../transformation/transformer.js';
import { getTargetPath } from '../rendering/renderer-factory.js';

export interface ConvertOptions {
  from?: AgentId;
  to: AgentId;
  output?: string;
  dryRun?: boolean;
  verbose?: boolean;
  includeComments?: boolean;
}

export function convertCommand(
  sourcePath: string,
  options: ConvertOptions
): { success: boolean; outputPath?: string } {
  // Validate target agent
  if (!SUPPORTED_AGENTS.includes(options.to)) {
    console.error(chalk.red(`Error: Unsupported target agent "${options.to}"`));
    console.error(chalk.gray(`Supported agents: ${SUPPORTED_AGENTS.join(', ')}`));
    return { success: false };
  }

  // Validate source agent if specified
  if (options.from && !SUPPORTED_AGENTS.includes(options.from)) {
    console.error(chalk.red(`Error: Unsupported source agent "${options.from}"`));
    console.error(chalk.gray(`Supported agents: ${SUPPORTED_AGENTS.join(', ')}`));
    return { success: false };
  }

  // Read source file
  let content: string;
  try {
    content = readFileSync(sourcePath, 'utf-8');
  } catch (err) {
    console.error(chalk.red(`Error reading file: ${sourcePath}`));
    console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
    return { success: false };
  }

  if (options.verbose) {
    console.log(chalk.blue(`Converting ${sourcePath} to ${options.to}...`));
  }

  // Transform
  const result = transform(content, {
    sourceAgent: options.from,
    targetAgent: options.to,
    sourceFile: sourcePath,
    includeComments: options.includeComments,
  });

  if (!result.success) {
    console.error(chalk.red('Conversion failed:'));
    for (const error of result.errors) {
      console.error(chalk.red(`  • ${error}`));
    }
    return { success: false };
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  ⚠ ${warning}`));
    }
  }

  // Determine output path
  let outputPath: string;
  if (options.output) {
    outputPath = options.output;
  } else if (result.spec) {
    const targetPath = getTargetPath(result.spec, options.to);
    outputPath = targetPath;
  } else {
    const baseName = basename(sourcePath, '.md');
    outputPath = `${baseName}-${options.to}.md`;
  }

  // Print fidelity score
  if (result.fidelityScore !== undefined) {
    const scoreColor = result.fidelityScore >= 80 ? chalk.green : 
                       result.fidelityScore >= 60 ? chalk.yellow : chalk.red;
    console.log(`\nFidelity score: ${scoreColor(result.fidelityScore + '%')}`);
  }

  if (options.dryRun) {
    console.log(chalk.cyan('\n--- DRY RUN OUTPUT ---'));
    console.log(chalk.gray(`Would write to: ${outputPath}`));
    console.log(chalk.cyan('--- BEGIN CONTENT ---'));
    console.log(result.output);
    console.log(chalk.cyan('--- END CONTENT ---'));
    return { success: true, outputPath };
  }

  // Write output
  try {
    const dir = dirname(outputPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(outputPath, result.output ?? '');
    console.log(chalk.green(`\n✓ Written to: ${outputPath}`));
    return { success: true, outputPath };
  } catch (err) {
    console.error(chalk.red(`Error writing file: ${outputPath}`));
    console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
    return { success: false };
  }
}

export function batchConvert(
  sourcePaths: string[],
  options: ConvertOptions
): { success: number; failed: number } {
  let success = 0;
  let failed = 0;

  for (const sourcePath of sourcePaths) {
    const result = convertCommand(sourcePath, options);
    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(chalk.blue(`\nBatch conversion complete: ${success} succeeded, ${failed} failed`));
  return { success, failed };
}

/**
 * Convert a single file (async version for programmatic use)
 */
export async function convertFile(
  sourcePath: string,
  options: ConvertOptions
): Promise<{ success: boolean; outputPath?: string }> {
  return Promise.resolve(convertCommand(sourcePath, options));
}
