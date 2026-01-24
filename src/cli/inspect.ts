/**
 * CLI inspect command - Deep inspection of a component
 */

import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import type { AgentId } from '../core/types.js';
import { SUPPORTED_AGENTS } from '../core/constants.js';
import { parseComponent, detectAgent } from '../parsing/parser-factory.js';
import { formatInspect, analyzeSpec, formatAsJson, type OutputOptions } from '../core/output.js';

export interface InspectOptions {
  from?: AgentId;
  json?: boolean;
  verbose?: boolean;
}

export function inspectCommand(
  sourcePath: string,
  options: InspectOptions
): { success: boolean } {
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

  // Analyze the spec
  const analysis = analyzeSpec(parseResult.spec);

  // Format output
  const outputOptions: OutputOptions = {
    format: options.json ? 'json' : 'text',
    color: !options.json,
    verbose: options.verbose ?? false,
  };

  if (options.json) {
    console.log(formatAsJson({ spec: parseResult.spec, analysis }));
  } else {
    console.log(formatInspect({ spec: parseResult.spec, analysis }, outputOptions));
  }

  return { success: true };
}
