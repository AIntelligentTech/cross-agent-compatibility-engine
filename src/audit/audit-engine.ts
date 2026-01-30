/**
 * CACE Configuration Audit Engine
 * 
 * Intelligent auditing system that scans for agent configurations and provides
 * comprehensive assessments including:
 * - Validity checks against current agent standards
 * - Version currency assessment
 * - Optimization opportunities
 * - Pruning recommendations
 * - Cross-agent synchronization status
 * 
 * Generic and portable - works with any filesystem structure through configuration.
 */

import { existsSync, readdirSync, statSync, readFileSync } from "fs";
import { join, dirname, basename, resolve } from "path";
import { homedir } from "os";
import chalk from "chalk";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AuditConfig {
  searchPaths: string[];
  agentTypes: string[];
  excludePatterns: string[];
  maxDepth: number;
  checkVersionCurrency: boolean;
  checkOptimization: boolean;
  checkPruning: boolean;
  checkSynchronization: boolean;
}

export interface AuditResult {
  timestamp: string;
  configs: AuditedConfig[];
  summary: AuditSummary;
  recommendations: AuditRecommendation[];
  systemHealth: SystemHealthScore;
}

export interface AuditedConfig {
  path: string;
  agent: string;
  level: "user" | "project" | "unknown";
  validity: ValidityStatus;
  versionInfo: VersionInfo;
  optimization: OptimizationOpportunities;
  pruning: PruningAssessment;
  synchronization: SyncStatus;
  components: AuditedComponent[];
  metadata: ConfigMetadata;
}

export interface ValidityStatus {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  warnings: string[];
  deprecatedFeatures: string[];
  missingFeatures: string[];
}

export interface VersionInfo {
  currentVersion?: string;
  latestVersion: string;
  isCurrent: boolean;
  updateAvailable: boolean;
  breakingChanges: string[];
  newFeatures: string[];
}

export interface OptimizationOpportunities {
  canOptimize: boolean;
  score: number; // 0-100 (higher = more room for improvement)
  suggestions: OptimizationSuggestion[];
  bestPractices: string[];
  missingOptimizations: string[];
}

export interface OptimizationSuggestion {
  type: "performance" | "structure" | "content" | "syntax";
  priority: "critical" | "high" | "medium" | "low";
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  autoFixable: boolean;
}

export interface PruningAssessment {
  canPrune: boolean;
  orphanedFiles: string[];
  duplicates: DuplicateGroup[];
  unusedComponents: string[];
  outdatedFiles: string[];
  potentialSavings: number; // bytes
}

export interface DuplicateGroup {
  hash: string;
  files: string[];
  size: number;
}

export interface SyncStatus {
  isSynchronized: boolean;
  otherAgents: string[];
  missingInOther: Record<string, string[]>;
  divergentVersions: Record<string, string>;
  syncScore: number; // 0-100
}

export interface AuditedComponent {
  path: string;
  type: string;
  name: string;
  validity: ValidityStatus;
  optimization: OptimizationOpportunities;
  lastModified: Date;
  size: number;
}

export interface ConfigMetadata {
  totalFiles: number;
  totalSize: number;
  lastModified: Date;
  created?: Date;
  hasGit: boolean;
  hasDocumentation: boolean;
  hasTests: boolean;
}

export interface AuditSummary {
  totalConfigs: number;
  validConfigs: number;
  invalidConfigs: number;
  outdatedConfigs: number;
  optimizableConfigs: number;
  prunableConfigs: number;
  totalComponents: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export interface AuditRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: "validity" | "version" | "optimization" | "pruning" | "sync";
  description: string;
  affectedConfigs: string[];
  estimatedEffort: "low" | "medium" | "high";
  impact: string;
  action: string;
}

export interface SystemHealthScore {
  overall: number; // 0-100
  validity: number;
  currency: number;
  optimization: number;
  maintenance: number;
  status: "excellent" | "good" | "fair" | "poor" | "critical";
}

export interface AgentKnowledge {
  latestVersion: string;
  deprecatedFeatures: string[];
  bestPractices: string[];
  directoryBestPractices?: string[];
  settingsBestPractices?: string[];
  newFeatures: string[];
  antiPatterns: string[];
}

// ============================================================================
// Agent Knowledge Base - Up-to-date best practices
// ============================================================================

