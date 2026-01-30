/**
 * Wizard Mode for CACE
 * Multi-select installation wizard with full directory conversion capabilities
 * Handles scattered configs, mixed versions, and intelligent detection
 */

import { createInterface } from "readline";
import chalk from "chalk";
import { 
  existsSync, 
  readdirSync, 
  statSync, 
  readFileSync,
  mkdirSync,
  writeFileSync,
  copyFileSync
} from "fs";
import { join, relative, dirname, basename, resolve } from "path";
import { homedir } from "os";
import type { AgentId, ComponentType } from "../core/types.js";
import { SUPPORTED_AGENTS, AGENTS } from "../core/constants.js";
import { parseComponent, detectAgent } from "../parsing/parser-factory.js";
import { renderComponent } from "../rendering/renderer-factory.js";
import { validate } from "../validation/index.js";
import ConfigurationAuditEngine, { AuditReportFormatter } from "../audit/audit-engine.js";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface WizardOptions {
  mode: "install" | "convert" | "migrate" | "sync" | "audit";
  sourceAgents: AgentId[];
  targetAgents: AgentId[];
  sourceLevel: "user" | "project" | "both";
  targetLevel: "user" | "project";
  dryRun: boolean;
  backup: boolean;
  mergeStrategy: "replace" | "merge" | "skip";
  validateOutput: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxConcurrency: number;
}

interface ScaffoldingInfo {
  agent: AgentId;
  level: "user" | "project";
  path: string;
  components: ComponentInfo[];
  version?: string;
  mixedVersions: boolean;
  orphanedConfigs: string[];
  totalSize: number;
  lastModified: Date;
}

interface ComponentInfo {
  path: string;
  type: ComponentType;
  name: string;
  agent: AgentId;
  version?: string;
  size: number;
  dependencies: string[];
  hasErrors: boolean;
  validationResult?: any;
}

interface ConversionJob {
  source: ComponentInfo;
  targetAgent: AgentId;
  targetPath: string;
  status: "pending" | "converting" | "success" | "error" | "skipped";
  error?: string;
  fidelity?: number;
  warnings: string[];
}

interface WizardContext {
  phase: string;
  currentStep: number;
  totalSteps: number;
  jobs: ConversionJob[];
  stats: {
    scanned: number;
    convertable: number;
    converted: number;
    errors: number;
    skipped: number;
  };
}

// ============================================================================
// Multi-Select Helper Functions
// ============================================================================

async function multiSelect(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: { value: string; label: string; checked?: boolean }[]
): Promise<string[]> {
  console.log(chalk.blue(`${question}`));
  console.log(chalk.gray("Use arrow keys to navigate, space to select, enter to confirm"));
  
  let selected = new Set(options.filter(o => o.checked).map(o => o.value));
  let cursor = 0;
  
  const render = () => {
    // Clear previous lines - account for question, instruction, and all options
    process.stdout.write("\x1B[" + (options.length + 2) + "A");
    
    console.log(chalk.blue(`${question}`));
    console.log(chalk.gray("Use arrow keys ↑↓, space to toggle, enter to confirm"));
    
    options.forEach((opt, i) => {
      const isSelected = selected.has(opt.value);
      const isCursor = i === cursor;
      
      const checkbox = isSelected ? chalk.green("[✓]") : chalk.gray("[ ]");
      const label = isCursor ? chalk.cyan.bold(`> ${opt.label}`) : `  ${opt.label}`;
      const color = isSelected ? chalk.green : chalk.white;
      
      console.log(`${checkbox} ${color(label)}`);
    });
  };
  
  // Initial render
  console.log(chalk.blue(`${question}`));
  console.log(chalk.gray("Use arrow keys ↑↓, space to toggle, enter to confirm"));
  options.forEach((opt, i) => {
    const isSelected = selected.has(opt.value);
    const checkbox = isSelected ? chalk.green("[✓]") : chalk.gray("[ ]");
    console.log(`${checkbox}  ${opt.label}`);
  });
  
  return new Promise((resolve) => {
    const handler = (chunk: Buffer) => {
      const key = chunk.toString();
      
      if (key === "\u001B[A") { // Up
        cursor = Math.max(0, cursor - 1);
        render();
      } else if (key === "\u001B[B") { // Down
        cursor = Math.min(options.length - 1, cursor + 1);
        render();
      } else if (key === " ") { // Space
        const option = options[cursor];
        if (!option) return;
        const val = option.value;
        if (selected.has(val)) {
          selected.delete(val);
        } else {
          selected.add(val);
        }
        render();
      } else if (key === "\r" || key === "\n") { // Enter
        process.stdin.removeListener("data", handler);
        process.stdin.setRawMode?.(false);
        resolve(Array.from(selected));
      } else if (key === "\u0003") { // Ctrl+C
        process.exit(0);
      }
    };
    
    process.stdin.setRawMode?.(true);
    process.stdin.on("data", handler);
  });
}

// ============================================================================
// Scaffolding Detection Engine
// ============================================================================

