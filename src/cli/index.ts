#!/usr/bin/env node
/**
 * CACE CLI - Cross-Agent Compatibility Engine
 * 
 * Architecture Overview:
 * =====================
 * CACE implements a canonical intermediate representation (IR) that enables
 * conversion between AI coding agent formats. The core architecture consists of:
 * 
 * 1. Parser Layer: Transforms agent-specific formats into the canonical IR
 * 2. Renderer Layer: Converts the IR into agent-specific output formats
 * 3. Validation Layer: Validates conformance to agent specifications
 * 4. Transformation Layer: Applies semantic mappings and adaptations
 * 
 * Dual-Output Strategy (Claude → Windsurf):
 * ==========================================
 * The --strategy=dual-output feature addresses the fundamental architectural
 * difference between Claude and Windsurf:
 * 
 *   Claude Skills: Can be BOTH auto-invoked (progressive disclosure) AND 
 *                  manually invoked (/command). This is a unified model.
 * 
 *   Windsurf:     Forces a BINARY choice:
 *                  - Skills: Auto-invoked, no /command access
 *                  - Workflows: Manual /command, no auto-invocation
 * 
 * The dual-output strategy solves this by generating BOTH artifacts:
 * 
 *   1. .windsurf/workflows/<skill>.md  → User-facing workflow for manual /command
 *   2. .windsurf/skills/<skill>/SKILL.md → Skill file for auto-invocation parity
 * 
 * This preserves the Claude "dual-nature" capability in Windsurf's bifurcated model.
 * 
 * Agent Parity Considerations:
 * ============================
 * - Claude allowed-tools vs Windsurf tool restrictions: No equivalent in Windsurf
 * - Claude fork context vs Windsurf isolation: No equivalent in Windsurf
 * - Cursor .mdc alwaysApply vs Claude hooks: Different activation semantics
 * - OpenCode permission patterns: Approximate allowed-tools via config
 * 
 * See: docs/AGENT_PARITY_KNOWLEDGE.md for comprehensive parity analysis
 * 
 * Core commands:
 * - install: Install/generate scaffolding for agents
 * - convert: Convert between agent formats (supports --strategy=dual-output)
 * - validate: Validate agent files
 * - doctor: Check system compatibility
 */

import { Command } from "commander";
import chalk from "chalk";
import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync, statSync } from "fs";
import { dirname, join, basename, relative, resolve } from "path";
import type { AgentId, ComponentSpec } from "../core/types.js";
import { SUPPORTED_AGENTS } from "../core/constants.js";
import { validate } from "../validation/index.js";
import { getParser, parseComponent, detectAgent } from "../parsing/parser-factory.js";
import { getRenderer, renderComponent } from "../rendering/renderer-factory.js";
import { AGENTS } from "../core/constants.js";
import { optimizeCommand } from "./optimize-command.js";
import { startInteractiveMode } from "./interactive.js";
import { startWizard } from "./wizard.js";

const program = new Command();

program
  .name("cace")
  .description("Cross-Agent Compatibility Engine - Convert and validate AI agent components")
  .version("2.5.4");

// ============================================================================
// WIZARD MODE (Multi-Select Installation Wizard)
// ============================================================================

program
  .command("wizard")
  .alias("w")
  .description("Start multi-select installation wizard for complex operations")
  .option("-m, --mode <mode>", "Wizard mode: install, convert, migrate, sync", "install")
  .action(async (options) => {
    await startWizard();
  });

// ============================================================================
// INTERACTIVE MODE
// ============================================================================

program
  .command("interactive")
  .alias("i")
  .description("Start interactive REPL mode with guided prompts")
  .action(async () => {
    await startInteractiveMode();
  });

// ============================================================================
// INSTALL COMMAND - Generate scaffolding
// ============================================================================

program
  .command("install")
  .description("Generate scaffolding for one or more agents")
  .argument("[agents...]", `Agents to install (${SUPPORTED_AGENTS.join(", ")}, or 'all')`)
  .option("-p, --project", "Install at project level (default)")
  .option("-u, --user", "Install at user level")
  .option("-f, --force", "Overwrite existing files")
  .option("-s, --single <name>", "Generate a single component with given name")
  .option("-t, --type <type>", "Component type (skill, command, rule)", "skill")
  .action(async (agents: string[], options) => {
    const targetAgents = agents.length === 0 || agents.includes("all") 
      ? SUPPORTED_AGENTS 
      : agents.filter((a): a is AgentId => SUPPORTED_AGENTS.includes(a as AgentId));

    if (targetAgents.length === 0) {
      console.error(chalk.red("❌ No valid agents specified"));
      console.log(chalk.gray("Use: cace install claude cursor windsurf"));
      console.log(chalk.gray("Or: cace install all"));
      process.exit(1);
    }

    const isUserLevel = options.user;
    const basePath = isUserLevel 
      ? process.env.HOME || process.env.USERPROFILE || "."
      : ".";

    console.log(chalk.blue(`🔧 Installing scaffolding for: ${targetAgents.join(", ")}`));
    console.log(chalk.gray(`   Location: ${isUserLevel ? "user" : "project"} level`));
    console.log();

    const results: { agent: AgentId; path: string; status: "created" | "exists" | "error" }[] = [];

    for (const agent of targetAgents) {
      try {
        const paths = getScaffoldPaths(agent, basePath, isUserLevel);
        
        for (const path of paths) {
          if (!existsSync(path)) {
            mkdirSync(path, { recursive: true });
            results.push({ agent, path, status: "created" });
            console.log(chalk.green(`  ✓ ${path}`));
          } else {
            results.push({ agent, path, status: "exists" });
            console.log(chalk.yellow(`  ⚠ ${path} (already exists)`));
          }
        }

        // Generate example component if --single is specified
        if (options.single) {
          const examplePath = generateExampleComponent(
            agent, 
            basePath, 
            options.single, 
            options.type,
            options.force
          );
          if (examplePath) {
            console.log(chalk.green(`  ✓ Example component: ${examplePath}`));
          }
        }
      } catch (err) {
        results.push({ agent, path: "", status: "error" });
        console.error(chalk.red(`  ✗ ${agent}: ${err instanceof Error ? err.message : String(err)}`));
      }
    }

    console.log();
    const created = results.filter((r) => r.status === "created").length;
    const existing = results.filter((r) => r.status === "exists").length;
    
    if (created > 0) {
      console.log(chalk.green(`✅ Created ${created} directories`));
    }
    if (existing > 0) {
      console.log(chalk.yellow(`⚠️  Skipped ${existing} existing directories`));
    }

    console.log();
    console.log(chalk.blue("Next steps:"));
    console.log(chalk.gray("  1. Create components in the scaffolded directories"));
    console.log(chalk.gray("  2. Use 'cace validate <file>' to check your components"));
    console.log(chalk.gray("  3. Use 'cace convert <file> -t <agent>' to convert between agents"));
  });

