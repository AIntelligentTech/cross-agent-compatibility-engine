/**
 * Standalone audit runner for system assessment
 * Non-interactive version for automated assessment
 */

import ConfigurationAuditEngine, { AuditReportFormatter } from "./src/audit/audit-engine.js";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import chalk from "chalk";

async function runSystemAudit(): Promise<void> {
  console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════════╗
║     CACE System-Wide Configuration Assessment                  ║
║              Automated Audit & Analysis                         ║
╚════════════════════════════════════════════════════════════════╝
`));

  const auditConfig = {
    searchPaths: [
      homedir(),
      join(homedir(), "business"),
    ],
    agentTypes: ["claude", "cursor", "windsurf", "gemini", "codex", "opencode"],
    excludePatterns: ["node_modules", ".git", "dist", "build", ".backup"],
    maxDepth: 5,
    checkVersionCurrency: true,
    checkOptimization: true,
    checkPruning: true,
    checkSynchronization: true,
  };

  console.log(chalk.blue("🔍 Starting comprehensive system audit..."));
  console.log(chalk.gray(`  Search paths: ${auditConfig.searchPaths.join(", ")}`));
  console.log(chalk.gray(`  Agents: ${auditConfig.agentTypes.join(", ")}\n`));

  try {
    const engine = new ConfigurationAuditEngine(auditConfig);
    const result = await engine.audit();

    // Print console report
    const report = AuditReportFormatter.formatConsoleReport(result);
    console.log(report);

    // Save reports
    const reportDir = join(homedir(), "business", "os", "cace-reports");
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = join(reportDir, `system-audit-${timestamp}.json`);
    const mdPath = join(reportDir, `system-audit-${timestamp}.md`);

    writeFileSync(jsonPath, AuditReportFormatter.formatJsonReport(result));
    writeFileSync(mdPath, AuditReportFormatter.formatMarkdownReport(result));

    console.log(chalk.green("\n✅ Audit complete!"));
    console.log(chalk.blue("\n📄 Reports saved:"));
    console.log(chalk.gray(`   JSON: ${jsonPath}`));
    console.log(chalk.gray(`   Markdown: ${mdPath}`));

    // Health summary
    console.log(chalk.cyan("\n╔════════════════════════════════════════════════════════════════╗"));
    console.log(chalk.cyan("║                  SYSTEM HEALTH SUMMARY                          ║"));
    console.log(chalk.cyan("╚════════════════════════════════════════════════════════════════╝\n"));
    
    const health = result.systemHealth;
    const healthColor = health.status === "excellent" ? chalk.green :
                       health.status === "good" ? chalk.green :
                       health.status === "fair" ? chalk.yellow :
                       health.status === "poor" ? chalk.red :
                       chalk.red;
    
    console.log(`  Overall Health: ${healthColor(health.overall)}% (${healthColor(health.status.toUpperCase())})`);
    console.log(`  Validity: ${health.validity}% | Currency: ${health.currency}%`);
    console.log(`  Optimization: ${health.optimization}% | Maintenance: ${health.maintenance}%`);
    
    console.log(chalk.blue("\n📊 Statistics:"));
    console.log(`  Total Configurations: ${result.summary.totalConfigs}`);
    console.log(`  Valid: ${result.summary.validConfigs} | Invalid: ${result.summary.invalidConfigs}`);
    console.log(`  Total Components: ${result.summary.totalComponents}`);
    console.log(`  Total Issues: ${result.summary.totalIssues}`);
    
    // Top recommendations
    if (result.recommendations.length > 0) {
      console.log(chalk.blue("\n💡 Top Recommendations:"));
      result.recommendations
        .slice(0, 5)
        .forEach((rec, i) => {
          const color = rec.priority === "critical" ? chalk.red :
                       rec.priority === "high" ? chalk.yellow :
                       chalk.blue;
          console.log(`  ${i + 1}. ${color(`[${rec.priority.toUpperCase()}]`)} ${rec.description}`);
        });
    }

    console.log(chalk.cyan("\n═══════════════════════════════════════════════════════════════\n"));

  } catch (e) {
    console.error(chalk.red(`\n❌ Audit failed: ${e instanceof Error ? e.message : String(e)}`));
    process.exit(1);
  }
}

runSystemAudit();