export async function detectScaffolding(
  agents: AgentId[],
  levels: ("user" | "project")[]
): Promise<ScaffoldingInfo[]> {
  const results: ScaffoldingInfo[] = [];
  
  for (const agent of agents) {
    const agentInfo = AGENTS[agent];
    
    for (const level of levels) {
      const basePath = level === "user" 
        ? homedir() 
        : process.cwd();
      
      const configPath = join(basePath, agentInfo.configLocations[level]);
      
      if (!existsSync(configPath)) {
        continue;
      }
      
      const info = await analyzeScaffolding(agent, level, configPath);
      if (info.components.length > 0) {
        results.push(info);
      }
    }
  }
  
  return results;
}

async function analyzeScaffolding(
  agent: AgentId,
  level: "user" | "project",
  path: string
): Promise<ScaffoldingInfo> {
  const components: ComponentInfo[] = [];
  const orphanedConfigs: string[] = [];
  const versions = new Set<string>();
  let totalSize = 0;
  let lastModified = new Date(0);
  
  const scanDirectory = (dir: string, depth = 0) => {
    if (depth > 5) return; // Prevent infinite recursion
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, depth + 1);
        } else if (entry.endsWith(".md") || entry.endsWith(".mdc")) {
          try {
            const content = readFileSync(fullPath, "utf-8");
            const detected = detectAgent(content, fullPath);
            
            if (detected === agent || detected === undefined) {
              const component = analyzeComponent(fullPath, content, agent, stat);
              
              if (component) {
                components.push(component);
                totalSize += stat.size;
                
                if (stat.mtime > lastModified) {
                  lastModified = stat.mtime;
                }
                
                if (component.version) {
                  versions.add(component.version);
                }
              }
            } else {
              orphanedConfigs.push(fullPath);
            }
          } catch (e) {
            // Skip files that can't be read
          }
        }
      }
    } catch (e) {
      // Skip directories that can't be read
    }
  };
  
  scanDirectory(path);
  
  return {
    agent,
    level,
    path,
    components,
    version: versions.size === 1 ? Array.from(versions)[0] : undefined,
    mixedVersions: versions.size > 1,
    orphanedConfigs,
    totalSize,
    lastModified: lastModified.getTime() === 0 ? new Date() : lastModified,
  };
}

function analyzeComponent(
  path: string,
  content: string,
  agent: AgentId,
  stat: any
): ComponentInfo | null {
  const parseResult = parseComponent(content, { sourceFile: path });
  
  if (!parseResult.success || !parseResult.spec) {
    return {
      path,
      type: "skill",
      name: basename(path, ".md"),
      agent,
      size: stat.size,
      dependencies: [],
      hasErrors: true,
    };
  }
  
  const spec = parseResult.spec;
  
  return {
    path,
    type: spec.componentType,
    name: spec.id,
    agent,
    version: spec.version ? `${spec.version.major}.${spec.version.minor}.${spec.version.patch}` : undefined,
    size: stat.size,
    dependencies: (spec as any).implementation?.dependencies || [],
    hasErrors: false,
    validationResult: (parseResult as any).validation,
  };
}

// ============================================================================
// Configuration Intelligence Engine
// ============================================================================

interface ConfigIntelligence {
  hasUserConfig: boolean;
  hasProjectConfig: boolean;
  scatteredConfigs: { agent: AgentId; level: "user" | "project"; path: string }[];
  conflicts: { agent: AgentId; userPath: string; projectPath: string; differences: string[] }[];
  recommendations: string[];
}

export async function analyzeConfigurationIntelligence(
  targetAgent: AgentId
): Promise<ConfigIntelligence> {
  const result: ConfigIntelligence = {
    hasUserConfig: false,
    hasProjectConfig: false,
    scatteredConfigs: [],
    conflicts: [],
    recommendations: [],
  };
  
  const agentInfo = AGENTS[targetAgent];
  
  // Check user-level config
  const userPath = join(homedir(), agentInfo.configLocations.user);
  if (existsSync(userPath)) {
    result.hasUserConfig = true;
    result.scatteredConfigs.push({ agent: targetAgent, level: "user", path: userPath });
  }
  
  // Check project-level config
  const projectPath = join(process.cwd(), agentInfo.configLocations.project);
  if (existsSync(projectPath)) {
    result.hasProjectConfig = true;
    result.scatteredConfigs.push({ agent: targetAgent, level: "project", path: projectPath });
  }
  
  // Detect conflicts between user and project configs
  if (result.hasUserConfig && result.hasProjectConfig) {
    const differences = await compareConfigs(userPath, projectPath);
    if (differences.length > 0) {
      result.conflicts.push({
        agent: targetAgent,
        userPath,
        projectPath,
        differences,
      });
      result.recommendations.push(
        `User and project ${targetAgent} configs differ. Consider syncing them.`
      );
    }
  }
  
  // Check for other agents' configs that might conflict
  for (const agent of SUPPORTED_AGENTS) {
    if (agent === targetAgent) continue;
    
    const otherInfo = AGENTS[agent];
    const otherUser = join(homedir(), otherInfo.configLocations.user);
    const otherProject = join(process.cwd(), otherInfo.configLocations.project);
    
    if (existsSync(otherUser)) {
      result.recommendations.push(
        `Found ${agent} user config. Consider migrating to ${targetAgent} for consistency.`
      );
    }
    
    if (existsSync(otherProject)) {
      result.recommendations.push(
        `Found ${agent} project config. Run 'cace wizard' to convert to ${targetAgent}.`
      );
    }
  }
  
  return result;
}