// ============================================================================
// CONVERT COMMAND - Convert between formats
// ============================================================================

program
  .command("convert <source>")
  .description("Convert a component from one agent format to another")
  .requiredOption("-t, --to <agent>", `Target agent (${SUPPORTED_AGENTS.join(", ")})`)
  .option("-f, --from <agent>", "Source agent (auto-detected)")
  .option("-o, --output <path>", "Output file path (auto-generated if not specified)")
  .option("-v, --verbose", "Show detailed conversion info")
  .option("--no-validate", "Skip validation of output")
  .option("--strategy <strategy>", "Conversion strategy: direct (default) or dual-output", "direct")
  .action((source: string, options) => {
    console.log(chalk.blue(`🔄 Converting ${source}...`));

    // Detect source format
    const fromAgent = options.from || detectAgentFromPath(source);
    if (!fromAgent) {
      console.error(chalk.red("❌ Could not detect source agent. Use --from to specify."));
      process.exit(1);
    }

    // Read source file
    let content: string;
    try {
      content = readFileSync(source, "utf-8");
    } catch (err) {
      console.error(chalk.red(`❌ Failed to read ${source}: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }

    // Parse
    const parser = getParser(fromAgent);
    if (!parser) {
      console.error(chalk.red(`❌ No parser available for ${fromAgent}`));
      process.exit(1);
    }

    const parseResult = parser.parse(content, { 
      sourceFile: source,
      validateOnParse: true 
    });

    if (!parseResult.success) {
      console.error(chalk.red("❌ Parse failed:"));
      parseResult.errors.forEach((e) => console.error(chalk.red(`   ${e}`)));
      process.exit(1);
    }

    if (!parseResult.spec) {
      console.error(chalk.red("❌ Parse failed: No spec returned"));
      process.exit(1);
    }

    if (options.verbose) {
      console.log(chalk.gray(`   Detected: ${fromAgent} ${parseResult.spec.componentType}`));
      if (parseResult.validation) {
        console.log(chalk.gray(`   Validation: ${parseResult.validation.warnings.length} warnings`));
      }
    }

    // Convert
    const targetAgent = options.to as AgentId;
    const renderer = getRenderer(targetAgent);
    if (!renderer) {
      console.error(chalk.red(`❌ No renderer available for ${targetAgent}`));
      process.exit(1);
    }

    // Check for native compatibility (OpenCode can read Claude files)
    if (fromAgent === "claude" && targetAgent === "opencode") {
      console.log(chalk.yellow("⚠️  Note: OpenCode natively supports Claude files. Conversion may not be necessary."));
    }

    const renderResult = renderer.render(parseResult.spec, {
      validateOutput: options.validate !== false,
    });

    if (!renderResult.success) {
      console.error(chalk.red("❌ Render failed:"));
      renderResult.errors.forEach((e) => console.error(chalk.red(`   ${e}`)));
      process.exit(1);
    }

    if (!renderResult.content) {
      console.error(chalk.red("❌ Render failed: No content returned"));
      process.exit(1);
    }

    // Handle dual-output strategy for Claude → Windsurf conversion
    const strategy = options.strategy || "direct";
    const outputPaths: string[] = [];

    if (strategy === "dual-output" && fromAgent === "claude" && targetAgent === "windsurf") {
      // Dual-output: Generate both Workflow (manual) and Skill (auto-invocation)
      const skillName = parseResult.spec?.id || basename(source, ".md");

      // Path 1: Workflow for user invocation
      const workflowPath = options.output
        ? options.output.replace(".md", "-workflow.md")
        : join(dirname(source), ".windsurf", "workflows", `${skillName}.md`);

      // Path 2: Skill for auto-execution parity
      const skillPath = options.output
        ? options.output.replace(".md", "-skill.md")
        : join(dirname(source), ".windsurf", "skills", skillName, "SKILL.md");

      // Create workflow content (adapted for manual invocation)
      const workflowContent = createWorkflowFromSkill(renderResult.content, parseResult.spec);

      // Ensure directories exist
      const workflowDir = dirname(workflowPath);
      const skillDir = dirname(skillPath);
      if (!existsSync(workflowDir)) mkdirSync(workflowDir, { recursive: true });
      if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true });

      // Write both outputs
      writeFileSync(workflowPath, workflowContent, "utf-8");
      writeFileSync(skillPath, renderResult.content, "utf-8");

      outputPaths.push(workflowPath, skillPath);

      console.log();
      console.log(chalk.green.bold("✅ Dual-Output Conversion Complete\n"));
      console.log(chalk.cyan(`📄 Source: ${chalk.white(source)}`));
      console.log(chalk.cyan(`🎯 Targets:`));
      console.log(chalk.cyan(`   Workflow: ${chalk.white(workflowPath)}`));
      console.log(chalk.cyan(`   Skill:    ${chalk.white(skillPath)}`));
      console.log(chalk.cyan(`🤖 Agents: ${chalk.white(fromAgent)} → ${chalk.white(targetAgent)}`));
      console.log();
      console.log(chalk.blue.bold("📊 Strategy: Dual-Output\n"));
      console.log(chalk.cyan("   This conversion preserves Claude's dual-nature capability:"));
      console.log(chalk.gray("   • Workflow: Manual /command invocation by user"));
      console.log(chalk.gray("   • Skill: Auto-invocation for progressive disclosure"));
    } else {
      // Standard single-output conversion
      // Determine output path
      const outputPath = options.output || renderResult.filename || generateOutputPath(source, targetAgent);
      outputPaths.push(outputPath);

      // Ensure directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Write output
      writeFileSync(outputPath, renderResult.content, "utf-8");

      // Print rich output header
      console.log();
      console.log(chalk.green.bold("✅ Conversion Complete\n"));
      console.log(chalk.cyan(`📄 Source: ${chalk.white(source)}`));
      console.log(chalk.cyan(`🎯 Target: ${chalk.white(outputPath)}`));
      console.log(chalk.cyan(`🤖 Agents: ${chalk.white(fromAgent)} → ${chalk.white(targetAgent)}`));
    }
    console.log();

    // Fidelity score with visual indicator
    if (renderResult.report) {
      const fidelity = renderResult.report.fidelityScore;
      const color = fidelity >= 90 ? chalk.green : fidelity >= 75 ? chalk.yellow : chalk.red;
      const bar = "█".repeat(Math.floor(fidelity / 10)) + "░".repeat(10 - Math.floor(fidelity / 10));
      
      console.log(chalk.blue.bold("📊 Conversion Quality\n"));
      console.log(`   Fidelity Score: ${color.bold(`${fidelity}%`)} ${color(`[${bar}]`)}`);
      
      if (fidelity >= 90) {
        console.log(chalk.green(`   ✓ Excellent conversion quality`));
      } else if (fidelity >= 75) {
        console.log(chalk.yellow(`   ⚠ Good conversion with some considerations`));
      } else {
        console.log(chalk.red(`   ⚠ Significant differences - manual review recommended`));
      }
      
      // Show critical features that need attention
      if (renderResult.report.losses.length > 0) {
        console.log();
        console.log(chalk.yellow.bold(`⚠️  Features Requiring Attention (${renderResult.report.losses.length})\n`));
        
        const critical = renderResult.report.losses.filter(l => l.severity === "critical");
        const warnings = renderResult.report.losses.filter(l => l.severity === "warning");
        const info = renderResult.report.losses.filter(l => l.severity === "info");
        
        if (critical.length > 0) {
          console.log(chalk.red.bold("   Critical (manual action required):"));
          critical.forEach(loss => {
            console.log(chalk.red(`     ❌ ${loss.description}`));
            if (loss.recommendation) {
              console.log(chalk.gray(`        💡 ${loss.recommendation}`));
            }
          });
          console.log();
        }
        
        if (warnings.length > 0) {
          console.log(chalk.yellow.bold("   Warnings (review recommended):"));
          warnings.forEach(loss => {
            console.log(chalk.yellow(`     ⚠️  ${loss.description}`));
            if (loss.recommendation) {
              console.log(chalk.gray(`        💡 ${loss.recommendation}`));
            }
          });
          console.log();
        }
        
        if (info.length > 0) {
          console.log(chalk.blue.bold("   Info (minor differences):"));
          info.forEach(loss => {
            console.log(chalk.blue(`     ℹ️  ${loss.description}`));
          });
          console.log();
        }
      }
      
      // Show suggestions
      if (renderResult.report.suggestions.length > 0) {
        console.log(chalk.cyan.bold("💡 Suggestions\n"));
        renderResult.report.suggestions.forEach(sugg => {
          console.log(chalk.cyan(`   • ${sugg}`));
        });
        console.log();
      }
    }

    // Disclaimer and next steps
    console.log(chalk.yellow.bold("⚠️  Important Disclaimers\n"));
    console.log(chalk.yellow("   • Review the converted file before using in production"));
    console.log(chalk.yellow("   • Test converted components in a safe environment first"));
    console.log(chalk.yellow("   • Security settings (allowed-tools, sandbox) may need manual adjustment"));
    console.log(chalk.yellow("   • Some agent-specific features may not have equivalents"));
    console.log();

    console.log(chalk.blue.bold("📋 Next Steps\n"));
    if (strategy === "dual-output" && outputPaths.length > 1) {
      console.log(chalk.white("   1. Review converted files:"));
      outputPaths.forEach((path) => {
        console.log(chalk.cyan(`      • ${path}`));
      });
      console.log();
      console.log(chalk.white("   2. Validate outputs:"));
      outputPaths.forEach((path) => {
        console.log(chalk.cyan(`      • cace validate "${path}" --from ${targetAgent}`));
      });
      console.log();
      console.log(chalk.white("   3. Test in your Windsurf environment:"));
      console.log(chalk.gray("      • Use /command to invoke workflow"));
      console.log(chalk.gray("      • Skill will auto-invoke based on context"));
    } else {
      const singlePath = outputPaths[0];
      console.log(chalk.white(`   1. Review the converted file: ${chalk.cyan(singlePath)}`));
      console.log(chalk.white(`   2. Validate the output: ${chalk.cyan(`cace validate "${singlePath}" --from ${targetAgent}`)}`));
      console.log(chalk.white(`   3. Test in your ${targetAgent} environment`));
    }
    console.log();

    // Verbose mode details
    if (options.verbose && renderResult.report) {
      console.log(chalk.gray.bold("📄 Conversion Report (Verbose)\n"));
      
      if (renderResult.report.preservedSemantics.length > 0) {
        console.log(chalk.green("Preserved Features:"));
        renderResult.report.preservedSemantics.forEach(item => {
          console.log(chalk.green(`   ✓ ${item}`));
        });
        console.log();
      }
      
      if (renderResult.report.warnings.length > 0) {
        console.log(chalk.yellow("Additional Warnings:"));
        renderResult.report.warnings.forEach(warning => {
          console.log(chalk.yellow(`   ⚠️  [${warning.code}] ${warning.message}`));
        });
        console.log();
      }
    }
  });

// ============================================================================
// VALIDATE COMMAND - Validate files
// ============================================================================

program
  .command("validate <source>")
  .description("Validate an agent component file")
  .option("-f, --from <agent>", "Agent type (auto-detected)")
  .option("-t, --type <type>", "Component type (skill, command, rule, etc.)")
  .option("--strict", "Strict validation (treat warnings as errors)")
  .option("-v, --version <version>", "Specific agent version to validate against")
  .action((source: string, options) => {
    console.log(chalk.blue(`🔍 Validating ${source}...`));

    let content: string;
    try {
      content = readFileSync(source, "utf-8");
    } catch (err) {
      console.error(chalk.red(`❌ Failed to read ${source}: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }

    // Detect agent
    const agent = (options.from || detectAgentFromPath(source)) as AgentId;
    if (!agent) {
      console.error(chalk.red("❌ Could not detect agent type. Use --from to specify."));
      console.log(chalk.gray("Supported agents: " + SUPPORTED_AGENTS.join(", ")));
      process.exit(1);
    }

    // Detect component type
    const componentType = options.type || detectComponentTypeFromPath(source) || "skill";

    // Validate
    const result = validate(content, agent, componentType, {
      version: options.version,
      strict: options.strict,
    });

    // Print rich header
    console.log();
    console.log(chalk.blue.bold("🔍 Validation Report\n"));
    console.log(chalk.cyan(`📄 File: ${chalk.white(source)}`));
    console.log(chalk.cyan(`🤖 Agent: ${chalk.white(agent)}`));
    console.log(chalk.cyan(`📦 Type: ${chalk.white(componentType)}`));
    console.log(chalk.cyan(`🔖 Version: ${chalk.white(result.version)}`));
    console.log();

    // Calculate validation score
    const totalIssues = result.issues.length + result.warnings.length;
    const score = Math.max(0, 100 - (result.issues.length * 20) - (result.warnings.length * 5));
    const scoreColor = score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;
    const scoreBar = "█".repeat(Math.floor(score / 10)) + "░".repeat(10 - Math.floor(score / 10));
    
    console.log(chalk.blue.bold("📊 Validation Score\n"));
    console.log(`   Score: ${scoreColor.bold(`${score}%`)} ${scoreColor(`[${scoreBar}]`)}`);
    console.log(`   Errors: ${result.issues.length > 0 ? chalk.red(result.issues.length.toString()) : chalk.green("0")}`);
    console.log(`   Warnings: ${result.warnings.length > 0 ? chalk.yellow(result.warnings.length.toString()) : chalk.green("0")}`);
    console.log(`   Info: ${chalk.blue(result.info.length.toString())}`);
    console.log();

    // Print errors with severity
    if (result.issues.length > 0) {
      console.log(chalk.red.bold(`❌ Critical Errors (${result.issues.length})\n`));
      console.log(chalk.red("These must be fixed before the file can be used:\n"));
      result.issues.forEach((issue, index) => {
        console.log(chalk.red(`   ${index + 1}. [${issue.code}] ${issue.message}`));
        if (issue.field) {
          console.log(chalk.gray(`      Field: ${issue.field}`));
        }
        if (issue.suggestion) {
          console.log(chalk.cyan(`      💡 ${issue.suggestion}`));
        }
        console.log();
      });
    }

    // Print warnings with severity
    if (result.warnings.length > 0) {
      console.log(chalk.yellow.bold(`⚠️  Warnings (${result.warnings.length})\n`));
      console.log(chalk.yellow("These should be reviewed but won't prevent usage:\n"));
      result.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`   ${index + 1}. [${warning.code}] ${warning.message}`));
        if (warning.field) {
          console.log(chalk.gray(`      Field: ${warning.field}`));
        }
        if (warning.suggestion) {
          console.log(chalk.cyan(`      💡 ${warning.suggestion}`));
        }
        console.log();
      });
    }

    // Print info
    if (result.info.length > 0) {
      console.log(chalk.blue.bold(`ℹ️  Information (${result.info.length})\n`));
      result.info.forEach((infoItem, index) => {
        console.log(chalk.blue(`   ${index + 1}. ${infoItem.message}`));
        if (infoItem.field) {
          console.log(chalk.gray(`      Field: ${infoItem.field}`));
        }
      });
      console.log();
    }

    // Summary with visual indicator
    console.log(chalk.blue.bold("📋 Summary\n"));
    if (result.valid && result.warnings.length === 0 && result.info.length === 0) {
      console.log(chalk.green.bold("   ✅ Perfect! No issues found."));
      console.log(chalk.green("      This file is production-ready."));
    } else if (result.valid && result.warnings.length === 0) {
      console.log(chalk.green.bold("   ✅ Valid!"));
      console.log(chalk.green(`      All checks passed with ${result.info.length} informational notes.`));
    } else if (result.valid) {
      console.log(chalk.yellow.bold(`   ⚠️  Valid with ${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""}`));
      console.log(chalk.yellow("      File can be used but review warnings above."));
    } else {
      console.log(chalk.red.bold(`   ❌ Invalid - ${result.issues.length} error${result.issues.length !== 1 ? "s" : ""} found`));
      console.log(chalk.red("      Fix errors above before using this file."));
      console.log();
      console.log(chalk.blue("   💡 Quick Fix Commands:"));
      console.log(chalk.gray(`      • Interactive fix mode: ${chalk.cyan(`cace interactive`)}`));
      console.log(chalk.gray(`      • Auto-fix (where available): ${chalk.cyan(`cace fix "${source}"`)}`));
      process.exit(1);
    }

    // Show agent-specific guidance
    console.log();
    console.log(chalk.blue.bold("📚 Agent-Specific Guidance\n"));
    showAgentGuidance(agent, componentType);

    console.log();
  });

