/**
 * Output formatting utilities for CLI
 * Supports JSON, text, and colored output modes
 */

import type { ComponentSpec, ConversionReport } from './types.js';
import type { SemanticDiff } from './diff.js';
import type { CaceError } from './errors.js';

export type OutputFormat = 'text' | 'json' | 'minimal';

export interface OutputOptions {
  format: OutputFormat;
  color: boolean;
  verbose: boolean;
}

export const defaultOutputOptions: OutputOptions = {
  format: 'text',
  color: true,
  verbose: false,
};

export interface InspectOutput {
  spec: ComponentSpec;
  analysis: {
    wordCount: number;
    lineCount: number;
    hasArguments: boolean;
    capabilitySummary: string[];
    conversionCompatibility: Record<string, string>;
  };
}

export interface ConvertOutput {
  success: boolean;
  content?: string;
  filename?: string;
  report?: ConversionReport;
  errors?: CaceError[];
}

export interface DiffOutput {
  diff: SemanticDiff;
  specA: { id: string; agent?: string };
  specB: { id: string; agent?: string };
}

export interface RoundTripOutput {
  success: boolean;
  originalSpec: ComponentSpec;
  roundTripSpec: ComponentSpec;
  diff: SemanticDiff;
  fidelityScore: number;
}

export function formatAsJson<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}