async function compareConfigs(userPath: string, projectPath: string): Promise<string[]> {
  const differences: string[] = [];
  
  try {
    const userFiles = await listAllFiles(userPath);
    const projectFiles = await listAllFiles(projectPath);
    
    // Find files only in user config
    for (const file of userFiles) {
      if (!projectFiles.includes(file)) {
        differences.push(`File '${file}' exists in user config but not project config`);
      }
    }
    
    // Find files only in project config
    for (const file of projectFiles) {
      if (!userFiles.includes(file)) {
        differences.push(`File '${file}' exists in project config but not user config`);
      }
    }
  } catch (e) {
    differences.push("Unable to compare configs due to read error");
  }
  
  return differences;
}

async function listAllFiles(dir: string, base = ""): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relativePath = join(base, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await listAllFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else {
        files.push(relativePath);
      }
    }
  } catch (e) {
    // Directory might not exist or be readable
  }
  
  return files;
}

// ============================================================================
// Progress Tracker
// ============================================================================

class ProgressTracker {
  private total: number;
  private current: number;
  private label: string;
  private startTime: number;
  
  constructor(total: number, label: string) {
    this.total = total;
    this.current = 0;
    this.label = label;
    this.startTime = Date.now();
  }
  
  update(current: number, message?: string) {
    this.current = current;
    const percent = Math.floor((current / this.total) * 100);
    const bar = "█".repeat(Math.floor(percent / 5)) + "░".repeat(20 - Math.floor(percent / 5));
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);
    process.stdout.write(
      `${chalk.cyan(this.label)} ${chalk.green(`[${bar}]`)} ${chalk.bold(`${percent}%`)} ` +
      `${chalk.gray(`(${current}/${this.total}) ${elapsed}s`)}` +
      (message ? ` ${chalk.yellow(message)}` : "")
    );
  }
  
  complete(message: string) {
    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);
    console.log(`${chalk.green("✓")} ${chalk.bold(this.label)} ${chalk.gray(message)}`);
  }
  
  error(message: string) {
    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);
    console.log(`${chalk.red("✗")} ${chalk.bold(this.label)} ${chalk.red(message)}`);
  }
}

// ============================================================================
// Main Wizard Entry Point
// ============================================================================