// ============================================================================
// CONVERT-DIR COMMAND - Convert entire directories
// ============================================================================

program
  .command("convert-dir <source>")
  .alias("cd")
  .description("Convert entire agent scaffolding directories (e.g., ~/.claude or ./.claude)")
  .requiredOption("-t, --to <agent>", `Target agent (${SUPPORTED_AGENTS.join(", ")})`)
  .option("-f, --from <agent>", "Source agent (auto-detected)")
  .option("-o, --output <path>", "Output directory (auto-generated if not specified)")
  .option("-r, --recursive", "Recursively process subdirectories", true)
  .option("--dry-run", "Show what would be converted without doing it")
  .option("--backup", "Create backups of existing files")
  .option("--include <patterns...>", "Include files matching these patterns")
  .option("--exclude <patterns...>", "Exclude files matching these patterns")
  .option("-v, --verbose", "Show detailed conversion info for each file")
  .option("--strategy <strategy>", "Conversion strategy: direct (default) or dual-output", "direct")
  .action(async (source: string, options: { to: string; from?: string; output?: string; recursive?: boolean; dryRun?: boolean; backup?: boolean; include?: string[]; exclude?: string[]; verbose?: boolean; strategy?: string }) => {
    console.log(chalk.blue.bold("\n📁 Directory Conversion\n"));
    
    // Validate source is a directory
    if (!existsSync(source)) {
      console.error(chalk.red(`❌ Source directory not found: ${source}`));
      process.exit(1);
    }
    
    const sourceStat = statSync(source);
    if (!sourceStat.isDirectory()) {
      console.error(chalk.red(`❌ Source is not a directory: ${source}`));
      console.log(chalk.gray("Use 'cace convert' for single file conversion."));
      process.exit(1);
    }
    
    // Validate target agent
    if (!options.to) {
      console.error(chalk.red("❌ Target agent is required. Use --to <agent>"));
      process.exit(1);
    }
    
    // Detect source agent
    const fromAgent = options.from || detectAgentFromPath(source) || detectAgentFromContents(source);
    if (!fromAgent) {
      console.error(chalk.red("❌ Could not detect source agent from directory contents."));
      console.log(chalk.gray("Use --from to specify the source agent explicitly."));
      process.exit(1);
    }
    
    console.log(chalk.cyan(`📄 Source: ${chalk.white(source)}`));
    console.log(chalk.cyan(`🤖 Source Agent: ${chalk.white(fromAgent)}`));
    console.log(chalk.cyan(`🎯 Target Agent: ${chalk.white(options.to)}`));
    console.log();
    
    // Scan directory
    console.log(chalk.blue("🔍 Scanning directory...\n"));
    
    const files: string[] = [];
    const scanDir = (dir: string, depth = 0) => {
      if (depth > 10) return; // Limit recursion
      
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && options.recursive) {
            scanDir(fullPath, depth + 1);
          } else if (entry.endsWith(".md") || entry.endsWith(".mdc")) {
            // Check if file matches include/exclude patterns
            if (shouldIncludeFile(fullPath, options.include, options.exclude)) {
              files.push(fullPath);
            }
          }
        }
      } catch (e) {
        // Skip directories that can't be read
      }
    };
    
    scanDir(source);
    
    if (files.length === 0) {
      console.log(chalk.yellow("⚠️  No convertible files found in directory."));
      console.log(chalk.gray("Supported files: *.md, *.mdc"));
      process.exit(0);
    }
    
    console.log(chalk.green(`✓ Found ${files.length} files to convert\n`));
    
    // Determine output directory
    const outputDir = options.output || generateDirOutputPath(source, options.to as AgentId);
    
    console.log(chalk.cyan(`💾 Output: ${chalk.white(outputDir)}`));
    console.log(chalk.cyan(`📊 Mode: ${chalk.white(options.dryRun ? "Dry Run" : "Live Conversion")}`));
    console.log();
    
    // Confirm
    if (!options.dryRun) {
      console.log(chalk.yellow.bold("⚠️  This will modify files on your filesystem.\n"));
      
      // In a real implementation, we'd ask for confirmation here
      // For now, we'll proceed with a warning
    }
    
    // Convert files
    const results = {
      success: 0,
      error: 0,
      skipped: 0,
      total: files.length,
    };
    
    console.log(chalk.blue("🔄 Converting files...\n"));
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const relativePath = relative(source, file);
      
      try {
        // Read and convert
        const content = readFileSync(file, "utf-8");
        const parseResult = parseComponent(content, { sourceFile: file });
        
        if (!parseResult.success || !parseResult.spec) {
          results.error++;
          if (options.verbose) {
            console.log(chalk.red(`  ✗ ${relativePath} - Parse failed`));
          }
          continue;
        }
        
        const targetAgent = options.to as AgentId;
        const strategy = options.strategy || "direct";
        
        // Render the component
        const renderResult = renderComponent(parseResult.spec, targetAgent, {
          validateOutput: true,
        });
        
        if (!renderResult.success || !renderResult.content) {
          results.error++;
          if (options.verbose) {
            console.log(chalk.red(`  ✗ ${relativePath} - Render failed`));
          }
          continue;
        }
        
        // Handle dual-output strategy for Claude → Windsurf / Cursor
        if (strategy === "dual-output" && fromAgent === "claude" && (targetAgent === "windsurf" || targetAgent === "cursor")) {
          const targets = calculateDirTargetPaths(file, source!, outputDir, targetAgent);
          const primaryPath = targets.primary;
          const secondaryPath = targets.secondary;

          // Write primary output (workflow for windsurf, skill for cursor)
          if (!options.dryRun) {
            mkdirSync(dirname(primaryPath), { recursive: true });
            writeFileSync(primaryPath, renderResult.content, "utf-8");
          }

          // Write secondary output if available
          if (secondaryPath) {
            if (targetAgent === "windsurf") {
              // For Windsurf, secondary is a Skill for auto-invocation parity. Use Claude renderer (compatible Skill.md frontmatter).
              const skillRenderResult = renderComponent(parseResult.spec!, "claude", {
                validateOutput: true,
              });
              if (skillRenderResult.success && skillRenderResult.content && !options.dryRun) {
                mkdirSync(dirname(secondaryPath), { recursive: true });
                writeFileSync(secondaryPath, skillRenderResult.content, "utf-8");
              }
            } else if (targetAgent === "cursor") {
              // For Cursor, secondary is a Command (.cursor/commands/<name>.md) for explicit manual invocation.
              const commandSpec: ComponentSpec = {
                ...parseResult.spec!,
                componentType: "command",
                activation: { ...parseResult.spec!.activation, mode: "manual" },
              };
              const commandRenderResult = renderComponent(commandSpec, "cursor", {
                validateOutput: true,
              });
              if (commandRenderResult.success && commandRenderResult.content && !options.dryRun) {
                mkdirSync(dirname(secondaryPath), { recursive: true });
                writeFileSync(secondaryPath, commandRenderResult.content, "utf-8");
              }
            }
          }

          results.success++;

          if (options.verbose) {
            const fidelity = renderResult.report?.fidelityScore || 0;
            const color = fidelity >= 90 ? chalk.green : fidelity >= 75 ? chalk.yellow : chalk.red;
            const label = targetAgent === "windsurf" ? "workflow + skill" : "skill + command";
            console.log(color(`  ✓ ${relativePath} → ${label} (${fidelity}%)`));
          }
        } else {
          // Standard single-output conversion
          const targetPath = calculateDirTargetPath(file, source!, outputDir, targetAgent);
          
          if (!options.dryRun) {
            // Backup if needed
            if (options.backup && existsSync(targetPath)) {
              copyFileSync(targetPath, `${targetPath}.backup.${Date.now()}`);
            }
            
            // Ensure directory exists
            mkdirSync(dirname(targetPath), { recursive: true });
            
            // Write file
            writeFileSync(targetPath, renderResult.content, "utf-8");
          }
          
          results.success++;
          
          if (options.verbose) {
            const fidelity = renderResult.report?.fidelityScore || 0;
            const color = fidelity >= 90 ? chalk.green : fidelity >= 75 ? chalk.yellow : chalk.red;
            console.log(color(`  ✓ ${relativePath} (${fidelity}%)`));
          }
        }
      } catch (e) {
        results.error++;
        if (options.verbose) {
          console.log(chalk.red(`  ✗ ${relativePath} - ${e instanceof Error ? e.message : String(e)}`));
        }
      }
      
      // Progress bar
      const percent = Math.floor(((i + 1) / files.length) * 100);
      const bar = "█".repeat(Math.floor(percent / 5)) + "░".repeat(20 - Math.floor(percent / 5));
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
      process.stdout.write(chalk.gray(`[${bar}] ${percent}% (${i + 1}/${files.length})`));
    }
    
    console.log();
    console.log();
    
    // Summary
    console.log(chalk.blue.bold("📊 Conversion Summary\n"));
    console.log(`   Total files: ${chalk.white(results.total.toString())}`);
    console.log(`   Successful: ${chalk.green(results.success.toString())}`);
    console.log(`   Errors: ${results.error > 0 ? chalk.red(results.error.toString()) : chalk.gray("0")}`);
    console.log(`   Skipped: ${chalk.yellow(results.skipped.toString())}`);
    console.log();
    
    if (options.dryRun) {
      console.log(chalk.blue("This was a dry run. No files were modified."));
      console.log(chalk.gray("Run without --dry-run to execute the conversion.\n"));
    } else {
      console.log(chalk.green.bold("✅ Directory conversion complete!\n"));
      console.log(chalk.blue("Next steps:"));
      console.log(chalk.gray(`   • Review converted files in: ${outputDir}`));
      console.log(chalk.gray(`   • Run 'cace validate' on key files`));
      console.log(chalk.gray(`   • Test in your ${options.to} environment`));
    }
    
    console.log();
  });