const AGENT_KNOWLEDGE_BASE: Record<string, AgentKnowledge> = {
  claude: {
    latestVersion: "2.1.0",
    deprecatedFeatures: [
      "context: window (use context: session instead)",
      "old @import syntax (use new module syntax)",
    ],
    bestPractices: [
      "Use YAML frontmatter with name and description",
      "Include allowed-tools for security",
      "Use context: fork for isolated operations",
      "Structure skills in .claude/skills/<name>/SKILL.md",
      "Include validation frontmatter",
    ],
    newFeatures: [
      "agent: field for delegation",
      "context: fork support",
      "Improved @import handling",
    ],
    antiPatterns: [
      "Missing description field",
      "No allowed-tools specification",
      "Flat structure (not in subdirectories)",
      "Missing validation",
    ],
  },
  cursor: {
    latestVersion: "0.46.0",
    deprecatedFeatures: [
      ".cursorrules file (use .mdc rules instead)",
      "Legacy rule format",
    ],
    bestPractices: [
      "Use .mdc files with YAML frontmatter",
      "Include description and globs",
      "Set alwaysApply appropriately",
    ],
    directoryBestPractices: [
      "Organize by technology/area",
      "Use @mention system effectively",
    ],
    newFeatures: [
      "Enhanced .mdc format",
      "Better glob support",
      "AGENTS.md standard",
    ],
    antiPatterns: [
      "No frontmatter in .mdc files",
      "Missing globs specification",
      "Using deprecated .cursorrules",
      "Rules without descriptions",
      "Flat file structure",
    ],
  },
  windsurf: {
    latestVersion: "1.12.0",
    deprecatedFeatures: [
      "Old workflow format",
      "Legacy skill structure",
    ],
    bestPractices: [
      "Separate skills from workflows",
      "Use proper directory structure",
      "Include metadata in workflows",
      "Use plans for complex operations",
    ],
    directoryBestPractices: [
      "Organize tools in tools/ directory",
    ],
    newFeatures: [
      "Multi-level hooks",
      "Skills vs Workflows distinction",
      "Auto-execution modes",
    ],
    antiPatterns: [
      "Mixing skills and workflows",
      "No metadata in workflow files",
      "Missing tool documentation",
      "Flat file structure",
    ],
  },
  gemini: {
    latestVersion: "1.0.0",
    deprecatedFeatures: [],
    bestPractices: [
      "Use settings.json for configuration",
    ],
    settingsBestPractices: [
      "Configure temperature appropriately",
      "Set up multi-directory support",
    ],
    newFeatures: [
      "Code execution support",
      "Google search integration",
    ],
    antiPatterns: [
      "Missing settings.json",
      "No temperature configuration",
    ],
  },
  codex: {
    latestVersion: "1.0.0",
    deprecatedFeatures: [],
    bestPractices: [
      "Use config.toml for MCP servers",
      "Configure approval policies",
      "Set up sandbox modes",
    ],
    newFeatures: [
      "MCP server support",
      "Web search capabilities",
    ],
    antiPatterns: [
      "Missing config.toml",
      "No approval policies",
    ],
  },
  opencode: {
    latestVersion: "1.1.34",
    deprecatedFeatures: [],
    bestPractices: [
      "Use permission-based patterns",
      "Configure oh-my-opencode.jsonc",
      "Set up security boundaries",
    ],
    newFeatures: [
      "Enhanced permission system",
      "Better security model",
    ],
    antiPatterns: [
      "Missing permission patterns",
      "No security configuration",
    ],
  },
};

// ============================================================================
// Audit Engine Implementation
// ============================================================================