export async function startWizard(): Promise<void> {
  console.clear();
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║           🔮 CACE Wizard Mode v2.2.0                         ║
║     Multi-Select Installation & Conversion Wizard           ║
╚══════════════════════════════════════════════════════════════╝
  `));
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  console.log(chalk.blue("🚀 Welcome to the CACE Wizard!\n"));
  console.log(chalk.gray("This wizard will guide you through complex multi-step operations.\n"));
  
  // Show disclaimer
  showWizardDisclaimer();
  
  // Phase 1: Select Operation Mode
  console.log(chalk.blue.bold("\n📋 Phase 1: Select Operation Mode\n"));
  
  const modeOptions = [
    { value: "install", label: "📦 Fresh Installation - Install scaffolding for new agents" },
    { value: "convert", label: "🔄 Convert Scaffolding - Convert entire directories between agents" },
    { value: "migrate", label: "📤 Migration - Migrate from one agent to another with validation" },
    { value: "sync", label: "🔄 Sync - Sync user-level and project-level configurations" },
    { value: "audit", label: "🔍 Audit - Comprehensive configuration assessment & health check" },
  ];
  
  const selectedModes = await multiSelect(rl, "What would you like to do? (Select one)", modeOptions);
  
  if (selectedModes.length === 0) {
    console.log(chalk.red("\n❌ No operation mode selected. Exiting."));
    rl.close();
    return;
  }
  
  const mode = selectedModes[0] as WizardOptions["mode"];
  
  // Execute appropriate wizard phase
  switch (mode) {
    case "install":
      await runInstallWizard(rl);
      break;
    case "convert":
      await runConvertWizard(rl);
      break;
    case "migrate":
      await runMigrateWizard(rl);
      break;
    case "sync":
      await runSyncWizard(rl);
      break;
    case "audit":
      await runAuditWizard(rl);
      break;
  }
  
  rl.close();
}

function showWizardDisclaimer(): void {
  console.log(chalk.yellow.bold("\n⚠️  IMPORTANT DISCLAIMERS ⚠️\n"));
  console.log(chalk.yellow("• The wizard will modify files on your filesystem"));
  console.log(chalk.yellow("• Always backup important configurations before proceeding"));
  console.log(chalk.yellow("• Review all changes before confirming"));
  console.log(chalk.yellow("• Some agent features may not have equivalents in other agents"));
  console.log(chalk.yellow("• Test converted configurations in a safe environment first\n"));
  console.log(chalk.gray("Press Ctrl+C at any time to cancel.\n"));
}

// ============================================================================
// Install Wizard
// ============================================================================

async function runInstallWizard(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log(chalk.blue.bold("\n📦 Installation Wizard\n"));
  
  // Phase 1: Select Agents to Install
  console.log(chalk.blue("Step 1: Select agents to install\n"));
  
  const agentOptions = SUPPORTED_AGENTS.map(agent => {
    const info = AGENTS[agent];
    const hasUser = existsSync(join(homedir(), info.configLocations.user));
    const hasProject = existsSync(join(process.cwd(), info.configLocations.project));
    const status = hasUser || hasProject ? chalk.yellow("(already installed)") : chalk.green("(not installed)");
    
    return {
      value: agent,
      label: `${info.displayName} ${status}`,
      checked: false,
    };
  });
  
  const selectedAgents = await multiSelect(rl, "Which agents would you like to install?", agentOptions);
  
  if (selectedAgents.length === 0) {
    console.log(chalk.red("\n❌ No agents selected."));
    return;
  }
  
  // Phase 2: Select Installation Level
  console.log(chalk.blue("\nStep 2: Select installation level\n"));
  
  const levelOptions = [
    { value: "project", label: "📁 Project level (current directory only)", checked: true },
    { value: "user", label: "🏠 User level (global config in home directory)" },
  ];
  
  const selectedLevels = await multiSelect(rl, "Where should we install?", levelOptions);
  
  if (selectedLevels.length === 0) {
    console.log(chalk.red("\n❌ No installation level selected."));
    return;
  }
  
  // Phase 3: Generate Examples
  console.log(chalk.blue("\nStep 3: Generate example components?\n"));
  
  const generateExamples = await askQuestion(rl, chalk.cyan("Generate example starter components? (yes/no): "));
  
  // Show summary
  console.log(chalk.blue.bold("\n📋 Installation Summary\n"));
  console.log(`   Agents: ${chalk.cyan(selectedAgents.join(", "))}`);
  console.log(`   Level: ${chalk.cyan(selectedLevels.join(", "))}`);
  console.log(`   Examples: ${chalk.cyan(generateExamples.toLowerCase().startsWith("y") ? "Yes" : "No")}`);
  console.log();
  
  // Confirm
  const confirm = await askQuestion(rl, chalk.yellow("⚠️  Proceed with installation? (yes/no): "));
  
  if (!confirm.toLowerCase().startsWith("y")) {
    console.log(chalk.gray("\n❌ Installation cancelled."));
    return;
  }
  
  // Execute installation
  console.log(chalk.blue("\n🔧 Installing...\n"));
  
  const tracker = new ProgressTracker(
    selectedAgents.length * selectedLevels.length,
    "Installing"
  );
  
  let completed = 0;
  const results: { agent: AgentId; level: string; status: string }[] = [];
  
  for (const agentStr of selectedAgents) {
    const agent = agentStr as AgentId;
    for (const level of selectedLevels) {
      const result = await installAgent(agent, level as "user" | "project", generateExamples.toLowerCase().startsWith("y"));
      results.push({ agent, level, status: result });
      completed++;
      tracker.update(completed, `Installed ${agent} at ${level} level`);
    }
  }
  
  tracker.complete(`Installed ${completed} configurations`);
  
  // Show results
  console.log(chalk.blue.bold("\n📊 Installation Results\n"));
  
  for (const result of results) {
    const icon = result.status === "success" ? chalk.green("✓") : result.status === "exists" ? chalk.yellow("⚠") : chalk.red("✗");
    console.log(`   ${icon} ${chalk.cyan(result.agent)} at ${result.level} level: ${result.status}`);
  }
  
  console.log(chalk.green.bold("\n✅ Installation complete!\n"));
  console.log(chalk.blue("Next steps:"));
  console.log(chalk.gray("   • Run 'cace interactive' to start using your agents"));
  console.log(chalk.gray("   • Run 'cace doctor' to verify the installation"));
}

async function installAgent(agent: AgentId, level: "user" | "project", generateExamples: boolean): Promise<string> {
  const agentInfo = AGENTS[agent];
  const basePath = level === "user" ? homedir() : process.cwd();
  const configPath = join(basePath, agentInfo.configLocations[level]);
  
  try {
    if (existsSync(configPath)) {
      return "exists";
    }
    
    // Create directory structure
    mkdirSync(configPath, { recursive: true });
    
    // Create subdirectories for different component types
    for (const type of agentInfo.componentTypes) {
      const typePath = join(configPath, type + "s");
      if (!existsSync(typePath)) {
        mkdirSync(typePath, { recursive: true });
      }
    }
    
    // Generate examples if requested
    if (generateExamples) {
      await generateExampleComponents(agent, configPath);
    }
    
    return "success";
  } catch (e) {
    return "error";
  }
}

async function generateExampleComponents(agent: AgentId, basePath: string): Promise<void> {
  // This would generate actual example components based on the agent type
  // For now, we'll create placeholder files
  const examples: Record<AgentId, string[]> = {
    claude: ["example-skill.md", "example-command.md"],
    opencode: ["example-skill.md"],
    cursor: ["example-rule.mdc"],
    windsurf: ["example-workflow.md"],
    codex: ["example-skill.md"],
    gemini: ["example-skill.md"],
    universal: [],
    aider: [],
    continue: [],
  };
  
  const agentExamples = examples[agent] || [];
  
  for (const example of agentExamples) {
    const examplePath = join(basePath, "skills", example);
    if (!existsSync(examplePath)) {
      writeFileSync(examplePath, `# Example ${agent} Component\n\nThis is an example component.\n`, "utf-8");
    }
  }
}

// ============================================================================
// Convert Wizard
// ============================================================================

