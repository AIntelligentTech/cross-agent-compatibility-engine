/**
 * CLI round-trip command - Convert A→B→A and measure semantic drift
 */

import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import type { AgentId } from '../core/types.js';
import { SUPPORTED_AGENTS } from '../core/constants.js';
import { parseComponent, detectAgent } from '../parsing/parser-factory.js';
import { transform } from '../transformation/transformer.js';
import { diffSpecs, formatDiffForDisplay } from '../core/diff.js';
import { formatAsJson } from '../core/output.js';

export interface RoundTripOptions {
  from?: AgentId;
  via: AgentId;
  json?: boolean;
  verbose?: boolean;
}

export interface RoundTripResult {
  success: boolean;
  fidelityScore?: number;
  identical?: boolean;
}

export function roundTripCommand(
  sourcePath: string,
  options: RoundTripOptions
): RoundTripResult {
  // Read source file
  let content: string;
  try {
    content = readFileSync(sourcePath, 'utf-8');
  } catch (err) {
    console.error(chalk.red(`Error reading file: ${sourcePath}`));
    console.error(chalk.gray(err instanceof Error ? err.message : String(err)));
    return { success: false };
  }

  // Detect source agent
  const sourceAgent = options.from ?? detectAgent(content, sourcePath);
  if (!sourceAgent) {
    console.error(chalk.red('Could not detect source agent type'));
    console.error(chalk.gray('Use --from <agent> to specify the source agent'));
    return { success: false };
  }

  if (!SUPPORTED_AGENTS.includes(sourceAgent)) {
    console.error(chalk.red(`Unsupported source agent: ${sourceAgent}`));
    return { success: false };
  }

  const viaAgent = options.via;
  if (!SUPPORTED_AGENTS.includes(viaAgent)) {
    console.error(chalk.red(`Unsupported via agent: ${viaAgent}`));
    return { success: false };
  }

  if (sourceAgent === viaAgent) {
    console.error(chalk.red('Source and via agents must be different'));
    return { success: false };
  }

  // Parse original
  const originalParse = parseComponent(content, {
    agentId: sourceAgent,
    sourceFile: sourcePath,
  });

  if (!originalParse.success || !originalParse.spec) {
    console.error(chalk.red('Failed to parse original:'));
    for (const err of originalParse.errors) {
      console.error(chalk.red(`  • ${err}`));
    }
    return { success: false };
  }

  const originalSpec = originalParse.spec;

  // Step 1: Convert source → via
  if (!options.json) {
    console.log(chalk.blue(`\nStep 1: ${sourceAgent} → ${viaAgent}`));
  }

  const toVia = transform(content, {
    sourceAgent,
    targetAgent: viaAgent,
    sourceFile: sourcePath,
  });

  if (!toVia.success || !toVia.output) {
    console.error(chalk.red(`Failed to convert to ${viaAgent}:`));
    for (const err of toVia.errors) {
      console.error(chalk.red(`  • ${err}`));
    }
    return { success: false };
  }

  if (!options.json && options.verbose) {
    console.log(chalk.gray(`  Fidelity: ${toVia.fidelityScore}%`));
    for (const w of toVia.warnings) {
      console.log(chalk.yellow(`  ⚠ ${w}`));
    }
  }

  // Step 2: Convert via → source
  if (!options.json) {
    console.log(chalk.blue(`Step 2: ${viaAgent} → ${sourceAgent}`));
  }

  const backToSource = transform(toVia.output, {
    sourceAgent: viaAgent,
    targetAgent: sourceAgent,
  });

  if (!backToSource.success || !backToSource.spec) {
    console.error(chalk.red(`Failed to convert back to ${sourceAgent}:`));
    for (const err of backToSource.errors) {
      console.error(chalk.red(`  • ${err}`));
    }
    return { success: false };
  }

  if (!options.json && options.verbose) {
    console.log(chalk.gray(`  Fidelity: ${backToSource.fidelityScore}%`));
    for (const w of backToSource.warnings) {
      console.log(chalk.yellow(`  ⚠ ${w}`));
    }
  }

  // Step 3: Compare original with round-tripped
  const diff = diffSpecs(originalSpec, backToSource.spec);

  // Calculate combined fidelity
  const combinedFidelity = Math.round(
    ((toVia.fidelityScore ?? 100) * (backToSource.fidelityScore ?? 100)) / 100
  );

  // Output results
  if (options.json) {
    console.log(formatAsJson({
      success: true,
      sourceAgent,
      viaAgent,
      originalId: originalSpec.id,
      roundTripId: backToSource.spec.id,
      step1Fidelity: toVia.fidelityScore,
      step2Fidelity: backToSource.fidelityScore,
      combinedFidelity,
      diff: {
        identical: diff.identical,
        overallSeverity: diff.overallSeverity,
        changedAspects: diff.changedAspects,
        preservedAspects: diff.preservedAspects,
        diffs: diff.diffs,
      },
    }));
  } else {
    console.log(chalk.bold('\n─── Round-Trip Results ───\n'));
    console.log(`  Path: ${sourceAgent} → ${viaAgent} → ${sourceAgent}`);
    console.log(`  Step 1 Fidelity: ${formatFidelity(toVia.fidelityScore ?? 100)}`);
    console.log(`  Step 2 Fidelity: ${formatFidelity(backToSource.fidelityScore ?? 100)}`);
    console.log(`  Combined Fidelity: ${formatFidelity(combinedFidelity)}`);
    console.log('');

    if (diff.identical) {
      console.log(chalk.green('✓ Round-trip produced semantically identical result'));
    } else {
      console.log(chalk.yellow(`⚠ Semantic drift detected (${diff.overallSeverity})`));
      console.log('');
      console.log(formatDiffForDisplay(diff, true));
    }
  }

  return {
    success: true,
    fidelityScore: combinedFidelity,
    identical: diff.identical,
  };
}

function formatFidelity(score: number): string {
  const formatted = `${score}%`;
  if (score >= 80) return chalk.green(formatted);
  if (score >= 60) return chalk.yellow(formatted);
  return chalk.red(formatted);
}
