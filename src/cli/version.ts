/**
 * Version-related CLI commands
 */

import fs from "fs";
import chalk from "chalk";
import type { AgentId } from "../core/types.js";
import { SUPPORTED_AGENTS, AGENTS } from "../core/constants.js";
import { detectVersion } from "../versioning/version-detector.js";
import {
  getAgentVersions,
  getCurrentVersion,
  getBreakingChangesBetween,
  isFeatureAvailable,
  getAgentFeatures,
} from "../versioning/version-catalog.js";
import {
  generateMigrationGuide,
  formatMigrationGuideAsMarkdown,
  formatMigrationGuideForCli,
  analyzeMigrationPath,
} from "../versioning/migration-guide.js";
import type { MigrationGuide } from "../versioning/types.js";

interface VersionDetectOptions {
  from?: AgentId;
  json?: boolean;
}

interface VersionDetectResult {
  success: boolean;
  agent?: AgentId;
  version?: string;
  confidence?: number;
  matchedMarkers?: string[];
  isDefinitive?: boolean;
}

/**
 * Detect the version of a component file
 */
export function versionDetectCommand(
  source: string,
  options: VersionDetectOptions,
): VersionDetectResult {
  // Read the file
  let content: string;
  try {
    content = fs.readFileSync(source, "utf-8");
  } catch (err) {
    console.error(
      chalk.red(
        `Error reading file: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    return { success: false };
  }

  // Determine agent
  let agent = options.from;
  if (!agent) {
    // Auto-detect agent from file path or content
    for (const agentId of SUPPORTED_AGENTS) {
      const agentConfig = AGENTS[agentId];
      if (source.includes(agentConfig.configLocations.project)) {
        agent = agentId;
        break;
      }
    }
    if (!agent) {
      console.error(
        chalk.red("Could not detect agent. Use --from to specify."),
      );
      return { success: false };
    }
  }

  // Detect version
  const result = detectVersion(agent, content, source);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          agent,
          ...result,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      chalk.blue(`\nVersion Detection for ${AGENTS[agent].displayName}:\n`),
    );
    console.log(
      chalk.green(`  Version: ${result.version}`) +
        (result.isDefinitive
          ? chalk.gray(" (definitive)")
          : chalk.yellow(` (confidence: ${result.confidence}%)`)),
    );

    if (result.matchedMarkers.length > 0) {
      console.log(chalk.gray(`\n  Matched markers:`));
      for (const marker of result.matchedMarkers) {
        console.log(chalk.gray(`    - ${marker}`));
      }
    }
    console.log();
  }

  return {
    success: true,
    agent,
    version: result.version,
    confidence: result.confidence,
    matchedMarkers: result.matchedMarkers,
    isDefinitive: result.isDefinitive,
  };
}

interface VersionListOptions {
  agent?: AgentId;
  json?: boolean;
}

interface VersionListResult {
  success: boolean;
}

/**
 * List available versions for an agent
 */
export function versionListCommand(
  options: VersionListOptions,
): VersionListResult {
  const agents = options.agent ? [options.agent] : SUPPORTED_AGENTS;

  if (options.json) {
    const data: Record<string, unknown> = {};
    for (const agentId of agents) {
      const versions = getAgentVersions(agentId);
      const current = getCurrentVersion(agentId);
      const features = getAgentFeatures(agentId);
      data[agentId] = {
        currentVersion: current?.version,
        versions: versions.map((v) => ({
          version: v.version,
          releaseDate: v.releaseDate,
          featuresIntroduced: v.featuresIntroduced,
          breakingChanges: v.breakingChanges.length,
        })),
        totalFeatures: features.length,
      };
    }
    console.log(JSON.stringify(data, null, 2));
  } else {
    for (const agentId of agents) {
      const versions = getAgentVersions(agentId);
      const current = getCurrentVersion(agentId);
      const features = getAgentFeatures(agentId);

      console.log(chalk.blue(`\n${AGENTS[agentId].displayName} Versions:\n`));
      console.log(chalk.gray(`  Current: ${current?.version ?? "unknown"}\n`));

      for (const version of versions) {
        const isCurrent = version.isCurrent;
        const versionLabel = isCurrent
          ? chalk.green(`  ${version.version} (current)`)
          : chalk.white(`  ${version.version}`);

        console.log(versionLabel);
        if (version.releaseDate) {
          console.log(chalk.gray(`    Released: ${version.releaseDate}`));
        }
        console.log(
          chalk.gray(
            `    Features introduced: ${version.featuresIntroduced.length}`,
          ),
        );
        if (version.breakingChanges.length > 0) {
          console.log(
            chalk.yellow(
              `    Breaking changes: ${version.breakingChanges.length}`,
            ),
          );
        }
        console.log();
      }
      console.log(chalk.gray(`  Total features: ${features.length}`));
    }
  }

  return { success: true };
}

interface MigrationGuideOptions {
  from?: string;
  to?: string;
  json?: boolean;
  markdown?: boolean;
  output?: string;
}

interface MigrationGuideResult {
  success: boolean;
  guide?: MigrationGuide;
}

/**
 * Generate migration guide between versions
 */
export function migrationGuideCommand(
  agent: AgentId,
  options: MigrationGuideOptions,
): MigrationGuideResult {
  const fromVersion = options.from;
  const current = getCurrentVersion(agent);
  const toVersion = options.to ?? current?.version ?? "latest";

  if (!fromVersion) {
    console.error(chalk.red("Error: --from version is required"));
    return { success: false };
  }

  const guide = generateMigrationGuide(agent, fromVersion, toVersion);

  if (!guide) {
    console.error(chalk.red(`Error: Could not generate migration guide`));
    return { success: false };
  }

  if (options.json) {
    const output = JSON.stringify(guide, null, 2);
    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.log(chalk.green(`Migration guide written to ${options.output}`));
    } else {
      console.log(output);
    }
  } else if (options.markdown) {
    const output = formatMigrationGuideAsMarkdown(guide);
    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.log(chalk.green(`Migration guide written to ${options.output}`));
    } else {
      console.log(output);
    }
  } else {
    console.log(formatMigrationGuideForCli(guide));
  }

  return { success: true, guide };
}

interface BreakingChangesOptions {
  from?: string;
  to?: string;
  json?: boolean;
}

interface BreakingChangesResult {
  success: boolean;
}

/**
 * List breaking changes between versions
 */
export function breakingChangesCommand(
  agent: AgentId,
  options: BreakingChangesOptions,
): BreakingChangesResult {
  const fromVersion = options.from;
  const current = getCurrentVersion(agent);
  const toVersion = options.to ?? current?.version ?? "latest";

  if (!fromVersion) {
    console.error(chalk.red("Error: --from version is required"));
    return { success: false };
  }

  const breakingChanges = getBreakingChangesBetween(
    agent,
    fromVersion,
    toVersion,
  );

  if (options.json) {
    console.log(JSON.stringify(breakingChanges, null, 2));
  } else {
    console.log(
      chalk.blue(
        `\nBreaking Changes: ${AGENTS[agent].displayName} ${fromVersion} → ${toVersion}\n`,
      ),
    );

    if (breakingChanges.length === 0) {
      console.log(chalk.green("  No breaking changes found."));
    } else {
      for (const change of breakingChanges) {
        console.log(
          `  ${chalk.yellow(`[${change.type.toUpperCase()}]`)} ${change.description}`,
        );
        console.log(chalk.gray(`    Version: ${change.version}`));
        console.log(chalk.cyan(`    Migration: ${change.migration}`));
        console.log();
      }
    }
  }

  return { success: true };
}

interface FeatureCheckOptions {
  version?: string;
  json?: boolean;
}

interface FeatureCheckResult {
  success: boolean;
  available?: boolean;
}

/**
 * Check if a feature is available in a version
 */
export function featureCheckCommand(
  agent: AgentId,
  feature: string,
  options: FeatureCheckOptions,
): FeatureCheckResult {
  const current = getCurrentVersion(agent);
  const version = options.version ?? current?.version ?? "1.0";
  const available = isFeatureAvailable(agent, feature, version);

  if (options.json) {
    console.log(
      JSON.stringify({ agent, feature, version, available }, null, 2),
    );
  } else {
    const status = available
      ? chalk.green("AVAILABLE")
      : chalk.red("NOT AVAILABLE");
    console.log(
      `\nFeature "${feature}" in ${AGENTS[agent].displayName} ${version}: ${status}\n`,
    );
  }

  return { success: true, available };
}

interface AnalyzeMigrationOptions {
  json?: boolean;
}

interface AnalyzeMigrationResult {
  success: boolean;
}

/**
 * Analyze migration path between versions
 */
export function analyzeMigrationCommand(
  agent: AgentId,
  fromVersion: string,
  toVersion: string,
  options: AnalyzeMigrationOptions,
): AnalyzeMigrationResult {
  const analysis = analyzeMigrationPath(agent, fromVersion, toVersion);

  if (options.json) {
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    console.log(
      chalk.blue(
        `\nMigration Analysis: ${AGENTS[agent].displayName} ${fromVersion} → ${toVersion}\n`,
      ),
    );

    // Complexity
    const complexityColor =
      analysis.complexity === "low"
        ? chalk.green
        : analysis.complexity === "medium"
          ? chalk.yellow
          : chalk.red;
    console.log(`  Complexity: ${complexityColor(analysis.complexity)}`);

    // Effort
    console.log(chalk.gray(`  Estimated effort: ${analysis.estimatedEffort}`));

    // Breaking changes count
    console.log(chalk.gray(`  Breaking changes: ${analysis.breakingChanges}`));
    console.log(chalk.gray(`  Auto-migratable: ${analysis.autoMigratable}`));
    console.log(chalk.gray(`  Manual steps: ${analysis.manualSteps}`));

    console.log();
  }

  return { success: true };
}