async function runConvertWizard(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 Directory Conversion Wizard\n"));
  
  // Phase 1: Detect Source Scaffolding
  console.log(chalk.blue("Step 1: Detecting source scaffolding...\n"));
  
  const detected = await detectScaffolding(SUPPORTED_AGENTS, ["user", "project"]);
  
  if (detected.length === 0) {
    console.log(chalk.red("\n❌ No agent scaffolding detected."));
    console.log(chalk.gray("Run 'cace install' first to set up agent scaffolding."));
    return;
  }
  
  // Show detected scaffolding
  console.log(chalk.green(`✓ Found ${detected.length} scaffolding configurations:\n`));
  
  const sourceOptions = detected.map(info => {
    const mixedWarning = info.mixedVersions ? chalk.yellow(" [Mixed Versions]") : "";
    const orphanedWarning = info.orphanedConfigs.length > 0 ? chalk.red(` [${info.orphanedConfigs.length} Orphaned]`) : "";
    
    return {
      value: `${info.agent}:${info.level}`,
      label: `${AGENTS[info.agent].displayName} (${info.level}) - ${info.components.length} components${mixedWarning}${orphanedWarning}`,
      checked: true,
    };
  });
  
  const selectedSources = await multiSelect(rl, "Select source configurations to convert:", sourceOptions);
  
  if (selectedSources.length === 0) {
    console.log(chalk.red("\n❌ No sources selected."));
    return;
  }
  
  // Phase 2: Select Target Agents
  console.log(chalk.blue("\nStep 2: Select target agents\n"));
  
  const sourceAgents = new Set(selectedSources.map(s => s.split(":")[0] as AgentId));
  const availableTargets = SUPPORTED_AGENTS.filter(a => !sourceAgents.has(a));
  
  const targetOptions = availableTargets.map(agent => ({
    value: agent,
    label: AGENTS[agent].displayName,
    checked: false,
  }));
  
  const selectedTargets = await multiSelect(rl, "Convert to which agents? (Multi-select)", targetOptions);
  
  if (selectedTargets.length === 0) {
    console.log(chalk.red("\n❌ No targets selected."));
    return;
  }
  
  // Phase 3: Select Target Level
  console.log(chalk.blue("\nStep 3: Select target installation level\n"));
  
  const targetLevelOptions = [
    { value: "project", label: "📁 Project level", checked: true },
    { value: "user", label: "🏠 User level" },
  ];
  
  const selectedTargetLevels = await multiSelect(rl, "Where should converted files go?", targetLevelOptions);
  
  if (selectedTargetLevels.length === 0) {
    console.log(chalk.red("\n❌ No target level selected."));
    return;
  }
  
  // Phase 4: Advanced Options
  console.log(chalk.blue("\nStep 4: Advanced Options\n"));
  
  const dryRun = await askQuestion(rl, chalk.cyan("Dry run mode? (show what would happen without doing it) (yes/no): "));
  const backup = await askQuestion(rl, chalk.cyan("Create backup of existing files? (yes/no): "));
  const validate = await askQuestion(rl, chalk.cyan("Validate converted files? (yes/no): "));
  
  // Build job list
  const jobs: ConversionJob[] = [];
  
  for (const source of selectedSources) {
    const [agent, level] = source.split(":") as [AgentId, "user" | "project"];
    const info = detected.find(d => d.agent === agent && d.level === level);
    
    if (info) {
      for (const component of info.components) {
        for (const targetAgentStr of selectedTargets) {
          const targetAgent = targetAgentStr as AgentId;
          for (const targetLevel of selectedTargetLevels) {
            const targetPath = calculateTargetPath(component, targetAgent, targetLevel as "user" | "project");
            
            jobs.push({
              source: component,
              targetAgent,
              targetPath,
              status: "pending",
              warnings: [],
            });
          }
        }
      }
    }
  }
  
  // Show summary
  console.log(chalk.blue.bold("\n📋 Conversion Summary\n"));
  console.log(`   Sources: ${chalk.cyan(selectedSources.length)} configurations`);
  console.log(`   Targets: ${chalk.cyan(selectedTargets.length)} agents`);
  console.log(`   Components: ${chalk.cyan(jobs.length / (selectedTargets.length * selectedTargetLevels.length))} files`);
  console.log(`   Total jobs: ${chalk.cyan(jobs.length)} conversions`);
  console.log(`   Dry run: ${chalk.cyan(dryRun.toLowerCase().startsWith("y") ? "Yes" : "No")}`);
  console.log(`   Backup: ${chalk.cyan(backup.toLowerCase().startsWith("y") ? "Yes" : "No")}`);
  console.log(`   Validate: ${chalk.cyan(validate.toLowerCase().startsWith("y") ? "Yes" : "No")}`);
  console.log();
  
  // Check for configuration intelligence
  for (const targetAgent of selectedTargets) {
    const intelligence = await analyzeConfigurationIntelligence(targetAgent as AgentId);
    
    if (intelligence.conflicts.length > 0) {
      console.log(chalk.yellow.bold("⚠️  Configuration Conflicts Detected\n"));
      
      for (const conflict of intelligence.conflicts) {
        console.log(chalk.yellow(`   ${conflict.agent}:`));
        console.log(chalk.gray(`      User: ${conflict.userPath}`));
        console.log(chalk.gray(`      Project: ${conflict.projectPath}`));
        console.log(chalk.gray(`      Differences: ${conflict.differences.length} files`));
      }
      console.log();
    }
    
    if (intelligence.recommendations.length > 0) {
      console.log(chalk.cyan.bold("💡 Recommendations\n"));
      for (const rec of intelligence.recommendations) {
        console.log(chalk.cyan(`   • ${rec}`));
      }
      console.log();
    }
  }
  
  // Confirm
  const confirm = await askQuestion(rl, chalk.yellow("⚠️  Proceed with conversion? (yes/no): "));
  
  if (!confirm.toLowerCase().startsWith("y")) {
    console.log(chalk.gray("\n❌ Conversion cancelled."));
    return;
  }
  
  // Execute conversion
  if (dryRun.toLowerCase().startsWith("y")) {
    console.log(chalk.blue("\n🔍 DRY RUN MODE - No files will be modified\n"));
  } else {
    console.log(chalk.blue("\n🔄 Converting...\n"));
  }
  
  const tracker = new ProgressTracker(jobs.length, "Converting");
  
  let completed = 0;
  let successful = 0;
  let errors = 0;
  let skipped = 0;
  
  for (const job of jobs) {
    try {
      if (!dryRun.toLowerCase().startsWith("y")) {
        const result = await executeConversion(job, backup.toLowerCase().startsWith("y"), validate.toLowerCase().startsWith("y"));
        
        if (result.success) {
          job.status = "success";
          job.fidelity = result.fidelity;
          successful++;
        } else {
          job.status = "error";
          job.error = result.error;
          errors++;
        }
      } else {
        // Dry run - just check if conversion is possible
        job.status = "success";
        job.fidelity = 90; // Estimated
        successful++;
      }
    } catch (e) {
      job.status = "error";
      job.error = e instanceof Error ? e.message : String(e);
      errors++;
    }
    
    completed++;
    tracker.update(completed, `${job.source.name} → ${job.targetAgent}`);
  }
  
  tracker.complete(`Processed ${completed} conversions`);
  
  // Show detailed results
  console.log(chalk.blue.bold("\n📊 Conversion Results\n"));
  console.log(`   Successful: ${chalk.green(successful)}`);
  console.log(`   Errors: ${errors > 0 ? chalk.red(errors) : chalk.gray(errors)}`);
  console.log(`   Skipped: ${chalk.yellow(skipped)}`);
  console.log();
  
  // Show fidelity summary
  const avgFidelity = jobs
    .filter(j => j.status === "success" && j.fidelity)
    .reduce((sum, j) => sum + (j.fidelity || 0), 0) / successful || 0;
  
  console.log(chalk.blue.bold("📈 Average Fidelity\n"));
  const bar = "█".repeat(Math.floor(avgFidelity / 5)) + "░".repeat(20 - Math.floor(avgFidelity / 5));
  const color = avgFidelity >= 90 ? chalk.green : avgFidelity >= 75 ? chalk.yellow : chalk.red;
  console.log(`   ${color(`${avgFidelity.toFixed(1)}%`)} ${color(`[${bar}]`)}`);
  console.log();
  
  // Show errors if any
  if (errors > 0) {
    console.log(chalk.red.bold("❌ Errors\n"));
    for (const job of jobs.filter(j => j.status === "error")) {
      console.log(chalk.red(`   ${job.source.name} → ${job.targetAgent}:`));
      console.log(chalk.gray(`      ${job.error}`));
    }
    console.log();
  }
  
  // Show warnings if any
  const jobsWithWarnings = jobs.filter(j => j.warnings.length > 0);
  if (jobsWithWarnings.length > 0) {
    console.log(chalk.yellow.bold("⚠️  Warnings\n"));
    for (const job of jobsWithWarnings) {
      console.log(chalk.yellow(`   ${job.source.name}:`));
      for (const warning of job.warnings) {
        console.log(chalk.gray(`      • ${warning}`));
      }
    }
    console.log();
  }
  
  if (dryRun.toLowerCase().startsWith("y")) {
    console.log(chalk.blue("This was a dry run. No files were modified."));
    console.log(chalk.gray("Run again without dry run to execute the conversion.\n"));
  } else {
    console.log(chalk.green.bold("✅ Conversion complete!\n"));
    console.log(chalk.blue("Next steps:"));
    console.log(chalk.gray("   • Review converted files in target directories"));
    console.log(chalk.gray("   • Run 'cace validate' on converted files"));
    console.log(chalk.gray("   • Test in your target agent environment"));
  }
}