export function formatInspect(output: InspectOutput, options: OutputOptions): string {
  if (options.format === 'json') {
    return formatAsJson(output);
  }

  const { spec, analysis } = output;
  const lines: string[] = [];
  const c = options.color ? colors : noColors;

  lines.push(c.bold(`Component: ${spec.id}`));
  lines.push('');
  
  lines.push(c.section('Identity'));
  lines.push(`  Type: ${c.value(spec.componentType)}`);
  lines.push(`  Version: ${c.value(`${spec.version.major}.${spec.version.minor}.${spec.version.patch}`)}`);
  if (spec.sourceAgent) {
    lines.push(`  Source Agent: ${c.value(spec.sourceAgent.id)}`);
  }
  lines.push('');

  lines.push(c.section('Intent'));
  lines.push(`  Summary: ${spec.intent.summary}`);
  lines.push(`  Purpose: ${spec.intent.purpose}`);
  if (spec.category && spec.category.length > 0) {
    lines.push(`  Categories: ${c.value(spec.category.join(', '))}`);
  }
  lines.push('');

  lines.push(c.section('Activation'));
  lines.push(`  Mode: ${c.value(spec.activation.mode)}`);
  lines.push(`  Safety: ${formatSafety(spec.activation.safetyLevel, c)}`);
  if (spec.activation.requiresConfirmation) {
    lines.push(`  Requires Confirmation: ${c.value('yes')}`);
  }
  lines.push('');

  lines.push(c.section('Invocation'));
  if (spec.invocation.slashCommand) {
    lines.push(`  Slash Command: ${c.value('/' + spec.invocation.slashCommand)}`);
  }
  if (spec.invocation.argumentHint) {
    lines.push(`  Argument Hint: ${c.value(spec.invocation.argumentHint)}`);
  }
  lines.push(`  User Invocable: ${c.value(spec.invocation.userInvocable ? 'yes' : 'no')}`);
  lines.push('');

  lines.push(c.section('Execution'));
  lines.push(`  Context: ${c.value(spec.execution.context)}`);
  if (spec.execution.allowedTools && spec.execution.allowedTools.length > 0) {
    lines.push(`  Allowed Tools: ${c.value(spec.execution.allowedTools.join(', '))}`);
  }
  if (spec.execution.preferredModel) {
    lines.push(`  Preferred Model: ${c.value(spec.execution.preferredModel)}`);
  }
  if (spec.execution.subAgent) {
    lines.push(`  Sub-Agent: ${c.value(spec.execution.subAgent)}`);
  }
  lines.push('');

  lines.push(c.section('Capabilities'));
  for (const cap of analysis.capabilitySummary) {
    lines.push(`  • ${cap}`);
  }
  lines.push('');

  lines.push(c.section('Content Analysis'));
  lines.push(`  Lines: ${c.value(String(analysis.lineCount))}`);
  lines.push(`  Words: ${c.value(String(analysis.wordCount))}`);
  lines.push(`  Has Arguments: ${c.value(analysis.hasArguments ? 'yes' : 'no')}`);
  lines.push('');

  if (options.verbose) {
    lines.push(c.section('Conversion Compatibility'));
    for (const [agent, status] of Object.entries(analysis.conversionCompatibility)) {
      lines.push(`  ${agent}: ${status}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function formatConversionReport(report: ConversionReport, options: OutputOptions): string {
  if (options.format === 'json') {
    return formatAsJson(report);
  }

  const lines: string[] = [];
  const c = options.color ? colors : noColors;

  lines.push(c.bold('Conversion Report'));
  lines.push('');
  lines.push(`  From: ${c.value(report.source.agent)} ${report.source.componentType} "${report.source.id}"`);
  lines.push(`  To: ${c.value(report.target.agent)} ${report.target.componentType} "${report.target.id}"`);
  lines.push(`  Fidelity: ${formatFidelity(report.fidelityScore, c)}`);
  lines.push(`  Duration: ${report.durationMs}ms`);
  lines.push('');

  if (report.preservedSemantics.length > 0) {
    lines.push(c.section('Preserved'));
    for (const item of report.preservedSemantics) {
      lines.push(`  ${c.green('✓')} ${item}`);
    }
    lines.push('');
  }

  if (report.losses.length > 0) {
    lines.push(c.section('Losses'));
    for (const loss of report.losses) {
      const icon = loss.severity === 'critical' ? c.red('✗') : c.yellow('⚠');
      lines.push(`  ${icon} [${loss.category}] ${loss.description}`);
      if (loss.recommendation && options.verbose) {
        lines.push(`      ${c.gray('→ ' + loss.recommendation)}`);
      }
    }
    lines.push('');
  }

  if (report.warnings.length > 0) {
    lines.push(c.section('Warnings'));
    for (const warning of report.warnings) {
      lines.push(`  ${c.yellow('⚠')} [${warning.code}] ${warning.message}`);
    }
    lines.push('');
  }

  if (report.suggestions.length > 0 && options.verbose) {
    lines.push(c.section('Suggestions'));
    for (const suggestion of report.suggestions) {
      lines.push(`  • ${suggestion}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatSafety(level: string, c: typeof colors): string {
  switch (level) {
    case 'safe': return c.green(level);
    case 'sensitive': return c.yellow(level);
    case 'dangerous': return c.red(level);
    default: return level;
  }
}

function formatFidelity(score: number, c: typeof colors): string {
  const formatted = `${score}%`;
  if (score >= 80) return c.green(formatted);
  if (score >= 60) return c.yellow(formatted);
  return c.red(formatted);
}

const colors = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  section: (s: string) => `\x1b[1;34m${s}\x1b[0m`,
  value: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

const noColors = {
  bold: (s: string) => s,
  section: (s: string) => s,
  value: (s: string) => s,
  green: (s: string) => s,
  yellow: (s: string) => s,
  red: (s: string) => s,
  gray: (s: string) => s,
};

export function analyzeSpec(spec: ComponentSpec): InspectOutput['analysis'] {
  const lines = spec.body.split('\n');
  const words = spec.body.split(/\s+/).filter(w => w.length > 0);

  const capabilitySummary: string[] = [];
  const caps = spec.capabilities;
  
  if (caps.needsShell) capabilitySummary.push('Needs shell access');
  if (caps.needsFilesystem) capabilitySummary.push('Needs filesystem access');
  if (caps.needsNetwork) capabilitySummary.push('Needs network access');
  if (caps.needsGit) capabilitySummary.push('Needs git access');
  if (caps.needsCodeSearch) capabilitySummary.push('Needs code search');
  if (caps.needsBrowser) capabilitySummary.push('Needs browser');
  if (caps.providesAnalysis) capabilitySummary.push('Provides analysis');
  if (caps.providesCodeGeneration) capabilitySummary.push('Provides code generation');
  if (caps.providesRefactoring) capabilitySummary.push('Provides refactoring');
  if (caps.providesDocumentation) capabilitySummary.push('Provides documentation');

  if (capabilitySummary.length === 0) {
    capabilitySummary.push('No special capabilities detected');
  }

  return {
    wordCount: words.length,
    lineCount: lines.length,
    hasArguments: spec.body.includes('$ARGUMENTS') || (spec.arguments?.length ?? 0) > 0,
    capabilitySummary,
    conversionCompatibility: {
      claude: 'Full support',
      windsurf: 'Full support',
      cursor: 'Partial (no structured args)',
    },
  };
}
