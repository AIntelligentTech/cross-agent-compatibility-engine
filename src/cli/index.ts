#!/usr/bin/env node
/**
 * Cross-Agent Compatibility Engine CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { AgentId } from '../core/types.js';
import { SUPPORTED_AGENTS, AGENTS } from '../core/constants.js';
import { convertCommand, batchConvert } from './convert.js';
import { validateCommand, batchValidate } from './validate.js';
import { getCompatibilityMatrix } from '../transformation/capability-mapper.js';

const program = new Command();

program
  .name('cace')
  .description('Cross-Agent Compatibility Engine - Convert agent components between Claude, Windsurf, and Cursor')
  .version('0.1.0');

// Convert command
program
  .command('convert <source>')
  .description('Convert a component from one agent format to another')
  .requiredOption('-t, --to <agent>', `Target agent (${SUPPORTED_AGENTS.join(', ')})`)
  .option('-f, --from <agent>', 'Source agent (auto-detected if not specified)')
  .option('-o, --output <path>', 'Output file path')
  .option('-d, --dry-run', 'Print output without writing file')
  .option('-v, --verbose', 'Verbose output')
  .option('-c, --comments', 'Include conversion comments in output')
  .action((source: string, options: {
    to: string;
    from?: string;
    output?: string;
    dryRun?: boolean;
    verbose?: boolean;
    comments?: boolean;
  }) => {
    const result = convertCommand(source, {
      to: options.to as AgentId,
      from: options.from as AgentId | undefined,
      output: options.output,
      dryRun: options.dryRun,
      verbose: options.verbose,
      includeComments: options.comments,
    });
    
    process.exit(result.success ? 0 : 1);
  });

// Validate command
program
  .command('validate <source>')
  .description('Validate a component file')
  .option('-f, --from <agent>', 'Source agent (auto-detected if not specified)')
  .option('-v, --verbose', 'Verbose output')
  .option('-s, --strict', 'Strict validation mode')
  .action((source: string, options: {
    from?: string;
    verbose?: boolean;
    strict?: boolean;
  }) => {
    const result = validateCommand(source, {
      from: options.from as AgentId | undefined,
      verbose: options.verbose,
      strict: options.strict,
    });
    
    process.exit(result.valid ? 0 : 1);
  });

// Batch convert command
program
  .command('batch-convert <sources...>')
  .description('Convert multiple component files')
  .requiredOption('-t, --to <agent>', `Target agent (${SUPPORTED_AGENTS.join(', ')})`)
  .option('-f, --from <agent>', 'Source agent (auto-detected if not specified)')
  .option('-d, --dry-run', 'Print output without writing files')
  .option('-c, --comments', 'Include conversion comments in output')
  .action((sources: string[], options: {
    to: string;
    from?: string;
    dryRun?: boolean;
    comments?: boolean;
  }) => {
    const result = batchConvert(sources, {
      to: options.to as AgentId,
      from: options.from as AgentId | undefined,
      dryRun: options.dryRun,
      includeComments: options.comments,
    });
    
    process.exit(result.failed > 0 ? 1 : 0);
  });

// Batch validate command
program
  .command('batch-validate <sources...>')
  .description('Validate multiple component files')
  .option('-f, --from <agent>', 'Source agent (auto-detected if not specified)')
  .option('-s, --strict', 'Strict validation mode')
  .action((sources: string[], options: {
    from?: string;
    strict?: boolean;
  }) => {
    const result = batchValidate(sources, {
      from: options.from as AgentId | undefined,
      strict: options.strict,
    });
    
    process.exit(result.invalid > 0 ? 1 : 0);
  });

// List agents command
program
  .command('agents')
  .description('List supported agents and their component types')
  .action(() => {
    console.log(chalk.blue('\nSupported Agents:\n'));
    
    for (const agentId of SUPPORTED_AGENTS) {
      const agent = AGENTS[agentId];
      console.log(chalk.green(`  ${agent.displayName} (${agentId})`));
      console.log(chalk.gray(`    Component types: ${agent.componentTypes.join(', ')}`));
      console.log(chalk.gray(`    Project location: ${agent.configLocations.project}`));
      console.log();
    }
  });

// Compatibility matrix command
program
  .command('matrix')
  .description('Show compatibility matrix between agents')
  .action(() => {
    const matrix = getCompatibilityMatrix();
    
    console.log(chalk.blue('\nCompatibility Matrix (estimated fidelity %):\n'));
    
    // Header
    const header = ['From \\ To', ...SUPPORTED_AGENTS].map(s => s.padEnd(10)).join(' ');
    console.log(chalk.bold(header));
    console.log('-'.repeat(header.length));
    
    // Rows
    for (const source of SUPPORTED_AGENTS) {
      const row = [source.padEnd(10)];
      for (const target of SUPPORTED_AGENTS) {
        const score = matrix[source]?.[target] ?? 0;
        const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
        row.push(color(String(score).padEnd(10)));
      }
      console.log(row.join(' '));
    }
    
    console.log();
    console.log(chalk.gray('Note: Scores are estimates based on feature mapping analysis.'));
    console.log(chalk.gray('Actual fidelity depends on specific component features used.'));
  });

// Parse and execute
program.parse();
