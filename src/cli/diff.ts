/**
 * CLI diff command - Compare two components or show conversion diff
 */

import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import type { AgentId } from '../core/types.js';
import { SUPPORTED_AGENTS } from '../core/constants.js';
import { parseComponent, detectAgent } from '../parsing/parser-factory.js';
import { diffSpecs, formatDiffForDisplay } from '../core/diff.js';
import { formatAsJson } from '../core/output.js';

export interface DiffOptions {
  from?: AgentId;
  json?: boolean;
}

export function diffCommand(
  sourceA: string,
  sourceB: string,
  options: DiffOptions
): { success: boolean; identical: boolean } {
  // Read and parse first file
  const specA = loadAndParse(sourceA, options.from);
  if (!specA.success) {
    console.error(chalk.red(`Error with first file: ${sourceA}`));
    for (const err of specA.errors) {
      console.error(chalk.red(`  • ${err}`));
    }
    return { success: false, identical: false };
  }

  // Read and parse second file
  const specB = loadAndParse(sourceB, options.from);
  if (!specB.success) {
    console.error(chalk.red(`Error with second file: ${sourceB}`));
    for (const err of specB.errors) {
      console.error(chalk.red(`  • ${err}`));
    }
    return { success: false, identical: false };
  }

  // Compute diff
  const diff = diffSpecs(specA.spec!, specB.spec!);

  // Output
  if (options.json) {
    console.log(formatAsJson({
      diff,
      specA: { id: specA.spec!.id, agent: specA.spec!.sourceAgent?.id },
      specB: { id: specB.spec!.id, agent: specB.spec!.sourceAgent?.id },
    }));
  } else {
    console.log(chalk.bold(`\nComparing: ${sourceA} ↔ ${sourceB}\n`));
    console.log(formatDiffForDisplay(diff, true));
  }

  return { success: true, identical: diff.identical };
}

function loadAndParse(
  path: string,
  fromAgent?: AgentId
): { success: boolean; spec?: ReturnType<typeof parseComponent>['spec']; errors: string[] } {
  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (err) {
    return {
      success: false,
      errors: [`Could not read file: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const agent = fromAgent ?? detectAgent(content, path);
  if (!agent) {
    return {
      success: false,
      errors: ['Could not detect agent type. Use --from <agent> to specify.'],
    };
  }

  if (!SUPPORTED_AGENTS.includes(agent)) {
    return {
      success: false,
      errors: [`Unsupported agent: ${agent}`],
    };
  }

  const result = parseComponent(content, { agentId: agent, sourceFile: path });
  if (!result.success || !result.spec) {
    return {
      success: false,
      errors: result.errors,
    };
  }

  return { success: true, spec: result.spec, errors: [] };
}
