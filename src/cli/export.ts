/**
 * CLI export command - Export ComponentSpec as JSON for debugging or manual editing
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import chalk from 'chalk';
import type { AgentId } from '../core/types.js';
import { SUPPORTED_AGENTS } from '../core/constants.js';
import { parseComponent, detectAgent } from '../parsing/parser-factory.js';
import { formatAsJson } from '../core/output.js';

export interface ExportOptions {
  from?: AgentId;
  output?: string;
  pretty?: boolean;
}

export function exportCommand(
  sourcePath: string,
  options: ExportOptions
): { success: boolean; outputPath?: string } {
  // Read source file
  let content: string;
  try {
    content = readFileSync(sourcePath, 'utf-8');
  } catch (err) {
    console.error(chalk.red(`Error reading file: ${sourcePath}`));
    console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
    return { success: false };
  }

  // Detect agent
  const detectedAgent = options.from ?? detectAgent(content, sourcePath);

  if (!detectedAgent) {
    console.error(chalk.red('Could not detect agent type'));
    console.error(chalk.gray('Use --from <agent> to specify the source agent'));
    return { success: false };
  }

  if (!SUPPORTED_AGENTS.includes(detectedAgent)) {
    console.error(chalk.red(`Unsupported agent: ${detectedAgent}`));
    return { success: false };
  }

  // Parse the component
  const parseResult = parseComponent(content, {
    agentId: detectedAgent,
    sourceFile: sourcePath,
  });

  if (!parseResult.success || !parseResult.spec) {
    console.error(chalk.red('Parse errors:'));
    for (const error of parseResult.errors) {
      console.error(chalk.red(`  • ${error}`));
    }
    return { success: false };
  }

  // Format as JSON
  const jsonOutput = options.pretty !== false
    ? formatAsJson(parseResult.spec)
    : JSON.stringify(parseResult.spec);

  // Output
  if (options.output) {
    try {
      const dir = dirname(options.output);
      mkdirSync(dir, { recursive: true });
      writeFileSync(options.output, jsonOutput + '\n');
      console.log(chalk.green(`✓ Exported to: ${options.output}`));
      return { success: true, outputPath: options.output };
    } catch (err) {
      console.error(chalk.red(`Error writing file: ${options.output}`));
      console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
      return { success: false };
    }
  } else {
    console.log(jsonOutput);
    return { success: true };
  }
}

export interface ImportOptions {
  to: AgentId;
  output?: string;
  dryRun?: boolean;
}

export function importCommand(
  sourcePath: string,
  options: ImportOptions
): { success: boolean; outputPath?: string } {
  // Read JSON file
  let content: string;
  try {
    content = readFileSync(sourcePath, 'utf-8');
  } catch (err) {
    console.error(chalk.red(`Error reading file: ${sourcePath}`));
    console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
    return { success: false };
  }

  // Parse JSON
  let spec: unknown;
  try {
    spec = JSON.parse(content);
  } catch (err) {
    console.error(chalk.red('Invalid JSON:'));
    console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
    return { success: false };
  }

  // Validate it's a ComponentSpec (basic check)
  if (!spec || typeof spec !== 'object' || !('id' in spec) || !('body' in spec)) {
    console.error(chalk.red('Invalid ComponentSpec: missing required fields (id, body)'));
    return { success: false };
  }

  // Import the rendering module dynamically to avoid circular deps
  const { renderComponent, getTargetPath } = require('../rendering/renderer-factory.js');

  // Render to target agent
  const renderResult = renderComponent(spec, options.to);

  if (!renderResult.success) {
    console.error(chalk.red('Render errors:'));
    for (const error of renderResult.errors) {
      console.error(chalk.red(`  • ${error}`));
    }
    return { success: false };
  }

  // Determine output path
  const outputPath = options.output ?? getTargetPath(spec, options.to);

  if (options.dryRun) {
    console.log(chalk.cyan('--- DRY RUN OUTPUT ---'));
    console.log(chalk.gray(`Would write to: ${outputPath}`));
    console.log(chalk.cyan('--- BEGIN CONTENT ---'));
    console.log(renderResult.content);
    console.log(chalk.cyan('--- END CONTENT ---'));
    return { success: true, outputPath };
  }

  // Write output
  try {
    const dir = dirname(outputPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(outputPath, renderResult.content ?? '');
    console.log(chalk.green(`✓ Imported to: ${outputPath}`));
    return { success: true, outputPath };
  } catch (err) {
    console.error(chalk.red(`Error writing file: ${outputPath}`));
    console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
    return { success: false };
  }
}
