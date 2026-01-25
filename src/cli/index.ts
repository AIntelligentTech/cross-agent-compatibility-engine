#!/usr/bin/env node
/**
 * Cross-Agent Compatibility Engine CLI
 */

import { Command } from "commander";
import chalk from "chalk";
import type { AgentId } from "../core/types.js";
import { SUPPORTED_AGENTS, AGENTS } from "../core/constants.js";
import { convertCommand, batchConvert } from "./convert.js";
import { validateCommand, batchValidate } from "./validate.js";
import { inspectCommand } from "./inspect.js";
import { diffCommand } from "./diff.js";
import { roundTripCommand } from "./roundtrip.js";
import { exportCommand, importCommand } from "./export.js";
import { getCompatibilityMatrix } from "../transformation/capability-mapper.js";
import {
  versionDetectCommand,
  versionListCommand,
  migrationGuideCommand,
  breakingChangesCommand,
  featureCheckCommand,
  analyzeMigrationCommand,
} from "./version.js";

const program = new Command();

program
  .name("cace")
  .description(
    "Cross-Agent Compatibility Engine - Convert agent components between Claude, Windsurf, and Cursor",
  )
  .version("0.1.0");

// Convert command
program
  .command("convert <source>")
  .description("Convert a component from one agent format to another")
  .requiredOption(
    "-t, --to <agent>",
    `Target agent (${SUPPORTED_AGENTS.join(", ")})`,
  )
  .option("-f, --from <agent>", "Source agent (auto-detected if not specified)")
  .option("-o, --output <path>", "Output file path")
  .option("-d, --dry-run", "Print output without writing file")
  .option("-v, --verbose", "Verbose output")
  .option("-c, --comments", "Include conversion comments in output")
  .action(
    (
      source: string,
      options: {
        to: string;
        from?: string;
        output?: string;
        dryRun?: boolean;
        verbose?: boolean;
        comments?: boolean;
      },
    ) => {
      const result = convertCommand(source, {
        to: options.to as AgentId,
        from: options.from as AgentId | undefined,
        output: options.output,
        dryRun: options.dryRun,
        verbose: options.verbose,
        includeComments: options.comments,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// Validate command
program
  .command("validate <source>")
  .description("Validate a component file")
  .option("-f, --from <agent>", "Source agent (auto-detected if not specified)")
  .option("-v, --verbose", "Verbose output")
  .option("-s, --strict", "Strict validation mode")
  .action(
    (
      source: string,
      options: {
        from?: string;
        verbose?: boolean;
        strict?: boolean;
      },
    ) => {
      const result = validateCommand(source, {
        from: options.from as AgentId | undefined,
        verbose: options.verbose,
        strict: options.strict,
      });

      process.exit(result.valid ? 0 : 1);
    },
  );

// Batch convert command
program
  .command("batch-convert <sources...>")
  .description("Convert multiple component files")
  .requiredOption(
    "-t, --to <agent>",
    `Target agent (${SUPPORTED_AGENTS.join(", ")})`,
  )
  .option("-f, --from <agent>", "Source agent (auto-detected if not specified)")
  .option("-d, --dry-run", "Print output without writing files")
  .option("-c, --comments", "Include conversion comments in output")
  .action(
    (
      sources: string[],
      options: {
        to: string;
        from?: string;
        dryRun?: boolean;
        comments?: boolean;
      },
    ) => {
      const result = batchConvert(sources, {
        to: options.to as AgentId,
        from: options.from as AgentId | undefined,
        dryRun: options.dryRun,
        includeComments: options.comments,
      });

      process.exit(result.failed > 0 ? 1 : 0);
    },
  );

// Batch validate command
program
  .command("batch-validate <sources...>")
  .description("Validate multiple component files")
  .option("-f, --from <agent>", "Source agent (auto-detected if not specified)")
  .option("-s, --strict", "Strict validation mode")
  .action(
    (
      sources: string[],
      options: {
        from?: string;
        strict?: boolean;
      },
    ) => {
      const result = batchValidate(sources, {
        from: options.from as AgentId | undefined,
        strict: options.strict,
      });

      process.exit(result.invalid > 0 ? 1 : 0);
    },
  );

// List agents command
program
  .command("agents")
  .description("List supported agents and their component types")
  .action(() => {
    console.log(chalk.blue("\nSupported Agents:\n"));

    for (const agentId of SUPPORTED_AGENTS) {
      const agent = AGENTS[agentId];
      console.log(chalk.green(`  ${agent.displayName} (${agentId})`));
      console.log(
        chalk.gray(`    Component types: ${agent.componentTypes.join(", ")}`),
      );
      console.log(
        chalk.gray(`    Project location: ${agent.configLocations.project}`),
      );
      console.log();
    }
  });

// Compatibility matrix command
program
  .command("matrix")
  .description("Show compatibility matrix between agents")
  .action(() => {
    const matrix = getCompatibilityMatrix();

    console.log(chalk.blue("\nCompatibility Matrix (estimated fidelity %):\n"));

    // Header
    const header = ["From \\ To", ...SUPPORTED_AGENTS]
      .map((s) => s.padEnd(10))
      .join(" ");
    console.log(chalk.bold(header));
    console.log("-".repeat(header.length));

    // Rows
    for (const source of SUPPORTED_AGENTS) {
      const row = [source.padEnd(10)];
      for (const target of SUPPORTED_AGENTS) {
        const score = matrix[source]?.[target] ?? 0;
        const color =
          score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
        row.push(color(String(score).padEnd(10)));
      }
      console.log(row.join(" "));
    }

    console.log();
    console.log(
      chalk.gray(
        "Note: Scores are estimates based on feature mapping analysis.",
      ),
    );
    console.log(
      chalk.gray(
        "Actual fidelity depends on specific component features used.",
      ),
    );
  });

// Inspect command
program
  .command("inspect <source>")
  .description(
    "Deep inspection of a component showing all IR fields and capabilities",
  )
  .option("-f, --from <agent>", "Source agent (auto-detected if not specified)")
  .option("-j, --json", "Output as JSON")
  .option("-v, --verbose", "Include conversion compatibility details")
  .action(
    (
      source: string,
      options: {
        from?: string;
        json?: boolean;
        verbose?: boolean;
      },
    ) => {
      const result = inspectCommand(source, {
        from: options.from as AgentId | undefined,
        json: options.json,
        verbose: options.verbose,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// Diff command
program
  .command("diff <sourceA> <sourceB>")
  .description("Compare two components and show semantic differences")
  .option(
    "-f, --from <agent>",
    "Source agent for both files (auto-detected if not specified)",
  )
  .option("-j, --json", "Output as JSON")
  .action(
    (
      sourceA: string,
      sourceB: string,
      options: {
        from?: string;
        json?: boolean;
      },
    ) => {
      const result = diffCommand(sourceA, sourceB, {
        from: options.from as AgentId | undefined,
        json: options.json,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// Round-trip command
program
  .command("round-trip <source>")
  .description("Convert A→B→A and measure semantic drift")
  .requiredOption(
    "--via <agent>",
    `Intermediate agent to convert through (${SUPPORTED_AGENTS.join(", ")})`,
  )
  .option("-f, --from <agent>", "Source agent (auto-detected if not specified)")
  .option("-j, --json", "Output as JSON")
  .option("-v, --verbose", "Show detailed conversion info")
  .action(
    (
      source: string,
      options: {
        via: string;
        from?: string;
        json?: boolean;
        verbose?: boolean;
      },
    ) => {
      const result = roundTripCommand(source, {
        via: options.via as AgentId,
        from: options.from as AgentId | undefined,
        json: options.json,
        verbose: options.verbose,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// Export command
program
  .command("export <source>")
  .description("Export a component as JSON (ComponentSpec IR)")
  .option("-f, --from <agent>", "Source agent (auto-detected if not specified)")
  .option(
    "-o, --output <path>",
    "Output file path (prints to stdout if not specified)",
  )
  .action(
    (
      source: string,
      options: {
        from?: string;
        output?: string;
      },
    ) => {
      const result = exportCommand(source, {
        from: options.from as AgentId | undefined,
        output: options.output,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// Import command
program
  .command("import <source>")
  .description("Import a ComponentSpec JSON and render to target agent format")
  .requiredOption(
    "-t, --to <agent>",
    `Target agent (${SUPPORTED_AGENTS.join(", ")})`,
  )
  .option("-o, --output <path>", "Output file path")
  .option("-d, --dry-run", "Print output without writing file")
  .action(
    (
      source: string,
      options: {
        to: string;
        output?: string;
        dryRun?: boolean;
      },
    ) => {
      const result = importCommand(source, {
        to: options.to as AgentId,
        output: options.output,
        dryRun: options.dryRun,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// Version subcommand group
const versionCmd = program
  .command("version")
  .description("Version awareness commands");

// version detect
versionCmd
  .command("detect <source>")
  .description("Detect the version of a component file")
  .option("-f, --from <agent>", "Source agent (auto-detected if not specified)")
  .option("-j, --json", "Output as JSON")
  .action(
    async (
      source: string,
      options: {
        from?: string;
        json?: boolean;
      },
    ) => {
      const result = await versionDetectCommand(source, {
        from: options.from as AgentId | undefined,
        json: options.json,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// version list
versionCmd
  .command("list")
  .description("List available versions for an agent")
  .option("-a, --agent <agent>", "Filter by agent")
  .option("-j, --json", "Output as JSON")
  .action((options: { agent?: string; json?: boolean }) => {
    const result = versionListCommand({
      agent: options.agent as AgentId | undefined,
      json: options.json,
    });

    process.exit(result.success ? 0 : 1);
  });

// version migration-guide
versionCmd
  .command("migration-guide <agent>")
  .description("Generate migration guide between versions")
  .requiredOption("--from <version>", "Source version")
  .option("--to <version>", "Target version (defaults to current)")
  .option("-j, --json", "Output as JSON")
  .option("-m, --markdown", "Output as Markdown")
  .option("-o, --output <path>", "Output file path")
  .action(
    (
      agent: string,
      options: {
        from: string;
        to?: string;
        json?: boolean;
        markdown?: boolean;
        output?: string;
      },
    ) => {
      const result = migrationGuideCommand(agent as AgentId, {
        from: options.from,
        to: options.to,
        json: options.json,
        markdown: options.markdown,
        output: options.output,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// version breaking-changes
versionCmd
  .command("breaking-changes <agent>")
  .description("List breaking changes between versions")
  .requiredOption("--from <version>", "Source version")
  .option("--to <version>", "Target version (defaults to current)")
  .option("-j, --json", "Output as JSON")
  .action(
    (
      agent: string,
      options: {
        from: string;
        to?: string;
        json?: boolean;
      },
    ) => {
      const result = breakingChangesCommand(agent as AgentId, {
        from: options.from,
        to: options.to,
        json: options.json,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// version feature-check
versionCmd
  .command("feature-check <agent> <feature>")
  .description("Check if a feature is available in a version")
  .option("-v, --version <version>", "Version to check (defaults to current)")
  .option("-j, --json", "Output as JSON")
  .action(
    (
      agent: string,
      feature: string,
      options: {
        version?: string;
        json?: boolean;
      },
    ) => {
      const result = featureCheckCommand(agent as AgentId, feature, {
        version: options.version,
        json: options.json,
      });

      process.exit(result.success ? 0 : 1);
    },
  );

// version analyze
versionCmd
  .command("analyze <agent> <fromVersion> <toVersion>")
  .description("Analyze migration path between versions")
  .option("-j, --json", "Output as JSON")
  .action(
    (
      agent: string,
      fromVersion: string,
      toVersion: string,
      options: {
        json?: boolean;
      },
    ) => {
      const result = analyzeMigrationCommand(
        agent as AgentId,
        fromVersion,
        toVersion,
        {
          json: options.json,
        },
      );

      process.exit(result.success ? 0 : 1);
    },
  );

// Parse and execute
program.parse();
