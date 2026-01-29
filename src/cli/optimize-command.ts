/**
 * Optimization CLI Command
 * 
 * Provides LLM-assisted optimization with:
 * - Multiple risk levels (safe, medium, high, dangerous)
 * - Dry-run mode for preview
 * - Comprehensive warnings and disclaimers
 * - Fidelity scoring before/after
 */

import { Command } from "commander";
import chalk from "chalk";
import { readFileSync, writeFileSync } from "fs";
import type { AgentId } from "../core/types.js";
import { SUPPORTED_AGENTS } from "../core/constants.js";
import { validate } from "../validation/index.js";
import { getParser } from "../parsing/parser-factory.js";
import { OptimizerFactory } from "../optimization/optimizer-core.js";
import { ClaudeSourceOptimizer } from "../optimization/optimizers/claude-source-optimizer.js";

// Register optimizers
OptimizerFactory.register(new ClaudeSourceOptimizer());

export function optimizeCommand(program: Command): void {
  program
    .command("optimize <source>")
    .description("LLM-assisted optimization of converted agent components")
    .requiredOption("-f, --from <agent>", "Source agent (original)")
    .option("-r, --risk <level>", "Risk level (safe, medium, high, dangerous)", "safe")
    .option("-d, --dry-run", "Preview changes without applying")
    .option("-a, --apply", "Apply optimization (required for non-safe modes)")
    .option("--no-preserve", "Allow structural changes")
    .option("-o, --output <path>", "Output file (defaults to in-place)")
    .option("-v, --verbose", "Show detailed optimization info")
    .action(async (source: string, options) => {
      const riskLevel = options.risk as import("../optimization/optimizer-core.js").RiskLevel;
      
      // Validate risk level
      const validRiskLevels = ["safe", "medium", "high", "dangerous"];
      if (!validRiskLevels.includes(riskLevel)) {
        console.error(chalk.red(`❌ Invalid risk level: ${riskLevel}`));
        console.log(chalk.gray(`Valid levels: ${validRiskLevels.join(", ")}`));
        process.exit(1);
      }

      // Risk level requires explicit --apply for non-safe
      if (riskLevel !== "safe" && !options.apply && !options.dryRun) {
        console.error(chalk.red(`❌ Risk level '${riskLevel}' requires explicit --apply flag`));
        console.log(chalk.gray("Use --dry-run to preview, or --apply to confirm"));
        console.log(chalk.gray("For safety, --safe is recommended for automation"));
        process.exit(1);
      }

      // Show disclaimer for dangerous
      if (riskLevel === "dangerous") {
        console.log(chalk.bgRed.white("⚠️  DANGEROUS MODE ⚠️"));
        console.log(chalk.red("This mode may significantly alter the component's behavior."));
        console.log(chalk.red("Manual review is MANDATORY before use."));
        console.log();
      }

      // Show warning for high
      if (riskLevel === "high") {
        console.log(chalk.yellow("⚠️  High Risk Mode"));
        console.log(chalk.gray("This mode may modify body content and instructions."));
        console.log();
      }

      console.log(chalk.blue(`🔧 Optimizing ${source}...`));
      console.log(chalk.gray(`   Risk level: ${riskLevel}`));
      console.log(chalk.gray(`   Mode: ${options.dryRun ? "dry-run (preview)" : "apply"}`));
      console.log();

      // Read files
      let originalContent: string;
      let convertedContent: string;
      
      try {
        convertedContent = readFileSync(source, "utf-8");
      } catch (err) {
        console.error(chalk.red(`❌ Failed to read ${source}: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
      }

      // Detect agents
      const fromAgent = options.from as AgentId;
      const toAgent = detectTargetAgent(source);
      
      if (!SUPPORTED_AGENTS.includes(fromAgent)) {
        console.error(chalk.red(`❌ Unsupported source agent: ${fromAgent}`));
        process.exit(1);
      }

      // Validate converted content first
      console.log(chalk.gray("Validating converted content..."));
      const validation = validate(convertedContent, toAgent, "skill");
      
      if (!validation.valid) {
        console.log(chalk.yellow("⚠️  Converted content has validation issues:"));
        validation.issues.forEach(issue => {
          console.log(chalk.yellow(`   - [${issue.code}] ${issue.message}`));
        });
        console.log();
      }

      // Find original file for comparison
      // (This is a heuristic - in practice, user might need to specify)
      const originalFile = findOriginalFile(source, fromAgent);
      if (originalFile) {
        try {
          originalContent = readFileSync(originalFile, "utf-8");
        } catch {
          console.log(chalk.yellow("⚠️  Could not read original file for comparison"));
          originalContent = convertedContent;
        }
      } else {
        console.log(chalk.yellow("⚠️  Original file not found. Limited optimization possible."));
        originalContent = convertedContent;
      }

      // Parse both versions
      const fromParser = getParser(fromAgent);
      const toParser = getParser(toAgent);

      if (!fromParser || !toParser) {
        console.error(chalk.red("❌ Parser not available"));
        process.exit(1);
      }

      const originalParse = fromParser.parse(originalContent, { sourceFile: originalFile ?? undefined });
      const convertedParse = toParser.parse(convertedContent, { sourceFile: source });

      if (!originalParse.success || !convertedParse.success) {
        console.error(chalk.red("❌ Failed to parse content"));
        process.exit(1);
      }

      if (!originalParse.spec || !convertedParse.spec) {
        console.error(chalk.red("❌ Failed to get parsed spec"));
        process.exit(1);
      }

      // Build optimization context
      const context = {
        sourceAgent: fromAgent,
        targetAgent: toAgent,
        componentType: convertedParse.spec.componentType,
        lostFeatures: [], // Will be populated by optimizer
        originalFrontmatter: {}, // Extract from original
        targetFrontmatter: {}, // Extract from converted
        originalBody: originalParse.spec.body,
        targetBody: convertedParse.spec.body
      };

      // Get optimizer
      const optimizer = OptimizerFactory.getOptimizer(toAgent);
      if (!optimizer) {
        console.error(chalk.red(`❌ No optimizer available for ${toAgent}`));
        process.exit(1);
      }

      // Run optimization
      console.log(chalk.gray("Running optimization..."));
      const result = await optimizer.optimize(convertedContent, context, {
        riskLevel,
        dryRun: options.dryRun,
        preserveStructure: options.preserve !== false
      });

      if (!result.success) {
        console.error(chalk.red("❌ Optimization failed"));
        process.exit(1);
      }

      // Display results
      console.log();
      console.log(chalk.blue("Optimization Results:"));
      console.log(chalk.gray(`  Fidelity: ${result.fidelity.afterConversion}% → ${result.fidelity.afterOptimization}%`));
      console.log(chalk.gray(`  Changes: ${result.changes.length}`));
      console.log(chalk.gray(`  Safety guardrails: ${result.stats.safetyGuardrailsAdded}`));
      console.log();

      // Display changes by category
      if (result.changes.length > 0) {
        console.log(chalk.blue("Changes by Category:"));
        const categories = result.changes.reduce((acc, change) => {
          acc[change.category] = (acc[change.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(categories).forEach(([cat, count]) => {
          const color = cat.includes('safety') ? chalk.green : 
                       cat.includes('reconstruction') ? chalk.yellow : chalk.gray;
          console.log(color(`  ${cat}: ${count}`));
        });
        console.log();
      }

      // Display detailed changes
      if (options.verbose) {
        console.log(chalk.blue("Detailed Changes:"));
        result.changes.forEach((change, i) => {
          const icon = change.severity === 'critical' ? '🔴' : 
                      change.severity === 'warning' ? '🟡' : '🟢';
          console.log(`${icon} [${change.type}] ${change.rationale}`);
          
          if (change.original && change.proposed) {
            console.log(chalk.gray("  Original:", change.original.slice(0, 50) + "..."));
            console.log(chalk.gray("  Proposed:", change.proposed.slice(0, 50) + "..."));
          }
        });
        console.log();
      }

      // Warnings
      if (result.warnings.length > 0) {
        console.log(chalk.yellow("Warnings:"));
        result.warnings.forEach(w => console.log(chalk.yellow(`  ⚠️  ${w}`)));
        console.log();
      }

      // Apply or preview
      if (options.dryRun) {
        console.log(chalk.blue("Dry Run - Changes NOT Applied"));
        console.log(chalk.gray("Use --apply to apply these changes"));
        
        if (result.optimizedContent && options.verbose) {
          console.log();
          console.log(chalk.blue("Preview of optimized content:"));
          console.log(chalk.gray("---"));
          console.log(result.optimizedContent.slice(0, 500));
          console.log(chalk.gray("---"));
        }
      } else {
        // Apply changes
        const outputPath = options.output || source;
        
        if (result.optimizedContent) {
          writeFileSync(outputPath, result.optimizedContent, "utf-8");
          console.log(chalk.green(`✅ Optimized content written to: ${outputPath}`));
        }

        // Show post-optimization disclaimer
        if (riskLevel !== 'safe') {
          console.log();
          console.log(chalk.bgYellow.black("⚠️  POST-OPTIMIZATION CHECKLIST ⚠️"));
          console.log(chalk.yellow("Please verify:"));
          console.log(chalk.yellow("  ☐ Component still serves original purpose"));
          console.log(chalk.yellow("  ☐ No unintended behavioral changes"));
          console.log(chalk.yellow("  ☐ Safety constraints preserved (if applicable)"));
          console.log(chalk.yellow("  ☐ Test in non-production environment first"));
        }
      }

      // Final stats
      console.log();
      console.log(chalk.blue("Summary:"));
      console.log(chalk.gray(`  Original fidelity: ${result.fidelity.afterConversion}%`));
      console.log(chalk.gray(`  Optimized fidelity: ${result.fidelity.afterOptimization}%`));
      console.log(chalk.gray(`  Improvement: +${result.fidelity.afterOptimization - result.fidelity.afterConversion}%`));
    });

  // Combined convert + optimize command
  program
    .command("convert-optimize <source>")
    .description("Convert and immediately optimize (one-step)")
    .requiredOption("-t, --to <agent>", "Target agent")
    .option("-f, --from <agent>", "Source agent (auto-detected)")
    .option("-r, --risk <level>", "Optimization risk level", "safe")
    .option("--no-optimize", "Skip optimization step")
    .option("-o, --output <path>", "Output file")
    .option("-v, --verbose", "Verbose output")
    .action(async (source: string, options) => {
      // First run convert
      console.log(chalk.blue("Step 1: Converting..."));
      
      // Import convert logic
      const { convertFile } = await import("./convert.js");
      const convertResult = await convertFile(source, {
        to: options.to,
        from: options.from,
        output: options.output,
        verbose: options.verbose
      });

      if (!convertResult.success) {
        console.error(chalk.red("❌ Conversion failed"));
        process.exit(1);
      }

      if (options.optimize === false) {
        console.log(chalk.green("✅ Conversion complete (optimization skipped)"));
        return;
      }

      // Then run optimize
      console.log();
      console.log(chalk.blue("Step 2: Optimizing..."));
      
      const outputFile = options.output || convertResult.outputPath;
      
      // Call optimize with same options
      const optimizeCmd = program.commands.find(c => c.name() === "optimize");
      if (optimizeCmd) {
        await optimizeCmd.parseAsync([
          outputFile,
          "--from", (options.from || detectTargetAgent(source)) ?? "claude",
          "--risk", options.risk,
          "--apply",
          ...(options.verbose ? ["--verbose"] : [])
        ]);
      }
    });
}

// Helper functions
function detectTargetAgent(path: string): AgentId {
  if (path.includes(".claude")) return "claude";
  if (path.includes(".cursor")) return "cursor";
  if (path.includes(".windsurf")) return "windsurf";
  if (path.includes(".opencode")) return "opencode";
  return "claude";
}

function findOriginalFile(convertedPath: string, sourceAgent: AgentId): string | null {
  // Heuristic: Look for original file in common locations
  const patterns: Record<AgentId, string[]> = {
    claude: [".claude/skills/", ".claude/rules/", ".claude/commands/"],
    cursor: [".cursor/rules/", ".cursor/commands/", ".cursor/"],
    windsurf: [".windsurf/skills/", ".windsurf/workflows/", ".windsurf/rules/"],
    opencode: [".opencode/skills/", ".opencode/commands/", ".opencode/agents/"],
    gemini: [".gemini/"],
    codex: [".codex/skills/", ".codex/commands/", ".codex/rules/"],
    aider: [".aider/"],
    universal: ["AGENTS.md"],
    continue: [".continue/"]
  };

  // Extract component name from converted path
  const nameMatch = convertedPath.match(/([^/]+)(?:\.md|SKILL\.md|\.mdc)$/);
  if (!nameMatch) return null;
  
  const name = nameMatch[1];
  
  // Try to find matching file in source agent paths
  const possiblePaths = patterns[sourceAgent] || [];
  for (const pattern of possiblePaths) {
    if (convertedPath.includes(pattern)) {
      // Already in source format
      return null;
    }
  }

  return null; // Would need more sophisticated lookup
}