export class ConfigurationAuditEngine {
  private config: AuditConfig;
  private results: AuditedConfig[] = [];

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = {
      searchPaths: config.searchPaths || this.getDefaultSearchPaths(),
      agentTypes: config.agentTypes || ["claude", "cursor", "windsurf", "gemini", "codex", "opencode"],
      excludePatterns: config.excludePatterns || ["node_modules", ".git", "dist", "build", ".backup"],
      maxDepth: config.maxDepth || 5,
      checkVersionCurrency: config.checkVersionCurrency ?? true,
      checkOptimization: config.checkOptimization ?? true,
      checkPruning: config.checkPruning ?? true,
      checkSynchronization: config.checkSynchronization ?? true,
    };
  }

  private getDefaultSearchPaths(): string[] {
    return [
      homedir(),
      resolve(homedir(), "business"),
      process.cwd(),
    ];
  }

  async audit(): Promise<AuditResult> {
    console.log(chalk.cyan("\n🔍 Starting Comprehensive Configuration Audit\n"));
    
    // Phase 1: Discovery
    await this.discoverConfigs();
    
    // Phase 2: Detailed Analysis
    await this.analyzeConfigs();
    
    // Phase 3: Generate Report
    return this.generateReport();
  }

  private async discoverConfigs(): Promise<void> {
    console.log(chalk.blue("📂 Phase 1: Discovering configurations...\n"));
    
    for (const searchPath of this.config.searchPaths) {
      if (!existsSync(searchPath)) continue;
      
      for (const agent of this.config.agentTypes) {
        const agentPath = join(searchPath, `.${agent}`);
        if (existsSync(agentPath)) {
          const level = this.determineLevel(agentPath, searchPath);
          const config: AuditedConfig = {
            path: agentPath,
            agent,
            level,
            validity: { isValid: false, score: 0, errors: [], warnings: [], deprecatedFeatures: [], missingFeatures: [] },
            versionInfo: { latestVersion: "", isCurrent: false, updateAvailable: false, breakingChanges: [], newFeatures: [] },
            optimization: { canOptimize: false, score: 0, suggestions: [], bestPractices: [], missingOptimizations: [] },
            pruning: { canPrune: false, orphanedFiles: [], duplicates: [], unusedComponents: [], outdatedFiles: [], potentialSavings: 0 },
            synchronization: { isSynchronized: false, otherAgents: [], missingInOther: {}, divergentVersions: {}, syncScore: 0 },
            components: [],
            metadata: { totalFiles: 0, totalSize: 0, lastModified: new Date(0), hasGit: false, hasDocumentation: false, hasTests: false },
          };
          this.results.push(config);
          console.log(chalk.green(`  ✓ Found ${agent} at ${agentPath} (${level} level)`));
        }
      }
    }
    
    console.log(chalk.blue(`\n📊 Discovered ${this.results.length} configurations\n`));
  }

  private determineLevel(path: string, searchPath: string): "user" | "project" | "unknown" {
    if (searchPath === homedir() || path.includes(homedir()) && !path.includes("business")) {
      return "user";
    }
    if (path.includes("business") || path.includes("project") || this.hasGitRepo(path)) {
      return "project";
    }
    return "unknown";
  }

  private hasGitRepo(path: string): boolean {
    try {
      return existsSync(join(dirname(path), ".git"));
    } catch {
      return false;
    }
  }

  private async analyzeConfigs(): Promise<void> {
    console.log(chalk.blue("🔎 Phase 2: Analyzing configurations...\n"));
    
    for (let i = 0; i < this.results.length; i++) {
      const config = this.results[i];
      if (!config) continue;
      console.log(chalk.cyan(`  [${i + 1}/${this.results.length}] Auditing ${config.agent} at ${config.path}...`));
      
      // Scan components
      await this.scanComponents(config);
      
      // Update metadata (must run before checks that depend on it)
      this.updateMetadata(config);
      
      // Check validity
      await this.checkValidity(config);
      
      // Check version currency
      if (this.config.checkVersionCurrency) {
        await this.checkVersionCurrency(config);
      }
      
      // Check optimization opportunities
      if (this.config.checkOptimization) {
        await this.checkOptimization(config);
      }
      
      // Check pruning needs
      if (this.config.checkPruning) {
        await this.checkPruning(config);
      }
      
      // Check synchronization
      if (this.config.checkSynchronization) {
        await this.checkSynchronization(config);
      }
      
      // Print summary for this config
      this.printConfigSummary(config);
    }
    
    console.log();
  }

  private async scanComponents(config: AuditedConfig): Promise<void> {
    const scanDir = (dir: string, depth = 0) => {
      if (depth > this.config.maxDepth) return;
      
      try {
        const entries = readdirSync(dir);
        
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!this.config.excludePatterns.some(p => entry.includes(p))) {
              scanDir(fullPath, depth + 1);
            }
          } else if (entry.endsWith(".md") || entry.endsWith(".mdc") || entry.endsWith(".json")) {
            const component: AuditedComponent = {
              path: fullPath,
              type: this.detectComponentType(entry, fullPath),
              name: basename(entry, ".md"),
              validity: { isValid: true, score: 100, errors: [], warnings: [], deprecatedFeatures: [], missingFeatures: [] },
              optimization: { canOptimize: false, score: 0, suggestions: [], bestPractices: [], missingOptimizations: [] },
              lastModified: stat.mtime,
              size: stat.size,
            };
            
            config.components.push(component);
            config.metadata.totalFiles++;
            config.metadata.totalSize += stat.size;
            
            if (stat.mtime > config.metadata.lastModified) {
              config.metadata.lastModified = stat.mtime;
            }
          }
        }
      } catch (e) {
        // Skip directories that can't be read
      }
    };
    
    scanDir(config.path);
  }

  private detectComponentType(filename: string, path: string): string {
    const lower = filename.toLowerCase();
    
    // Check for specific filenames first (before generic includes)
    if (filename === "AGENTS.md" || filename === "CLAUDE.md") return "documentation";
    
    if (lower.includes("skill")) return "skill";
    if (lower.includes("command")) return "command";
    if (lower.includes("rule") || filename.endsWith(".mdc")) return "rule";
    if (lower.includes("workflow")) return "workflow";
    if (lower.includes("agent")) return "agent";
    if (lower.includes("config")) return "config";
    
    return "unknown";
  }

  private async checkValidity(config: AuditedConfig): Promise<void> {
    const knowledge = AGENT_KNOWLEDGE_BASE[config.agent as keyof typeof AGENT_KNOWLEDGE_BASE] as AgentKnowledge | undefined;
    if (!knowledge) return;
    
    let score = 100;
    const errors: string[] = [];
    const warnings: string[] = [];
    const deprecatedFeatures: string[] = [];
    const missingFeatures: string[] = [];
    
    // Only validate structured components (skills, commands, rules, workflows, docs)
    const structuredTypes = ["skill", "command", "rule", "workflow", "documentation"];
    const componentsToValidate = config.components.filter(c => structuredTypes.includes(c.type));
    
    // Track component scores separately to prevent massive penalty accumulation
    const componentScores = new Map<string, number>();
    
    for (const component of componentsToValidate) {
      try {
        const content = readFileSync(component.path, "utf-8");
        let componentPenalty = 0;
        const maxPenaltyPerComponent = 30; // Cap penalties per component
        
        // Check for anti-patterns (only on structured components)
        for (const antiPattern of knowledge.antiPatterns) {
          if (componentPenalty >= maxPenaltyPerComponent) break;
          // Skip "No frontmatter in .mdc files" for non-.mdc files
          if (antiPattern.includes(".mdc") && component.type !== "rule") continue;
          if (this.matchesAntiPattern(content, antiPattern)) {
            warnings.push(`${component.name}: ${antiPattern}`);
            componentPenalty += 5;
          }
        }
        
        // Check for deprecated features
        for (const deprecated of knowledge.deprecatedFeatures) {
          if (componentPenalty >= maxPenaltyPerComponent) break;
          if (!deprecated) continue;
          // Extract the actual deprecated pattern (before any parenthetical explanation)
          const actualPattern = deprecated.split("(")[0]?.trim().toLowerCase() ?? "";
          // Use word boundary matching to avoid false positives
          if (!actualPattern) continue;
          const patternRegex = new RegExp(`\\b${actualPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
          if (patternRegex.test(content)) {
            deprecatedFeatures.push(`${component.name}: ${deprecated}`);
            componentPenalty += 10;
          }
        }
        
        // Check for best practices (limit to first 2 missing)
        let missingPracticeCount = 0;
        
        // For .mdc files, check frontmatter content instead of body for best practices
        // But skip "Use .mdc files with YAML frontmatter" since that's verified by the frontmatter check above
        let contentToCheck = content;
        const frontmatterMatch = content.match(/---\n([\s\S]*?)\n---/);
        if (component.type === "rule" && frontmatterMatch && frontmatterMatch[1]) {
          contentToCheck = frontmatterMatch[1]; // Check frontmatter content
        }
        
        for (const practice of knowledge.bestPractices) {
          if (componentPenalty >= maxPenaltyPerComponent || missingPracticeCount >= 2) break;
          // Skip metadata-related best practices that are verified by other checks
          if (practice.toLowerCase().includes("yaml frontmatter") && component.type === "rule") continue;
          if (!this.hasBestPractice(contentToCheck, practice)) {
            missingFeatures.push(`${component.name}: Missing ${practice}`);
            componentPenalty += 3;
            missingPracticeCount++;
          }
        }
        
        // Check YAML frontmatter
        if (componentPenalty < maxPenaltyPerComponent && !content.includes("---")) {
          warnings.push(`${component.name}: Missing YAML frontmatter`);
          componentPenalty += 10;
        }
        
        // Cap the penalty and apply to total score
        componentScores.set(component.name, Math.min(componentPenalty, maxPenaltyPerComponent));
        
      } catch (e) {
        errors.push(`Failed to read ${component.path}: ${e}`);
        score -= 20;
      }
    }
    
    // Apply accumulated penalties (capped)
    const totalPenalty = Array.from(componentScores.values()).reduce((sum, p) => sum + p, 0);
    score -= Math.min(totalPenalty, 100); // Cap total penalty at 100
    
    // Check directory structure best practices
    if (knowledge.directoryBestPractices && knowledge.directoryBestPractices.length > 0) {
      const subdirs = config.components
        .filter(c => c.type === "documentation")
        .map(c => dirname(c.path).split("/").pop())
        .filter(Boolean);
      
      const dirPractices = knowledge.directoryBestPractices;
      const hasOrganizedDirs = subdirs.some(d => 
        dirPractices.some(practice => {
          const firstWord = practice.split(" ")[0]?.toLowerCase() ?? "";
          return firstWord && d?.toLowerCase().includes(firstWord);
        })
      );
      
      if (!hasOrganizedDirs) {
        score -= Math.min(knowledge.directoryBestPractices.length * 5, 20);
      }
    }
    
    // Check settings-based best practices (Gemini, Codex, etc.)
    if (knowledge.settingsBestPractices && knowledge.settingsBestPractices.length > 0) {
      const hasSettings = config.components.some(c => 
        c.name.toLowerCase().includes("settings") || c.name === "config"
      );
      if (!hasSettings) {
        score -= Math.min(knowledge.settingsBestPractices.length * 5, 15);
      }
    }
    
    config.validity = {
      isValid: errors.length === 0 && score >= 70,
      score: Math.max(0, score),
      errors,
      warnings,
      deprecatedFeatures,
      missingFeatures,
    };
  }

  private matchesAntiPattern(content: string, pattern: string): boolean {
    const keyPhrases = pattern.toLowerCase().split(" ").slice(0, 3);
    return keyPhrases.every(phrase => content.toLowerCase().includes(phrase));
  }

  private hasBestPractice(content: string, practice: string): boolean {
    const keyTerms = practice.toLowerCase().split(" ").slice(0, 2);
    return keyTerms.some(term => content.toLowerCase().includes(term));
  }

  private async checkVersionCurrency(config: AuditedConfig): Promise<void> {
    const knowledge = AGENT_KNOWLEDGE_BASE[config.agent as keyof typeof AGENT_KNOWLEDGE_BASE];
    if (!knowledge) return;
    
    // Try to detect current version from config
    let currentVersion: string | undefined;
    
    for (const component of config.components) {
      if (component.type === "config") {
        try {
          const content = readFileSync(component.path, "utf-8");
          const versionMatch = content.match(/version["']?\s*[:=]\s*["']?([\d.]+)/);
          if (versionMatch) {
            currentVersion = versionMatch[1];
            break;
          }
        } catch {
          // Ignore read errors
        }
      }
    }
    
    const isCurrent = currentVersion === knowledge.latestVersion;
    
    config.versionInfo = {
      currentVersion,
      latestVersion: knowledge.latestVersion,
      isCurrent,
      updateAvailable: !isCurrent && !!currentVersion,
      breakingChanges: isCurrent ? [] : knowledge.deprecatedFeatures,
      newFeatures: isCurrent ? [] : knowledge.newFeatures,
    };
  }

  private async checkOptimization(config: AuditedConfig): Promise<void> {
    const knowledge = AGENT_KNOWLEDGE_BASE[config.agent as keyof typeof AGENT_KNOWLEDGE_BASE];
    if (!knowledge) return;
    
    const suggestions: OptimizationSuggestion[] = [];
    const missingOptimizations: string[] = [];
    let score = 0;
    
    // Check structure
    if (config.metadata.totalFiles > 20 && !this.hasGoodStructure(config)) {
      suggestions.push({
        type: "structure",
        priority: "high",
        description: "Consider organizing files into subdirectories",
        impact: "Better maintainability and navigation",
        effort: "medium",
        autoFixable: false,
      });
      score += 20;
    }
    
    // Check documentation
    if (!config.metadata.hasDocumentation) {
      suggestions.push({
        type: "content",
        priority: "medium",
        description: "Add AGENTS.md documentation file",
        impact: "Better onboarding and understanding",
        effort: "low",
        autoFixable: true,
      });
      score += 15;
    }
    
    // Check for content optimization
    for (const component of config.components) {
      try {
        const content = readFileSync(component.path, "utf-8");
        
        // Check for long files that could be split
        if (content.length > 5000 && component.type === "skill") {
          suggestions.push({
            type: "content",
            priority: "medium",
            description: `${component.name} is quite long (${Math.round(content.length / 1000)}KB), consider splitting`,
            impact: "Better agent performance",
            effort: "medium",
            autoFixable: false,
          });
          score += 10;
        }
        
        // Check for missing descriptions
        if (!content.includes("description")) {
          missingOptimizations.push(`${component.name}: Add description`);
          score += 5;
        }
        
      } catch {
        // Ignore read errors
      }
    }
    
    config.optimization = {
      canOptimize: suggestions.length > 0,
      score: Math.min(100, score),
      suggestions,
      bestPractices: knowledge.bestPractices,
      missingOptimizations,
    };
  }

  private hasGoodStructure(config: AuditedConfig): boolean {
    const hasSubdirs = config.components.some(c => dirname(c.path) !== config.path);
    const hasSkillsDir = config.components.some(c => c.path.includes("/skills/"));
    return hasSubdirs || hasSkillsDir;
  }

  private async checkPruning(config: AuditedConfig): Promise<void> {
    const orphanedFiles: string[] = [];
    const duplicates: DuplicateGroup[] = [];
    const outdatedFiles: string[] = [];
    let potentialSavings = 0;
    
    // Check for outdated files (not modified in 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    for (const component of config.components) {
      if (component.lastModified < sixMonthsAgo) {
        outdatedFiles.push(component.path);
        potentialSavings += component.size;
      }
    }
    
    // Check for orphaned configs (configs not referenced by other files)
    for (const component of config.components) {
      if (component.type === "config") {
        const isReferenced = config.components.some(c => 
          c !== component && this.referencesFile(c, component)
        );
        if (!isReferenced) {
          orphanedFiles.push(component.path);
          potentialSavings += component.size;
        }
      }
    }
    
    config.pruning = {
      canPrune: orphanedFiles.length > 0 || outdatedFiles.length > 0,
      orphanedFiles,
      duplicates,
      unusedComponents: orphanedFiles,
      outdatedFiles,
      potentialSavings,
    };
  }

  private referencesFile(component: AuditedComponent, target: AuditedComponent): boolean {
    try {
      const content = readFileSync(component.path, "utf-8");
      return content.includes(basename(target.path)) || content.includes(target.name);
    } catch {
      return false;
    }
  }

  private async checkSynchronization(config: AuditedConfig): Promise<void> {
    const otherAgents = this.results.filter(r => 
      r !== config && dirname(r.path) === dirname(config.path)
    );
    
    if (otherAgents.length === 0) {
      config.synchronization = {
        isSynchronized: true,
        otherAgents: [],
        missingInOther: {},
        divergentVersions: {},
        syncScore: 100,
      };
      return;
    }
    
    const otherAgentNames = otherAgents.map(a => a.agent);
    const missingInOther: Record<string, string[]> = {};
    const divergentVersions: Record<string, string> = {};
    
    // Check for components missing in other agents
    for (const component of config.components) {
      if (component.type === "skill" || component.type === "command") {
        for (const other of otherAgents) {
          const hasEquivalent = other.components.some(c => 
            c.name.toLowerCase() === component.name.toLowerCase()
          );
          if (!hasEquivalent) {
            if (!missingInOther[other.agent]) {
              missingInOther[other.agent] = [];
            }
            missingInOther[other.agent]!.push(component.name);
          }
        }
      }
    }
    
    // Calculate sync score
    const totalMissing = Object.values(missingInOther).reduce((sum, arr) => sum + arr.length, 0);
    const syncScore = Math.max(0, 100 - (totalMissing * 5));
    
    config.synchronization = {
      isSynchronized: syncScore >= 80,
      otherAgents: otherAgentNames,
      missingInOther,
      divergentVersions,
      syncScore,
    };
  }

  private updateMetadata(config: AuditedConfig): void {
    // Check for git
    config.metadata.hasGit = this.hasGitRepo(config.path);
    
    // Check for documentation
    config.metadata.hasDocumentation = config.components.some(c => 
      c.type === "documentation" || c.name.toLowerCase().includes("readme")
    );
    
    // Check for tests
    config.metadata.hasTests = existsSync(join(dirname(config.path), "tests")) ||
      config.components.some(c => c.name.toLowerCase().includes("test"));
  }

  private printConfigSummary(config: AuditedConfig): void {
    const status = config.validity.isValid ? chalk.green("✓") : chalk.red("✗");
    const score = config.validity.score >= 90 ? chalk.green(config.validity.score) :
                   config.validity.score >= 70 ? chalk.yellow(config.validity.score) :
                   chalk.red(config.validity.score);
    
    console.log(`    ${status} Validity: ${score}% | ` +
                `${config.components.length} components | ` +
                `${config.validity.warnings.length} warnings | ` +
                `${config.optimization.suggestions.length} optimization opportunities`);
  }

  private generateReport(): AuditResult {
    console.log(chalk.blue("\n📊 Phase 3: Generating comprehensive report...\n"));
    
    // Calculate summary
    const summary: AuditSummary = {
      totalConfigs: this.results.length,
      validConfigs: this.results.filter(r => r.validity.isValid).length,
      invalidConfigs: this.results.filter(r => !r.validity.isValid).length,
      outdatedConfigs: this.results.filter(r => r.versionInfo.updateAvailable).length,
      optimizableConfigs: this.results.filter(r => r.optimization.canOptimize).length,
      prunableConfigs: this.results.filter(r => r.pruning.canPrune).length,
      totalComponents: this.results.reduce((sum, r) => sum + r.components.length, 0),
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
    };
    
    // Count issues by severity
    for (const config of this.results) {
      const critical = config.validity.errors.length;
      const high = config.optimization.suggestions.filter(s => s.priority === "high").length;
      const medium = config.optimization.suggestions.filter(s => s.priority === "medium").length;
      const low = config.validity.warnings.length;
      
      summary.criticalIssues += critical;
      summary.highIssues += high;
      summary.mediumIssues += medium;
      summary.lowIssues += low;
      summary.totalIssues += critical + high + medium + low;
    }
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    // Calculate system health
    const systemHealth = this.calculateSystemHealth(summary);
    
    return {
      timestamp: new Date().toISOString(),
      configs: this.results,
      summary,
      recommendations,
      systemHealth,
    };
  }

  private generateRecommendations(): AuditRecommendation[] {
    const recommendations: AuditRecommendation[] = [];
    
    // Find configs with critical validity issues
    const criticalConfigs = this.results.filter(r => r.validity.errors.length > 0);
    if (criticalConfigs.length > 0) {
      recommendations.push({
        priority: "critical",
        category: "validity",
        description: `Fix validity errors in ${criticalConfigs.length} configurations`,
        affectedConfigs: criticalConfigs.map(c => c.path),
        estimatedEffort: "high",
        impact: "Ensure all configurations are valid and functional",
        action: "Review and fix validity errors in each configuration",
      });
    }
    
    // Find outdated configs
    const outdated = this.results.filter(r => r.versionInfo.updateAvailable);
    if (outdated.length > 0) {
      recommendations.push({
        priority: "high",
        category: "version",
        description: `Update ${outdated.length} configurations to latest agent versions`,
        affectedConfigs: outdated.map(c => c.path),
        estimatedEffort: "medium",
        impact: "Access new features and avoid deprecated functionality",
        action: "Review new features and update configurations",
      });
    }
    
    // Find configs needing optimization
    const optimizable = this.results.filter(r => r.optimization.canOptimize);
    if (optimizable.length > 0) {
      recommendations.push({
        priority: "medium",
        category: "optimization",
        description: `Optimize ${optimizable.length} configurations for better performance`,
        affectedConfigs: optimizable.map(c => c.path),
        estimatedEffort: "medium",
        impact: "Improve agent performance and maintainability",
        action: "Apply suggested optimizations",
      });
    }
    
    // Find configs needing pruning
    const prunable = this.results.filter(r => r.pruning.canPrune);
    if (prunable.length > 0) {
      const totalSavings = prunable.reduce((sum, r) => sum + r.pruning.potentialSavings, 0);
      recommendations.push({
        priority: "low",
        category: "pruning",
        description: `Prune unused files to save ${Math.round(totalSavings / 1024)}KB`,
        affectedConfigs: prunable.map(c => c.path),
        estimatedEffort: "low",
        impact: "Reduce clutter and improve organization",
        action: "Remove orphaned and outdated files",
      });
    }
    
    // Find unsynchronized multi-agent projects
    const unsynced = this.results.filter(r => !r.synchronization.isSynchronized && r.synchronization.otherAgents.length > 0);
    if (unsynced.length > 0) {
      recommendations.push({
        priority: "medium",
        category: "sync",
        description: `Synchronize ${unsynced.length} configurations across agents`,
        affectedConfigs: unsynced.map(c => c.path),
        estimatedEffort: "high",
        impact: "Ensure consistency across all agent types",
        action: "Use CACE to convert missing components to other agents",
      });
    }
    
    return recommendations;
  }

  private calculateSystemHealth(summary: AuditSummary): SystemHealthScore {
    const validity = Math.round((summary.validConfigs / summary.totalConfigs) * 100);
    const currency = Math.round(((summary.totalConfigs - summary.outdatedConfigs) / summary.totalConfigs) * 100);
    const optimization = Math.round(((summary.totalConfigs - summary.optimizableConfigs) / summary.totalConfigs) * 100);
    const maintenance = Math.round(((summary.totalConfigs - summary.prunableConfigs) / summary.totalConfigs) * 100);
    
    const overall = Math.round((validity + currency + optimization + maintenance) / 4);
    
    let status: SystemHealthScore["status"] = "critical";
    if (overall >= 90) status = "excellent";
    else if (overall >= 75) status = "good";
    else if (overall >= 60) status = "fair";
    else if (overall >= 40) status = "poor";
    
    return {
      overall,
      validity,
      currency,
      optimization,
      maintenance,
      status,
    };
  }
}

// ============================================================================
// Report Formatter
// ============================================================================

export class AuditReportFormatter {
  static formatConsoleReport(result: AuditResult): string {
    let output = chalk.cyan(`
╔════════════════════════════════════════════════════════════════╗
║           CACE Configuration Audit Report                       ║
╚════════════════════════════════════════════════════════════════╝

`);
    
    // System Health
    const health = result.systemHealth;
    const healthColor = health.status === "excellent" ? chalk.green :
                        health.status === "good" ? chalk.green :
                        health.status === "fair" ? chalk.yellow :
                        health.status === "poor" ? chalk.red :
                        chalk.red;
    
    output += chalk.bold("📊 System Health\n");
    output += `  Overall Score: ${healthColor(health.overall)}% (${healthColor(health.status.toUpperCase())})\n`;
    output += `  Validity: ${health.validity}% | Currency: ${health.currency}%\n`;
    output += `  Optimization: ${health.optimization}% | Maintenance: ${health.maintenance}%\n\n`;
    
    // Summary
    output += chalk.bold("📈 Summary\n");
    output += `  Total Configurations: ${result.summary.totalConfigs}\n`;
    output += `  Valid: ${chalk.green(result.summary.validConfigs)} | Invalid: ${chalk.red(result.summary.invalidConfigs)}\n`;
    output += `  Outdated: ${chalk.yellow(result.summary.outdatedConfigs)} | Optimizable: ${result.summary.optimizableConfigs}\n`;
    output += `  Total Components: ${result.summary.totalComponents}\n`;
    output += `  Total Issues: ${result.summary.totalIssues}\n`;
    output += `    Critical: ${chalk.red(result.summary.criticalIssues)} | High: ${chalk.yellow(result.summary.highIssues)}\n`;
    output += `    Medium: ${chalk.yellow(result.summary.mediumIssues)} | Low: ${chalk.blue(result.summary.lowIssues)}\n\n`;
    
    // Recommendations
    output += chalk.bold("💡 Top Recommendations\n");
    const topRecs = result.recommendations
      .sort((a, b) => this.priorityValue(a.priority) - this.priorityValue(b.priority))
      .slice(0, 5);
    
    topRecs.forEach((rec, i) => {
      const color = rec.priority === "critical" ? chalk.red :
                    rec.priority === "high" ? chalk.yellow :
                    rec.priority === "medium" ? chalk.blue :
                    chalk.gray;
      output += `  ${i + 1}. ${color(`[${rec.priority.toUpperCase()}]`)} ${rec.description}\n`;
      output += `     Impact: ${rec.impact} | Effort: ${rec.estimatedEffort}\n`;
      output += `     Action: ${rec.action}\n\n`;
    });
    
    // Configuration Details
    output += chalk.bold("📁 Configuration Details\n\n");
    result.configs.forEach(config => {
      const status = config.validity.isValid ? chalk.green("✓") : chalk.red("✗");
      output += `  ${status} ${chalk.bold(config.agent)} (${config.level})\n`;
      output += `    Path: ${config.path}\n`;
      output += `    Validity: ${config.validity.score}% | Components: ${config.components.length}\n`;
      
      if (config.versionInfo.updateAvailable) {
        output += `    ${chalk.yellow("⚠")} Update available: ${config.versionInfo.currentVersion} → ${config.versionInfo.latestVersion}\n`;
      }
      
      if (config.optimization.canOptimize) {
        output += `    ${chalk.blue("ℹ")} ${config.optimization.suggestions.length} optimization opportunities\n`;
      }
      
      if (config.pruning.canPrune) {
        output += `    ${chalk.blue("ℹ")} ${config.pruning.orphanedFiles.length} files can be pruned\n`;
      }
      
      output += "\n";
    });
    
    return output;
  }
  
  static formatJsonReport(result: AuditResult): string {
    return JSON.stringify(result, null, 2);
  }
  
  static formatMarkdownReport(result: AuditResult): string {
    let output = `# CACE Configuration Audit Report\n\n`;
    output += `**Generated:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
    
    // System Health
    output += `## System Health\n\n`;
    output += `- **Overall Score:** ${result.systemHealth.overall}% (${result.systemHealth.status})\n`;
    output += `- **Validity:** ${result.systemHealth.validity}%\n`;
    output += `- **Currency:** ${result.systemHealth.currency}%\n`;
    output += `- **Optimization:** ${result.systemHealth.optimization}%\n`;
    output += `- **Maintenance:** ${result.systemHealth.maintenance}%\n\n`;
    
    // Summary
    output += `## Summary\n\n`;
    output += `| Metric | Value |\n`;
    output += `|--------|-------|\n`;
    output += `| Total Configurations | ${result.summary.totalConfigs} |\n`;
    output += `| Valid Configs | ${result.summary.validConfigs} |\n`;
    output += `| Invalid Configs | ${result.summary.invalidConfigs} |\n`;
    output += `| Outdated Configs | ${result.summary.outdatedConfigs} |\n`;
    output += `| Optimizable Configs | ${result.summary.optimizableConfigs} |\n`;
    output += `| Total Components | ${result.summary.totalComponents} |\n`;
    output += `| Total Issues | ${result.summary.totalIssues} |\n\n`;
    
    // Recommendations
    output += `## Recommendations\n\n`;
    result.recommendations.forEach((rec, i) => {
      output += `### ${i + 1}. ${rec.description}\n\n`;
      output += `- **Priority:** ${rec.priority}\n`;
      output += `- **Category:** ${rec.category}\n`;
      output += `- **Impact:** ${rec.impact}\n`;
      output += `- **Effort:** ${rec.estimatedEffort}\n`;
      output += `- **Action:** ${rec.action}\n`;
      output += `- **Affected Configs:** ${rec.affectedConfigs.length}\n\n`;
    });
    
    // Configurations
    output += `## Configuration Details\n\n`;
    result.configs.forEach(config => {
      output += `### ${config.agent} (${config.level})\n\n`;
      output += `- **Path:** \`${config.path}\`\n`;
      output += `- **Validity Score:** ${config.validity.score}%\n`;
      output += `- **Components:** ${config.components.length}\n`;
      output += `- **Current Version:** ${config.versionInfo.currentVersion || "unknown"}\n`;
      output += `- **Latest Version:** ${config.versionInfo.latestVersion}\n`;
      output += `- **Update Available:** ${config.versionInfo.updateAvailable ? "Yes" : "No"}\n\n`;
      
      if (config.validity.errors.length > 0) {
        output += `**Errors:**\n`;
        config.validity.errors.forEach(e => output += `- ${e}\n`);
        output += "\n";
      }
      
      if (config.optimization.suggestions.length > 0) {
        output += `**Optimization Opportunities:**\n`;
        config.optimization.suggestions.forEach(s => {
          output += `- [${s.priority}] ${s.description}\n`;
        });
        output += "\n";
      }
    });
    
    return output;
  }
  
  private static priorityValue(priority: string): number {
    const values = { critical: 0, high: 1, medium: 2, low: 3 };
    return values[priority as keyof typeof values] || 4;
  }
}

// Export all types and classes
export { AGENT_KNOWLEDGE_BASE };
export default ConfigurationAuditEngine;