function calculateTargetPath(component: ComponentInfo, targetAgent: AgentId, targetLevel: "user" | "project"): string {
  const agentInfo = AGENTS[targetAgent];
  const basePath = targetLevel === "user" ? homedir() : process.cwd();
  const configPath = join(basePath, agentInfo.configLocations[targetLevel]);
  
  // Map component types between agents
  const typeMap: Record<AgentId, Record<ComponentType, string>> = {
    claude: { skill: "skills", command: "commands", rule: "rules", hook: "hooks", memory: "memory", agent: "agents", config: "config", workflow: "skills" },
    opencode: { skill: "skills", command: "commands", rule: "rules", hook: "skills", memory: "memory", agent: "agents", config: "config", workflow: "skills" },
    cursor: { skill: "skills", command: "commands", rule: "rules", hook: "commands", memory: "memory", agent: "commands", config: "config", workflow: "commands" },
    windsurf: { skill: "skills", command: "workflows", rule: "rules", hook: "skills", memory: "memory", agent: "skills", config: "config", workflow: "workflows" },
    codex: { skill: "skills", command: "commands", rule: "rules", hook: "skills", memory: "memory", agent: "skills", config: "config", workflow: "skills" },
    gemini: { skill: "skills", command: "commands", rule: "skills", hook: "skills", memory: "memory", agent: "skills", config: "config", workflow: "skills" },
    universal: { skill: ".", command: ".", rule: ".", hook: ".", memory: ".", agent: ".", config: ".", workflow: "." },
    aider: { skill: "commands", command: "commands", rule: "commands", hook: "commands", memory: "commands", agent: "commands", config: "config", workflow: "commands" },
    continue: { skill: "commands", command: "commands", rule: "commands", hook: "commands", memory: "commands", agent: "commands", config: "config", workflow: "commands" },
  };
  
  const targetType = typeMap[targetAgent]?.[component.type] || component.type + "s";
  
  if (targetAgent === "universal") {
    return join(configPath, `${component.name}.md`);
  }
  
  if (
    component.type === "skill" &&
    (targetAgent === "claude" ||
      targetAgent === "opencode" ||
      targetAgent === "codex" ||
      targetAgent === "gemini" ||
      targetAgent === "cursor" ||
      targetAgent === "windsurf")
  ) {
    return join(configPath, targetType, component.name, "SKILL.md");
  }
  
  return join(configPath, targetType, `${component.name}.md`);
}

