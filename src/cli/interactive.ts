/**
 * Interactive REPL mode for CACE
 * Provides intuitive prompts, configuration guidance, and rich outputs
 */

import { createInterface } from "readline";
import chalk from "chalk";
import { existsSync, readFileSync } from "fs";
import type { AgentId } from "../core/types.js";
import { SUPPORTED_AGENTS } from "../core/constants.js";
import { validate } from "../validation/index.js";
import { parseComponent } from "../parsing/parser-factory.js";
import { renderComponent } from "../rendering/renderer-factory.js";
import { detectAgent } from "../parsing/parser-factory.js";

interface InteractiveSession {
  history: string[];
  preferences: {
    defaultSourceAgent?: AgentId;
    defaultTargetAgent?: AgentId;
    verbose: boolean;
    strict: boolean;
  };
}

const session: InteractiveSession = {
  history: [],
  preferences: {
    verbose: false,
    strict: false,
  },
};

export async function startInteractiveMode(): Promise<void> {
  console.clear();
  printBanner();
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.blue("🚀 Welcome to CACE Interactive Mode!\n"));
  console.log(chalk.gray("Type 'help' for available commands or 'quit' to exit.\n"));

  // Show initial disclaimer
  showDisclaimer();

  while (true) {
    const answer = await askQuestion(rl, chalk.cyan("cace> "));
    
    if (!answer.trim()) continue;
    
    session.history.push(answer);
    
    const parts = answer.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    
    if (!command) continue;
    
    try {
      switch (command.toLowerCase()) {
        case "help":
        case "?":
          showHelp();
          break;
        case "quit":
        case "exit":
        case "q":
          console.log(chalk.blue("\n👋 Goodbye!\n"));
          rl.close();
          return;
        case "convert":
          await interactiveConvert(rl, args.join(" "));
          break;
        case "validate":
          await interactiveValidate(rl, args.join(" "));
          break;
        case "agents":
          showAgents();
          break;
        case "config":
          await interactiveConfig(rl);
          break;
        case "disclaimer":
          showDisclaimer();
          break;
        case "demo":
          await runDemo(rl);
          break;
        case "status":
          showStatus();
          break;
        case "clear":
          console.clear();
          printBanner();
          break;
        default:
          console.log(chalk.red(`❌ Unknown command: ${command}`));
          console.log(chalk.gray("Type 'help' for available commands."));
      }
    } catch (error) {
      console.error(chalk.red("\n❌ Error:"), error instanceof Error ? error.message : String(error));
      console.log(chalk.gray("\n💡 Tip: Use 'help' to see available commands or 'disclaimer' for important information.\n"));
    }
  }
}