// ============================================================================
// DOCTOR COMMAND - System check
// ============================================================================

program
  .command("doctor")
  .description("Check system compatibility and configuration")
  .action(() => {
    console.clear();
    console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║               🏥 CACE System Doctor v2.1.0                   ║
╚══════════════════════════════════════════════════════════════╝
    `));

    const checks: { name: string; status: "ok" | "warn" | "error"; message: string; help?: string }[] = [];

    // Check Node version
    const nodeVersion = process.version;
    const nodeParts = nodeVersion.slice(1).split(".");
    const nodeMajor = nodeParts[0] ? parseInt(nodeParts[0]) : 0;
    checks.push({
      name: "Node.js",
      status: nodeMajor >= 18 ? "ok" : nodeMajor >= 16 ? "warn" : "error",
      message: `v${nodeVersion} ${nodeMajor >= 18 ? chalk.green("✓") : nodeMajor >= 16 ? chalk.yellow("(≥16 ok, ≥18 recommended)") : chalk.red("(≥18 required)")}`,
      help: nodeMajor < 18 ? "Install Node.js 18 or later" : undefined,
    });

    // Check each agent's directories
    let configuredAgents = 0;
    for (const agent of SUPPORTED_AGENTS) {
      const projectPaths = getScaffoldPaths(agent, ".", false);
      const userPaths = getScaffoldPaths(agent, process.env.HOME || ".", true);
      const projectPath = projectPaths[0];
      const userPath = userPaths[0];
      
      if (projectPath || userPath) {
        const hasProject = projectPath ? existsSync(projectPath) : false;
        const hasUser = userPath ? existsSync(userPath) : false;

        if (hasProject || hasUser) {
          configuredAgents++;
          checks.push({
            name: `${agent} config`,
            status: "ok",
            message: hasProject ? `project (${chalk.cyan(projectPath)})` : `user (${chalk.cyan(userPath)})`,
          });
        }
      }
    }

    // Print results
    console.log(chalk.blue.bold("\n📊 System Checks\n"));
    checks.forEach((check) => {
      const icon = check.status === "ok" ? "✓" : check.status === "warn" ? "⚠" : "✗";
      const color = check.status === "ok" ? chalk.green : check.status === "warn" ? chalk.yellow : chalk.red;
      console.log(color(`   ${icon} ${check.name.padEnd(15)} ${check.message}`));
      if (check.help) {
        console.log(chalk.gray(`      💡 ${check.help}`));
      }
    });

    // Summary
    console.log();
    console.log(chalk.blue.bold("📈 Summary\n"));
    const okCount = checks.filter(c => c.status === "ok").length;
    const warnCount = checks.filter(c => c.status === "warn").length;
    const errorCount = checks.filter(c => c.status === "error").length;
    
    console.log(`   Checks passed: ${chalk.green(okCount.toString())}`);
    console.log(`   Warnings: ${warnCount > 0 ? chalk.yellow(warnCount.toString()) : chalk.gray("0")}`);
    console.log(`   Errors: ${errorCount > 0 ? chalk.red(errorCount.toString()) : chalk.gray("0")}`);
    console.log(`   Agents configured: ${chalk.cyan(configuredAgents.toString())}/${chalk.gray(SUPPORTED_AGENTS.length.toString())}`);
    
    if (configuredAgents === 0) {
      console.log();
      console.log(chalk.yellow("⚠️  No agent configurations found"));
      console.log(chalk.gray("   Run 'cace install <agent>' to set up agent scaffolding"));
    }

    // Compatibility matrix
    console.log();
    console.log(chalk.blue.bold("🔄 Conversion Fidelity Matrix\n"));
    console.log(chalk.gray("   Estimated conversion quality between agents (higher is better)\n"));
    
    const matrix = [
      ["From→To", "Claude", "Cursor", "Windsurf", "OpenCode", "Codex", "Gemini"],
      ["Claude", "—", "96%", "87%", "98%", "92%", "88%"],
      ["Cursor", "90%", "—", "82%", "88%", "85%", "83%"],
      ["Windsurf", "85%", "82%", "—", "90%", "88%", "86%"],
      ["OpenCode", "95%", "88%", "90%", "—", "90%", "88%"],
      ["Codex", "90%", "85%", "88%", "90%", "—", "87%"],
      ["Gemini", "87%", "83%", "86%", "88%", "87%", "—"],
    ];

    matrix.forEach((row, i) => {
      if (i === 0) {
        console.log(chalk.bold("   " + row.map((c) => c.padEnd(10)).join("")));
        console.log(chalk.gray("   " + "─".repeat(70)));
      } else {
        const coloredRow = row.map((c, j) => {
          if (j === 0) return chalk.cyan(c.padEnd(10));
          if (c === "—") return chalk.gray(c.padEnd(10));
          const num = parseInt(c);
          if (num >= 90) return chalk.green(c.padEnd(10));
          if (num >= 80) return chalk.yellow(c.padEnd(10));
          return chalk.red(c.padEnd(10));
        });
        console.log("   " + coloredRow.join(""));
      }
    });
    
    console.log();
    console.log(chalk.gray("   Legend: " + chalk.green("≥90% Excellent") + "  " + chalk.yellow("≥80% Good") + "  " + chalk.red("<80% Review needed")));
    console.log(chalk.gray("   * OpenCode natively reads Claude files"));
    console.log(chalk.gray("   * Cursor 2.4+ natively reads Agent Skills, including .claude/skills for compatibility"));

    // Recommendations
    console.log();
    console.log(chalk.blue.bold("💡 Recommendations\n"));
    
    if (configuredAgents === 0) {
      console.log(chalk.yellow("   1. Set up your first agent:"));
      console.log(chalk.gray(`      ${chalk.cyan("cace install claude")} - Install Claude scaffolding`));
      console.log(chalk.gray(`      ${chalk.cyan("cace install all")} - Install all agents`));
    } else if (configuredAgents < 3) {
      console.log(chalk.cyan("   1. Try the interactive mode:"));
      console.log(chalk.gray(`      ${chalk.cyan("cace interactive")} - Guided conversion workflow`));
    } else {
      console.log(chalk.green("   1. You're all set! Try converting between agents:"));
      console.log(chalk.gray(`      ${chalk.cyan("cace convert my-skill.md --to codex")}`));
    }
    
    console.log(chalk.cyan("   2. Validate your files:"));
    console.log(chalk.gray(`      ${chalk.cyan("cace validate my-skill.md")}`));
    console.log();
    console.log(chalk.gray(`   📖 Documentation: ${chalk.cyan("https://github.com/AIntelligentTech/cross-agent-compatibility-engine")}`));
    console.log();
  });

// ============================================================================
// Helper functions for convert-dir
// ============================================================================

function shouldIncludeFile(filePath: string, includePatterns?: string[], excludePatterns?: string[]): boolean {
  const fileName = basename(filePath);
  
  // Check exclude patterns first
  if (excludePatterns && excludePatterns.length > 0) {
    for (const pattern of excludePatterns) {
      if (fileName.includes(pattern)) {
        return false;
      }
    }
  }
  
  // Check include patterns
  if (includePatterns && includePatterns.length > 0) {
    for (const pattern of includePatterns) {
      if (fileName.includes(pattern)) {
        return true;
      }
    }
    return false; // If include patterns specified but none match, exclude
  }
  
  return true;
}

function generateDirOutputPath(source: string, targetAgent: AgentId): string {
  const baseName = basename(source);
  return join(dirname(source), `${baseName}.${targetAgent}`);
}

function calculateDirTargetPath(sourceFile: string, sourceDir: string, outputDir: string, targetAgent: AgentId): string {
  const paths = calculateDirTargetPaths(sourceFile, sourceDir, outputDir, targetAgent);
  return paths.primary;
}

interface DualTargetPaths {
  primary: string;
  secondary?: string;
}

function calculateDirTargetPaths(sourceFile: string, sourceDir: string, outputDir: string, targetAgent: AgentId): DualTargetPaths {
  const relativePath = relative(sourceDir, sourceFile);
  const baseName = basename(sourceFile, ".md");
  const fullPath = sourceFile;
  
  // Map to target agent structure
  const agentInfo = AGENTS[targetAgent];
  const projectPath: string = agentInfo.configLocations.project || ".";
  let targetSubdir: string = "";
  
  // Check if this is a skill file (in a skills subdirectory)
  const isSkillFile = fullPath.includes("/skills/") || fullPath.includes("\\skills\\") || 
                      relativePath.includes("/skills/") || relativePath.includes("\\skills\\") ||
                      (relativePath.match(/^[^/]+\/SKILL\.md$/) !== null);
  
  if (isSkillFile) {
    // Extract skill name from path
    let skillName: string;
    
    const match1 = fullPath.match(/\/skills\/([^/]+)\//);
    const match2 = relativePath.match(/^([^/]+)\/SKILL\.md$/);
    const windowsMatchResult = fullPath.match(/\\skills\\([^\\]+)\\/)?. [1];
    const windowsMatch = typeof windowsMatchResult === 'string' ? windowsMatchResult : undefined;
    
    if (match1 && match1[1]) {
      skillName = match1[1];
    } else if (match2 && match2[1]) {
      skillName = match2[1];
    } else if (windowsMatch) {
      skillName = windowsMatch;
    } else {
      skillName = baseName;
    }
    
    if (targetAgent === "windsurf") {
      // Windsurf: Return dual paths for strategy=dual-output
      return {
        primary: join(outputDir, ".windsurf", "workflows", `${skillName}.md`),
        secondary: join(outputDir, ".windsurf", "skills", skillName, "SKILL.md"),
      };
    } else if (targetAgent === "cursor") {
      // Cursor: Skills are native in v2.4+ (.cursor/skills/<name>/SKILL.md).
      // Secondary (optional) command output can preserve explicit /command workflows.
      return {
        primary: join(outputDir, ".cursor", "skills", skillName, "SKILL.md"),
        secondary: join(outputDir, ".cursor", "commands", `${skillName}.md`),
      };
    } else if (targetAgent === "claude" || targetAgent === "opencode" || targetAgent === "codex") {
      targetSubdir = join(projectPath, skillName);
      return { primary: join(outputDir, targetSubdir, "SKILL.md") };
    } else {
      targetSubdir = join(projectPath, skillName);
    }
  } else if (relativePath.includes("/commands/") || relativePath.includes("\\commands\\")) {
    // Some agents use a base config directory (e.g. .cursor) with a commands subdir.
    if (targetAgent === "cursor") {
      targetSubdir = join(projectPath, "commands");
    } else {
      targetSubdir = projectPath;
    }
  } else if (relativePath.includes("/rules/") || relativePath.includes("\\rules\\")) {
    if (targetAgent === "cursor") {
      targetSubdir = join(projectPath, "rules");
    } else {
      targetSubdir = projectPath;
    }
  } else {
    targetSubdir = projectPath;
  }
  
  return { primary: join(outputDir, targetSubdir, `${basename(sourceFile, ".md")}.md`) };
}

function detectAgentFromContents(dir: string): AgentId | undefined {
  // Try to detect agent by looking at file contents
  const checkDir = (path: string, depth = 0): AgentId | undefined => {
    if (depth > 3) return undefined;
    
    try {
      const entries = readdirSync(path);
      
      for (const entry of entries) {
        const fullPath = join(path, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          const result = checkDir(fullPath, depth + 1);
          if (result) return result;
        } else if (entry.endsWith(".md")) {
          try {
            const content = readFileSync(fullPath, "utf-8");
            const detected = detectAgent(content, fullPath);
            if (detected) return detected;
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    } catch (e) {
      // Skip unreadable directories
    }
    
    return undefined;
  };
  
  return checkDir(dir);
}

// ============================================================================
// Helper functions
// ============================================================================

function showAgentGuidance(agent: AgentId, componentType: string): void {
  const guidance: Record<AgentId, Record<string, string[]>> = {
    claude: {
      skill: [
        "Place skills in .claude/skills/<name>/SKILL.md",
        "Use 'aliases' for alternative names",
        "Consider 'context: fork' for isolation",
        "Use 'allowed-tools' for security",
      ],
      command: [
        "Place commands in .claude/commands/",
        "Use clear 'argument-hint' descriptions",
      ],
    },
    opencode: {
      skill: [
        "Place skills in .opencode/skills/<name>/SKILL.md",
        "Use permission patterns for security",
        "Consider 'subtask: true' for isolation",
      ],
      command: [
        "Place commands in .opencode/commands/",
        "Use $ARGUMENTS for parameter access",
      ],
    },
    cursor: {
      skill: [
        "Place rules in .cursor/rules/",
        "Use .mdc format for advanced features",
        "Set 'alwaysApply' for automatic activation",
        "Use 'globs' for file pattern matching",
      ],
    },
    windsurf: {
      skill: [
        "Place workflows in .windsurf/workflows/",
        "Distinguish Skills from Workflows clearly",
        "Use numbered steps for Workflows",
      ],
    },
    codex: {
      skill: [
        "Place skills in .codex/skills/<name>/SKILL.md",
        "Configure MCP servers in config.toml",
        "Set appropriate 'approval_policy'",
        "Choose correct 'sandbox_mode'",
      ],
    },
    gemini: {
      skill: [
        "Place skills in .gemini/skills/<name>/SKILL.md",
        "Use 'code_execution' for running code",
        "Enable 'google_search' for web access",
        "Set appropriate 'temperature' (0.0-2.0)",
      ],
    },
    universal: { skill: [] },
    aider: { skill: [] },
    continue: { skill: [] },
  };

  const agentGuidance = guidance[agent]?.[componentType] || guidance[agent]?.["skill"] || [];
  
  if (agentGuidance.length > 0) {
    console.log(chalk.cyan(`   ${agent} ${componentType} best practices:`));
    agentGuidance.forEach(tip => {
      console.log(chalk.gray(`      • ${tip}`));
    });
  } else {
    console.log(chalk.gray(`   No specific guidance available for ${agent} ${componentType}`));
  }
  
  console.log();
  console.log(chalk.blue("   📖 Documentation:"));
  console.log(chalk.gray(`      • All agents: ${chalk.cyan("https://github.com/AIntelligentTech/cross-agent-compatibility-engine")}`));
}

function getScaffoldPaths(agent: AgentId, basePath: string, isUserLevel: boolean): string[] {
  const paths: string[] = [];
  
  switch (agent) {
    case "claude":
      if (isUserLevel) {
        paths.push(join(basePath, ".claude"));
        paths.push(join(basePath, ".claude", "skills"));
        paths.push(join(basePath, ".claude", "rules"));
      } else {
        paths.push(".claude");
        paths.push(".claude/skills");
        paths.push(".claude/rules");
      }
      break;
    case "cursor":
      if (isUserLevel) {
        paths.push(join(basePath, ".cursor"));
        paths.push(join(basePath, ".cursor", "rules"));
        paths.push(join(basePath, ".cursor", "commands"));
        paths.push(join(basePath, ".cursor", "skills"));
      } else {
        paths.push(".cursor");
        paths.push(".cursor/rules");
        paths.push(".cursor/commands");
        paths.push(".cursor/skills");
      }
      break;
    case "windsurf":
      if (isUserLevel) {
        paths.push(join(basePath, ".windsurf"));
        paths.push(join(basePath, ".windsurf", "skills"));
        paths.push(join(basePath, ".windsurf", "workflows"));
        paths.push(join(basePath, ".windsurf", "rules"));
      } else {
        paths.push(".windsurf");
        paths.push(".windsurf/skills");
        paths.push(".windsurf/workflows");
        paths.push(".windsurf/rules");
      }
      break;
    case "opencode":
      if (isUserLevel) {
        paths.push(join(basePath, ".config", "opencode"));
        paths.push(join(basePath, ".config", "opencode", "skills"));
        paths.push(join(basePath, ".config", "opencode", "commands"));
      } else {
        paths.push(".opencode");
        paths.push(".opencode/skills");
        paths.push(".opencode/commands");
      }
      break;
  }
  
  return paths;
}

function generateExampleComponent(
  agent: AgentId, 
  basePath: string, 
  name: string, 
  type: string,
  force: boolean
): string | null {
  let content = "";
  let path = "";
  
  switch (agent) {
    case "claude":
      if (type === "skill") {
        path = join(basePath, ".claude", "skills", name, "SKILL.md");
        content = `---\nname: ${name}\ndescription: Example ${name} skill\n---\n\nThis is an example skill for ${name}.\nAdd your instructions here.\n`;
      }
      break;
    case "cursor":
      if (type === "rule") {
        path = join(basePath, ".cursor", "rules", `${name}.mdc`);
        content = `---\ndescription: ${name} rule\nglobs: ["**/*.ts"]\nalwaysApply: false\n---\n\nAlways follow this rule when working with relevant files.\n`;
      } else if (type === "skill") {
        path = join(basePath, ".cursor", "skills", name, "SKILL.md");
        content = `---\nname: ${name}\ndescription: Example ${name} skill\n---\n\n# ${name}\n\nAdd your skill instructions here.\n`;
      } else if (type === "command") {
        path = join(basePath, ".cursor", "commands", `${name}.md`);
        content = `Run the ${name} process.\n\nAdd detailed instructions here.\n`;
      }
      break;
    case "windsurf":
      if (type === "skill") {
        path = join(basePath, ".windsurf", "skills", name, "skill.md");
        content = `---\nname: ${name}\ndescription: Example ${name} skill\n---\n\nThis is an example Windsurf skill.\nAdd procedural instructions here.\n`;
      } else if (type === "workflow") {
        path = join(basePath, ".windsurf", "workflows", `${name}.md`);
        content = `---\ndescription: ${name} workflow\n---\n\n1. First step\n2. Second step\n3. Complete the process\n`;
      }
      break;
    case "opencode":
      if (type === "command") {
        path = join(basePath, ".opencode", "commands", `${name}.md`);
        content = `---\ndescription: ${name} command\n---\n\nExecute ${name} with \$ARGUMENTS.\n`;
      }
      break;
  }
  
  if (!path || !content) return null;
  
  if (existsSync(path) && !force) {
    return null;
  }
  
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(path, content, "utf-8");
  return path;
}