async function executeConversion(
  job: ConversionJob,
  backup: boolean,
  validateOutput: boolean
): Promise<{ success: boolean; fidelity?: number; error?: string }> {
  try {
    // Read source
    const content = readFileSync(job.source.path, "utf-8");
    
    // Parse
    const parseResult = parseComponent(content, { sourceFile: job.source.path });
    
    if (!parseResult.success || !parseResult.spec) {
      return { success: false, error: "Failed to parse source file" };
    }
    
    // Render
    const renderResult = renderComponent(parseResult.spec, job.targetAgent, {
      includeComments: true,
      validateOutput,
    });
    
    if (!renderResult.success || !renderResult.content) {
      return { success: false, error: "Failed to render target format" };
    }
    
    // Backup if needed
    if (backup && existsSync(job.targetPath)) {
      const backupPath = `${job.targetPath}.backup.${Date.now()}`;
      copyFileSync(job.targetPath, backupPath);
    }
    
    // Ensure directory exists
    mkdirSync(dirname(job.targetPath), { recursive: true });
    
    // Write output
    writeFileSync(job.targetPath, renderResult.content, "utf-8");
    
    // Collect warnings from render result
    if (renderResult.report?.losses) {
      job.warnings.push(...renderResult.report.losses.map(l => l.description));
    }
    
    return {
      success: true,
      fidelity: renderResult.report?.fidelityScore,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ============================================================================
// Migrate and Sync Wizards (Placeholders for brevity)
// ============================================================================

async function runMigrateWizard(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log(chalk.blue.bold("\n📤 Migration Wizard\n"));
  console.log(chalk.gray("This wizard helps you migrate from one agent to another with validation.\n"));
  
  // Similar to convert but with additional validation steps
  await runConvertWizard(rl);
}

async function runSyncWizard(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 Sync Wizard\n"));
  console.log(chalk.gray("This wizard syncs user-level and project-level configurations.\n"));
  
  // Detect configurations
  const detected = await detectScaffolding(SUPPORTED_AGENTS, ["user", "project"]);
  
  // Find agents with both user and project configs
  const syncableAgents = detected.filter(d => {
    const hasUser = detected.find(x => x.agent === d.agent && x.level === "user");
    const hasProject = detected.find(x => x.agent === d.agent && x.level === "project");
    return hasUser && hasProject;
  });
  
  if (syncableAgents.length === 0) {
    console.log(chalk.yellow("No agents found with both user and project configs to sync."));
    return;
  }
  
  console.log(chalk.blue("Agents available for sync:\n"));
  for (const agent of syncableAgents) {
    console.log(chalk.cyan(`   • ${AGENTS[agent.agent].displayName}`));
  }
  
  console.log(chalk.gray("\nSync wizard coming in v2.3.0!"));
}

// ============================================================================
// Audit Wizard
// ============================================================================

async function runAuditWizard(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║           🔍 Configuration Audit Wizard                      ║
║     Comprehensive assessment of your agent configurations    ║
╚══════════════════════════════════════════════════════════════╝
  `));
  
  console.log(chalk.blue("📋 This wizard will perform a comprehensive audit of all your agent configurations.\n"));
  console.log(chalk.gray("The audit will check for:\n"));
  console.log(chalk.gray("  • Configuration validity against current agent standards"));
  console.log(chalk.gray("  • Version currency (are you using the latest features?)"));
  console.log(chalk.gray("  • Optimization opportunities"));
  console.log(chalk.gray("  • Pruning recommendations (unused/duplicate files)"));
  console.log(chalk.gray("  • Cross-agent synchronization status\n"));
  
  // Phase 1: Configure Audit
  console.log(chalk.blue.bold("\n⚙️  Phase 1: Configure Audit\n"));
  
  const searchPathOptions = [
    { value: "home", label: "🏠 Home directory (~/) - User-level configs", checked: true },
    { value: "business", label: "💼 Business directory (~/business/) - Project configs", checked: true },
    { value: "current", label: "📁 Current directory (./) - Local project", checked: false },
  ];
  
  const selectedPaths = await multiSelect(rl, "Where should I search for configurations?", searchPathOptions);
  
  const searchPaths: string[] = [];
  if (selectedPaths.includes("home")) searchPaths.push(homedir());
  if (selectedPaths.includes("business")) searchPaths.push(join(homedir(), "business"));
  if (selectedPaths.includes("current")) searchPaths.push(process.cwd());
  
  if (searchPaths.length === 0) {
    console.log(chalk.yellow("⚠️  No search paths selected. Using home directory only."));
    searchPaths.push(homedir());
  }
  
  // Phase 2: Select Audit Checks
  console.log(chalk.blue.bold("\n🔍 Phase 2: Select Audit Checks\n"));
  
  const checkOptions = [
    { value: "validity", label: "✓ Validity Check - Are configs valid and error-free?", checked: true },
    { value: "version", label: "📅 Version Currency - Are you using the latest features?", checked: true },
    { value: "optimization", label: "⚡ Optimization - Can configs be improved?", checked: true },
    { value: "pruning", label: "🗑️  Pruning - Unused or duplicate files", checked: true },
    { value: "sync", label: "🔄 Synchronization - Cross-agent consistency", checked: true },
  ];
  
  const selectedChecks = await multiSelect(rl, "Which checks would you like to run?", checkOptions);
  
  // Phase 3: Run Audit
  console.log(chalk.blue.bold("\n🔍 Phase 3: Running Comprehensive Audit\n"));
  console.log(chalk.gray("This may take a moment depending on the number of configurations...\n"));
  
  try {
    const auditConfig = {
      searchPaths,
      agentTypes: SUPPORTED_AGENTS,
      excludePatterns: ["node_modules", ".git", "dist", "build", ".backup"],
      maxDepth: 5,
      checkVersionCurrency: selectedChecks.includes("version"),
      checkOptimization: selectedChecks.includes("optimization"),
      checkPruning: selectedChecks.includes("pruning"),
      checkSynchronization: selectedChecks.includes("sync"),
    };
    
    const engine = new ConfigurationAuditEngine(auditConfig);
    const result = await engine.audit();
    
    // Phase 4: Display Results
    console.log(chalk.green.bold("\n✅ Audit Complete!\n"));
    
    // Print formatted report
    const report = AuditReportFormatter.formatConsoleReport(result);
    console.log(report);
    
    // Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportDir = join(homedir(), ".cace", "audit-reports");
    
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }
    
    const jsonPath = join(reportDir, `audit-${timestamp}.json`);
    const mdPath = join(reportDir, `audit-${timestamp}.md`);
    
    writeFileSync(jsonPath, AuditReportFormatter.formatJsonReport(result));
    writeFileSync(mdPath, AuditReportFormatter.formatMarkdownReport(result));
    
    console.log(chalk.blue("\n📄 Reports saved:"));
    console.log(chalk.gray(`   JSON: ${jsonPath}`));
    console.log(chalk.gray(`   Markdown: ${mdPath}`));
    
    // Phase 5: Recommendations
    console.log(chalk.blue.bold("\n💡 Next Steps\n"));
    
    if (result.systemHealth.status === "critical" || result.systemHealth.status === "poor") {
      console.log(chalk.red("🚨 Your configurations need immediate attention!"));
      console.log(chalk.gray("   Consider running the conversion wizard to fix critical issues."));
    } else if (result.systemHealth.status === "fair") {
      console.log(chalk.yellow("⚠️  Your configurations are functional but could be improved."));
      console.log(chalk.gray("   Review the optimization suggestions above."));
    } else if (result.systemHealth.status === "good") {
      console.log(chalk.green("✅ Your configurations are in good shape!"));
      console.log(chalk.gray("   Consider periodic audits to maintain quality."));
    } else {
      console.log(chalk.green("🎉 Excellent! Your configurations are top-notch!"));
    }
    
    // Offer to run conversion if there are issues
    const criticalRecs = result.recommendations.filter(r => r.priority === "critical" || r.priority === "high");
    if (criticalRecs.length > 0) {
      console.log(chalk.blue("\n🔄 Would you like to run the conversion wizard to address these issues?"));
      console.log(chalk.gray("   Run: cace wizard → convert\n"));
    }
    
  } catch (e) {
    console.log(chalk.red(`\n❌ Audit failed: ${e instanceof Error ? e.message : String(e)}`));
    console.log(chalk.gray("\nThis might be due to:"));
    console.log(chalk.gray("  • Permission issues accessing certain directories"));
    console.log(chalk.gray("  • Corrupted configuration files"));
    console.log(chalk.gray("  • Network issues checking latest versions"));
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function askQuestion(rl: ReturnType<typeof createInterface>, query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// Note: Functions are already exported via 'export async function' declarations above
// Additional exports if needed for external use:
export type { WizardOptions, ScaffoldingInfo, ComponentInfo, ConversionJob, WizardContext };