function printBanner(): void {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║                CACE - Interactive Mode v2.1.0                ║
║     Cross-Agent Compatibility Engine - 6 Agents Supported    ║
╚══════════════════════════════════════════════════════════════╝
  `));
}

function showDisclaimer(): void {
  console.log(chalk.yellow.bold("\n⚠️  IMPORTANT DISCLAIMER ⚠️\n"));
  console.log(chalk.yellow("• Conversions may lose agent-specific features"));
  console.log(chalk.yellow("• Security settings (allowed-tools, sandbox modes) require manual review"));
  console.log(chalk.yellow("• Always validate converted files before use"));
  console.log(chalk.yellow("• Test in a safe environment first\n"));
  console.log(chalk.gray("Type 'disclaimer' anytime to see this again.\n"));
}

function showHelp(): void {
  console.log(chalk.blue.bold("\n📖 Available Commands:\n"));
  
  const commands = [
    { cmd: "convert [file]", desc: "Convert a file interactively" },
    { cmd: "validate [file]", desc: "Validate a file interactively" },
    { cmd: "agents", desc: "Show supported agents and their features" },
    { cmd: "config", desc: "Configure preferences (verbose, strict, defaults)" },
    { cmd: "status", desc: "Show current session status" },
    { cmd: "demo", desc: "Run a guided demonstration" },
    { cmd: "disclaimer", desc: "Show important disclaimers" },
    { cmd: "clear", desc: "Clear the screen" },
    { cmd: "help, ?", desc: "Show this help" },
    { cmd: "quit, exit, q", desc: "Exit interactive mode" },
  ];
  
  commands.forEach(({ cmd, desc }) => {
    console.log(`  ${chalk.cyan(cmd.padEnd(20))} ${chalk.gray(desc)}`);
  });
  
  console.log(chalk.blue.bold("\n💡 Tips:\n"));
  console.log(`  ${chalk.gray("• Press Tab for command history")}`);
  console.log(`  ${chalk.gray("• Use verbose mode for detailed conversion reports")}`);
  console.log(`  ${chalk.gray("• Set default agents in config for faster workflow")}`);
  console.log();
}

async function interactiveConvert(rl: ReturnType<typeof createInterface>, filePath?: string): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 Interactive Conversion\n"));
  
  // Get source file
  let sourceFile = filePath;
  if (!sourceFile) {
    sourceFile = await askQuestion(rl, chalk.cyan("📄 Enter file path to convert: "));
  }
  
  if (!existsSync(sourceFile)) {
    console.log(chalk.red(`\n❌ File not found: ${sourceFile}`));
    console.log(chalk.gray("Make sure the file exists and the path is correct."));
    return;
  }
  
  // Read and detect source
  const content = readFileSync(sourceFile, "utf-8");
  const detectedAgent = detectAgent(content, sourceFile);
  
  if (detectedAgent) {
    console.log(chalk.green(`  ✓ Detected source agent: ${detectedAgent}`));
  } else {
    console.log(chalk.yellow("  ⚠ Could not auto-detect source agent"));
  }
  
  // Source agent selection
  let sourceAgent: AgentId | undefined = detectedAgent || session.preferences.defaultSourceAgent;
  if (!sourceAgent) {
    console.log(chalk.blue("\n🤖 Select source agent:"));
    SUPPORTED_AGENTS.forEach((agent, i) => {
      console.log(`  ${chalk.cyan(`${i + 1}.`)} ${agent}`);
    });
    const choice = await askQuestion(rl, chalk.cyan("Enter number: "));
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < SUPPORTED_AGENTS.length) {
      sourceAgent = SUPPORTED_AGENTS[index];
    }
  }
  
  if (!sourceAgent) {
    console.log(chalk.red("❌ No source agent selected"));
    return;
  }
  
  // Target agent selection
  console.log(chalk.blue("\n🎯 Select target agent:"));
  const availableTargets = SUPPORTED_AGENTS.filter(a => a !== sourceAgent);
  availableTargets.forEach((agent, i) => {
    const isRecommended = (sourceAgent === "claude" && agent === "opencode") ||
                         (sourceAgent === "opencode" && agent === "claude");
    const marker = isRecommended ? chalk.green(" (recommended)") : "";
    console.log(`  ${chalk.cyan(`${i + 1}.`)} ${agent}${marker}`);
  });
  
  const targetChoice = await askQuestion(rl, chalk.cyan("Enter number: "));
  const targetIndex = parseInt(targetChoice) - 1;
  const targetAgent = availableTargets[targetIndex];
  
  if (!targetAgent) {
    console.log(chalk.red("❌ Invalid target agent selected"));
    return;
  }
  
  // Show conversion warning
  showConversionWarning(sourceAgent, targetAgent);
  
  // Confirm
  const confirm = await askQuestion(rl, chalk.yellow("⚠️  Proceed with conversion? (yes/no): "));
  if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
    console.log(chalk.gray("\n❌ Conversion cancelled."));
    return;
  }
  
  // Perform conversion
  console.log(chalk.blue("\n🔄 Converting...\n"));
  
  try {
    const parseResult = parseComponent(content, { sourceFile, agentId: sourceAgent });
    
    if (!parseResult.success || !parseResult.spec) {
      console.log(chalk.red("❌ Parse failed:"));
      parseResult.errors.forEach(err => console.log(chalk.red(`   • ${err}`)));
      return;
    }
    
    const renderResult = renderComponent(parseResult.spec, targetAgent, {
      includeComments: true,
      validateOutput: true,
    });
    
    if (!renderResult.success) {
      console.log(chalk.red("❌ Render failed:"));
      renderResult.errors.forEach(err => console.log(chalk.red(`   • ${err}`)));
      return;
    }
    
    // Show results
    console.log(chalk.green.bold("✅ Conversion successful!\n"));
    
    if (renderResult.report) {
      const score = renderResult.report.fidelityScore;
      const color = score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;
      console.log(`  Fidelity Score: ${color(`${score}%`)}`);
      
      if (renderResult.report.losses.length > 0) {
        console.log(chalk.yellow(`\n  ⚠️  Features that may need attention (${renderResult.report.losses.length}):`));
        renderResult.report.losses.forEach(loss => {
          const sevColor = loss.severity === "critical" ? chalk.red : 
                          loss.severity === "warning" ? chalk.yellow : chalk.gray;
          console.log(sevColor(`     • [${loss.severity.toUpperCase()}] ${loss.description}`));
          if (loss.recommendation) {
            console.log(chalk.gray(`       💡 ${loss.recommendation}`));
          }
        });
      }
      
      if (renderResult.report.warnings.length > 0) {
        console.log(chalk.yellow(`\n  ⚠️  Warnings (${renderResult.report.warnings.length}):`));
        renderResult.report.warnings.forEach(warn => {
          console.log(chalk.yellow(`     • ${warn.message}`));
        });
      }
      
      if (renderResult.report.suggestions.length > 0) {
        console.log(chalk.blue(`\n  💡 Suggestions:`));
        renderResult.report.suggestions.forEach(sugg => {
          console.log(chalk.blue(`     • ${sugg}`));
        });
      }
    }
    
    // Output path
    const outputPath = sourceFile.replace(/\.md$/, `.${targetAgent}.md`);
    console.log(chalk.blue(`\n💾 Output would be saved to: ${outputPath}`));
    
    const saveNow = await askQuestion(rl, chalk.cyan("Save now? (yes/no): "));
    if ((saveNow.toLowerCase() === "yes" || saveNow.toLowerCase() === "y") && renderResult.content) {
      const { writeFileSync } = await import("fs");
      writeFileSync(outputPath, renderResult.content, "utf-8");
      console.log(chalk.green(`\n✅ Saved to: ${outputPath}`));
    } else if (!renderResult.content) {
      console.log(chalk.red("\n❌ No content to save."));
    } else {
      console.log(chalk.gray("\n💡 You can copy the output above or run the conversion again."));
    }
    
    // Validate suggestion
    console.log(chalk.blue("\n💡 Tip: Validate the converted file:"));
    console.log(chalk.gray(`   cace validate ${outputPath} --agent ${targetAgent}`));
    
  } catch (error) {
    console.error(chalk.red("\n❌ Conversion error:"), error instanceof Error ? error.message : String(error));
  }
  
  console.log();
}

async function interactiveValidate(rl: ReturnType<typeof createInterface>, filePath?: string): Promise<void> {
  console.log(chalk.blue.bold("\n✓ Interactive Validation\n"));
  
  let sourceFile = filePath;
  if (!sourceFile) {
    sourceFile = await askQuestion(rl, chalk.cyan("📄 Enter file path to validate: "));
  }
  
  if (!existsSync(sourceFile)) {
    console.log(chalk.red(`\n❌ File not found: ${sourceFile}`));
    return;
  }
  
  const content = readFileSync(sourceFile, "utf-8");
  const detectedAgent = detectAgent(content, sourceFile);
  
  let agent: AgentId | undefined = detectedAgent;
  if (!agent) {
    console.log(chalk.blue("\n🤖 Select agent type:"));
    SUPPORTED_AGENTS.forEach((a, i) => {
      console.log(`  ${chalk.cyan(`${i + 1}.`)} ${a}`);
    });
    const choice = await askQuestion(rl, chalk.cyan("Enter number: "));
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < SUPPORTED_AGENTS.length) {
      agent = SUPPORTED_AGENTS[index];
    }
  }
  
  if (!agent) {
    console.log(chalk.red("❌ No agent selected"));
    return;
  }
  
  console.log(chalk.blue(`\n🔍 Validating as ${agent}...\n`));
  
  try {
    // Try to detect component type from filename
    let componentType: "skill" | "command" | "rule" | "memory" | "workflow" = "skill";
    if (sourceFile.includes("command")) componentType = "command";
    else if (sourceFile.includes("rule")) componentType = "rule";
    else if (sourceFile.includes("memory")) componentType = "memory";
    else if (sourceFile.includes("workflow")) componentType = "workflow";
    
    const result = validate(content, agent, componentType, { strict: session.preferences.strict });
    
    if (result.valid && result.warnings.length === 0 && result.info.length === 0) {
      console.log(chalk.green.bold("✅ Validation passed! No issues found.\n"));
    } else if (result.valid) {
      console.log(chalk.green("✅ Validation passed with warnings/info:\n"));
    } else {
      console.log(chalk.red.bold("❌ Validation failed!\n"));
    }
    
    if (result.issues.length > 0) {
      console.log(chalk.red(`Errors (${result.issues.length}):`));
      result.issues.forEach(issue => {
        console.log(chalk.red(`  ❌ [${issue.code}] ${issue.message}`));
        if (issue.suggestion) {
          console.log(chalk.gray(`     💡 ${issue.suggestion}`));
        }
      });
      console.log();
    }
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow(`Warnings (${result.warnings.length}):`));
      result.warnings.forEach(warn => {
        console.log(chalk.yellow(`  ⚠️  [${warn.code}] ${warn.message}`));
        if (warn.suggestion) {
          console.log(chalk.gray(`     💡 ${warn.suggestion}`));
        }
      });
      console.log();
    }
    
    if (result.info.length > 0) {
      console.log(chalk.blue(`Info (${result.info.length}):`));
      result.info.forEach(info => {
        console.log(chalk.blue(`  ℹ️  [${info.code}] ${info.message}`));
      });
      console.log();
    }
    
    if (result.valid) {
      console.log(chalk.green("✅ File is ready to use!\n"));
    } else {
      console.log(chalk.yellow("⚠️  Please fix the errors above before using this file.\n"));
    }
    
  } catch (error) {
    console.error(chalk.red("\n❌ Validation error:"), error instanceof Error ? error.message : String(error));
  }
}

function showAgents(): void {
  console.log(chalk.blue.bold("\n🤖 Supported Agents:\n"));
  
  const agents: { id: AgentId; name: string; features: string[] }[] = [
    { id: "claude", name: "Claude Code", features: ["Skills", "Commands", "Rules", "Hooks", "Memory", "Agent delegation", "context: fork", "allowed-tools"] },
    { id: "opencode", name: "OpenCode", features: ["Skills", "Commands", "Agents", "Permission patterns", "Subtask isolation", "@filename references"] },
    { id: "cursor", name: "Cursor", features: ["Commands", "Rules (.mdc)", "AGENTS.md support", "Rule selection UI"] },
    { id: "windsurf", name: "Windsurf", features: ["Skills", "Workflows", "Rules", "Multi-level hooks", "Cascade modes"] },
    { id: "codex", name: "OpenAI Codex", features: ["Skills", "Commands", "Rules", "MCP servers", "Approval policies", "Sandbox modes", "TOML config"] },
    { id: "gemini", name: "Google Gemini", features: ["Skills", "Commands", "Memory", "Code execution", "Google search", "Multi-directory", "ADK"] },
  ];
  
  agents.forEach(agent => {
    console.log(chalk.cyan.bold(`  ${agent.name} (${agent.id})`));
    console.log(chalk.gray(`    Features: ${agent.features.join(", ")}`));
    console.log();
  });
  
  console.log(chalk.gray("💡 Use 'convert' to move between any of these agents.\n"));
}

async function interactiveConfig(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log(chalk.blue.bold("\n⚙️  Configuration\n"));
  
  console.log(chalk.blue("Current settings:"));
  console.log(`  Verbose mode: ${session.preferences.verbose ? chalk.green("ON") : chalk.gray("OFF")}`);
  console.log(`  Strict validation: ${session.preferences.strict ? chalk.green("ON") : chalk.gray("OFF")}`);
  console.log(`  Default source agent: ${session.preferences.defaultSourceAgent || chalk.gray("(none)")}`);
  console.log(`  Default target agent: ${session.preferences.defaultTargetAgent || chalk.gray("(none)")}`);
  console.log();
  
  const options = [
    "Toggle verbose mode",
    "Toggle strict validation",
    "Set default source agent",
    "Set default target agent",
    "Back to main menu",
  ];
  
  options.forEach((opt, i) => {
    console.log(`  ${chalk.cyan(`${i + 1}.`)} ${opt}`);
  });
  
  const choice = await askQuestion(rl, chalk.cyan("\nSelect option: "));
  
  switch (choice) {
    case "1":
      session.preferences.verbose = !session.preferences.verbose;
      console.log(chalk.green(`Verbose mode ${session.preferences.verbose ? "enabled" : "disabled"}.`));
      break;
    case "2":
      session.preferences.strict = !session.preferences.strict;
      console.log(chalk.green(`Strict validation ${session.preferences.strict ? "enabled" : "disabled"}.`));
      break;
    case "3":
      console.log(chalk.blue("\nSelect default source agent:"));
      SUPPORTED_AGENTS.forEach((a, i) => console.log(`  ${chalk.cyan(`${i + 1}.`)} ${a}`));
      const srcChoice = await askQuestion(rl, chalk.cyan("Enter number: "));
      const srcIdx = parseInt(srcChoice) - 1;
      if (srcIdx >= 0 && srcIdx < SUPPORTED_AGENTS.length) {
        session.preferences.defaultSourceAgent = SUPPORTED_AGENTS[srcIdx];
        console.log(chalk.green(`Default source agent set to: ${session.preferences.defaultSourceAgent}`));
      }
      break;
    case "4":
      console.log(chalk.blue("\nSelect default target agent:"));
      SUPPORTED_AGENTS.forEach((a, i) => console.log(`  ${chalk.cyan(`${i + 1}.`)} ${a}`));
      const tgtChoice = await askQuestion(rl, chalk.cyan("Enter number: "));
      const tgtIdx = parseInt(tgtChoice) - 1;
      if (tgtIdx >= 0 && tgtIdx < SUPPORTED_AGENTS.length) {
        session.preferences.defaultTargetAgent = SUPPORTED_AGENTS[tgtIdx];
        console.log(chalk.green(`Default target agent set to: ${session.preferences.defaultTargetAgent}`));
      }
      break;
    case "5":
    default:
      console.log(chalk.gray("Returning to main menu..."));
  }
  
  console.log();
}

function showStatus(): void {
  console.log(chalk.blue.bold("\n📊 Session Status\n"));
  console.log(`  Commands entered: ${session.history.length}`);
  console.log(`  Verbose mode: ${session.preferences.verbose ? chalk.green("ON") : chalk.gray("OFF")}`);
  console.log(`  Strict validation: ${session.preferences.strict ? chalk.green("ON") : chalk.gray("OFF")}`);
  if (session.preferences.defaultSourceAgent) {
    console.log(`  Default source: ${chalk.cyan(session.preferences.defaultSourceAgent)}`);
  }
  if (session.preferences.defaultTargetAgent) {
    console.log(`  Default target: ${chalk.cyan(session.preferences.defaultTargetAgent)}`);
  }
  console.log();
}

async function runDemo(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log(chalk.blue.bold("\n🎮 Guided Demonstration\n"));
  console.log(chalk.gray("This demo will walk you through a typical conversion workflow.\n"));
  
  await askQuestion(rl, chalk.cyan("Press Enter to start..."));
  
  console.log(chalk.blue("\nStep 1: Understanding the agents"));
  console.log(chalk.gray("CACE supports 6 AI coding agents with different strengths:"));
  console.log(chalk.gray("  • Claude: Rich skill system with agent delegation"));
  console.log(chalk.gray("  • OpenCode: Permission-based security model"));
  console.log(chalk.gray("  • Codex: MCP servers and approval policies"));
  console.log(chalk.gray("  • Gemini: Built-in code execution and search"));
  
  await askQuestion(rl, chalk.cyan("\nPress Enter to continue..."));
  
  console.log(chalk.blue("\nStep 2: Preparing for conversion"));
  console.log(chalk.yellow("⚠️  Before converting:"));
  console.log(chalk.gray("  1. Backup your original files"));
  console.log(chalk.gray("  2. Review the conversion fidelity score"));
  console.log(chalk.gray("  3. Test converted files in a safe environment"));
  
  await askQuestion(rl, chalk.cyan("\nPress Enter to continue..."));
  
  console.log(chalk.blue("\nStep 3: Example conversion"));
  console.log(chalk.gray("Let's say you have a Claude skill and want to convert it to Codex:"));
  console.log();
  console.log(chalk.cyan("  cace> convert my-skill.md"));
  console.log(chalk.gray("  ✓ Detected source agent: claude"));
  console.log(chalk.gray("  🎯 Select target agent: 5 (codex)"));
  console.log(chalk.gray("  ⚠️  Proceed with conversion? yes"));
  console.log();
  console.log(chalk.green("  ✅ Conversion successful!"));
  console.log(chalk.gray("  Fidelity Score: 92%"));
  console.log(chalk.yellow("  ⚠️  Features that may need attention (2):"));
  console.log(chalk.yellow("     • [INFO] context: fork not supported in Codex"));
  console.log(chalk.yellow("     • [WARNING] allowed-tools - use sandbox_mode instead"));
  
  await askQuestion(rl, chalk.cyan("\nPress Enter to finish..."));
  
  console.log(chalk.green.bold("\n✅ Demo complete!\n"));
  console.log(chalk.blue("Next steps:"));
  console.log(chalk.gray("  1. Try 'convert' with your own files"));
  console.log(chalk.gray("  2. Use 'validate' to check converted files"));
  console.log(chalk.gray("  3. Set default agents in 'config' for faster workflow"));
  console.log();
}

function showConversionWarning(source: AgentId, target: AgentId): void {
  console.log(chalk.yellow.bold("\n⚠️  Conversion Warning\n"));
  
  // Critical features that get lost
  const criticalLosses: Record<string, string[]> = {
    claude: ["context: fork (context isolation)", "agent: delegation", "allowed-tools (security boundary)"],
    opencode: ["Permission patterns (allow/deny/ask)", "Subtask isolation"],
    codex: ["Approval policies (use safety levels)", "MCP server config format"],
    gemini: ["Temperature/max_tokens (metadata only)"],
  };
  
  const sourceLosses = criticalLosses[source] || [];
  if (sourceLosses.length > 0) {
    console.log(chalk.yellow(`Converting from ${source} to ${target} may lose:`));
    sourceLosses.forEach(loss => {
      console.log(chalk.yellow(`  • ${loss}`));
    });
    console.log();
  }
  
  console.log(chalk.gray("💡 These features will be documented in the output for manual review.\n"));
}

function askQuestion(rl: ReturnType<typeof createInterface>, query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// Helper function that's used but not exported above
function getScaffoldPaths(agent: AgentId, basePath: string, isUserLevel: boolean): string[] {
  // This is a simplified version - the real implementation would be in index.ts
  const paths: Record<AgentId, { project: string[]; user: string[] }> = {
    claude: { project: [".claude/skills"], user: [".claude/skills"] },
    opencode: { project: [".opencode/skills"], user: [".opencode/skills"] },
    cursor: { project: [".cursor/commands"], user: [".cursor/commands"] },
    windsurf: { project: [".windsurf/workflows"], user: [".windsurf/workflows"] },
    codex: { project: [".codex/skills"], user: [".codex/skills"] },
    gemini: { project: [".gemini/skills"], user: [".gemini/skills"] },
    universal: { project: ["."], user: ["."] },
    aider: { project: [".aider"], user: [".aider"] },
    continue: { project: [".continue"], user: [".continue"] },
  };
  
  const agentPaths = paths[agent];
  return isUserLevel ? agentPaths.user : agentPaths.project;
}