// ============================================================================
// Dual-Output Strategy Helper Functions
// ============================================================================

function createWorkflowFromSkill(skillContent: string, spec: ComponentSpec | undefined): string {
  // Transform a Windsurf skill into a workflow-friendly format
  // Workflows are meant for manual /command invocation, so we adapt accordingly

  let workflowContent = skillContent;

  // Update frontmatter for workflow context
  workflowContent = workflowContent.replace(
    /^(---\n[\s\S]*?\n---)/,
    (frontmatter) => {
      // Add workflow-specific notes to description
      if (frontmatter.includes("description:")) {
        frontmatter = frontmatter.replace(
          /(description:.*)/,
          "$1\n# This workflow is invoked manually via /command",
        );
      }
      return frontmatter;
    }
  );

  // Add invocation guidance at the start of body
  if (!workflowContent.includes("## Usage")) {
    const usageNote = `\n> **Manual Invocation**: This workflow is designed for manual /command invocation.\n> For automatic progressive disclosure, use the skill file instead.\n\n`;
    workflowContent = workflowContent.replace(
      /(\n---)/,
      `\n---\n${usageNote}`,
    );
  }

  return workflowContent;
}

function detectAgentFromPath(path: string): AgentId | null {
  if (path.includes(".claude")) return "claude";
  if (path.includes(".cursor")) return "cursor";
  if (path.includes(".windsurf")) return "windsurf";
  if (path.includes(".opencode")) return "opencode";
  if (path.includes("AGENTS.md")) return "cursor";
  return null;
}

function detectComponentTypeFromPath(path: string): string | null {
  if (path.includes("/skills/")) return "skill";
  if (path.includes("/workflows/")) return "workflow";
  if (path.includes("/rules/")) return "rule";
  if (path.includes("/commands/")) return "command";
  if (path.includes("/agents/")) return "agent";
  if (path.endsWith("SKILL.md")) return "skill";
  if (path.endsWith(".mdc")) return "rule";
  return null;
}

function generateOutputPath(source: string, targetAgent: AgentId): string {
  const sourceName = basename(source, ".md");
  const baseDir = dirname(source);
  
  switch (targetAgent) {
    case "claude":
      return join(baseDir, ".claude", "skills", sourceName, "SKILL.md");
    case "cursor":
      return join(baseDir, ".cursor", "rules", `${sourceName}.mdc`);
    case "windsurf":
      return join(baseDir, ".windsurf", "skills", sourceName, "skill.md");
    case "opencode":
      return join(baseDir, ".opencode", "commands", `${sourceName}.md`);
    default:
      return join(baseDir, `${sourceName}.${targetAgent}.md`);
  }
}

// Register optimize command
optimizeCommand(program);

// Run the CLI
program.parse();
