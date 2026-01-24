/**
 * Semantic diff engine for comparing ComponentSpecs
 */

import type { ComponentSpec } from './types.js';

export type DiffSeverity = 'identical' | 'minor' | 'moderate' | 'significant' | 'breaking';

export interface FieldDiff {
  path: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  severity: DiffSeverity;
  description: string;
}

export interface SemanticDiff {
  identical: boolean;
  overallSeverity: DiffSeverity;
  diffs: FieldDiff[];
  summary: string;
  preservedAspects: string[];
  changedAspects: string[];
}

export function diffSpecs(specA: ComponentSpec, specB: ComponentSpec): SemanticDiff {
  const diffs: FieldDiff[] = [];
  const preservedAspects: string[] = [];
  const changedAspects: string[] = [];

  // Identity
  if (specA.id !== specB.id) {
    diffs.push({
      path: 'id',
      label: 'Component ID',
      oldValue: specA.id,
      newValue: specB.id,
      severity: 'moderate',
      description: 'Component identifier changed',
    });
    changedAspects.push('identity');
  } else {
    preservedAspects.push('identity');
  }

  // Component type
  if (specA.componentType !== specB.componentType) {
    diffs.push({
      path: 'componentType',
      label: 'Component Type',
      oldValue: specA.componentType,
      newValue: specB.componentType,
      severity: 'significant',
      description: `Type changed from ${specA.componentType} to ${specB.componentType}`,
    });
    changedAspects.push('component type');
  } else {
    preservedAspects.push('component type');
  }

  // Intent
  if (specA.intent.summary !== specB.intent.summary) {
    diffs.push({
      path: 'intent.summary',
      label: 'Summary',
      oldValue: specA.intent.summary,
      newValue: specB.intent.summary,
      severity: 'minor',
      description: 'Summary text differs',
    });
    changedAspects.push('summary');
  } else {
    preservedAspects.push('summary');
  }

  if (specA.intent.purpose !== specB.intent.purpose) {
    diffs.push({
      path: 'intent.purpose',
      label: 'Purpose',
      oldValue: specA.intent.purpose,
      newValue: specB.intent.purpose,
      severity: 'minor',
      description: 'Purpose description differs',
    });
  }

  // Activation
  if (specA.activation.mode !== specB.activation.mode) {
    diffs.push({
      path: 'activation.mode',
      label: 'Activation Mode',
      oldValue: specA.activation.mode,
      newValue: specB.activation.mode,
      severity: 'significant',
      description: `Activation changed from ${specA.activation.mode} to ${specB.activation.mode}`,
    });
    changedAspects.push('activation mode');
  } else {
    preservedAspects.push('activation mode');
  }

  if (specA.activation.safetyLevel !== specB.activation.safetyLevel) {
    diffs.push({
      path: 'activation.safetyLevel',
      label: 'Safety Level',
      oldValue: specA.activation.safetyLevel,
      newValue: specB.activation.safetyLevel,
      severity: 'moderate',
      description: `Safety level changed from ${specA.activation.safetyLevel} to ${specB.activation.safetyLevel}`,
    });
    changedAspects.push('safety level');
  } else {
    preservedAspects.push('safety level');
  }

  // Execution context
  if (specA.execution.context !== specB.execution.context) {
    diffs.push({
      path: 'execution.context',
      label: 'Execution Context',
      oldValue: specA.execution.context,
      newValue: specB.execution.context,
      severity: 'significant',
      description: `Execution context changed from ${specA.execution.context} to ${specB.execution.context}`,
    });
    changedAspects.push('execution context');
  } else {
    preservedAspects.push('execution context');
  }

  // Allowed tools
  const toolsA = specA.execution.allowedTools ?? [];
  const toolsB = specB.execution.allowedTools ?? [];
  if (!arraysEqual(toolsA, toolsB)) {
    diffs.push({
      path: 'execution.allowedTools',
      label: 'Allowed Tools',
      oldValue: toolsA.length > 0 ? toolsA : 'unrestricted',
      newValue: toolsB.length > 0 ? toolsB : 'unrestricted',
      severity: toolsA.length > 0 && toolsB.length === 0 ? 'significant' : 'moderate',
      description: 'Tool restrictions changed',
    });
    changedAspects.push('tool restrictions');
  } else if (toolsA.length > 0) {
    preservedAspects.push('tool restrictions');
  }

  // Body content
  const bodyDiff = compareBodyContent(specA.body, specB.body);
  if (bodyDiff.similarity < 1.0) {
    diffs.push({
      path: 'body',
      label: 'Body Content',
      oldValue: `${specA.body.length} chars`,
      newValue: `${specB.body.length} chars`,
      severity: bodyDiff.similarity < 0.5 ? 'significant' : bodyDiff.similarity < 0.8 ? 'moderate' : 'minor',
      description: `Body content ${Math.round(bodyDiff.similarity * 100)}% similar`,
    });
    changedAspects.push('body content');
  } else {
    preservedAspects.push('body content');
  }

  // Capabilities
  const capDiffs = compareCapabilities(specA.capabilities, specB.capabilities);
  diffs.push(...capDiffs);
  if (capDiffs.length === 0) {
    preservedAspects.push('capabilities');
  } else {
    changedAspects.push('capabilities');
  }

  // Calculate overall severity
  const overallSeverity = calculateOverallSeverity(diffs);
  const identical = diffs.length === 0;

  // Generate summary
  const summary = generateDiffSummary(diffs, preservedAspects, changedAspects);

  return {
    identical,
    overallSeverity,
    diffs,
    summary,
    preservedAspects,
    changedAspects,
  };
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

function compareBodyContent(bodyA: string, bodyB: string): { similarity: number } {
  if (bodyA === bodyB) return { similarity: 1.0 };
  
  // Normalize whitespace for comparison
  const normA = bodyA.replace(/\s+/g, ' ').trim();
  const normB = bodyB.replace(/\s+/g, ' ').trim();
  
  if (normA === normB) return { similarity: 0.95 };
  
  // Simple word-based similarity
  const wordsA = new Set(normA.toLowerCase().split(/\s+/));
  const wordsB = new Set(normB.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return { similarity: intersection.size / union.size };
}

function compareCapabilities(
  capsA: ComponentSpec['capabilities'],
  capsB: ComponentSpec['capabilities']
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const capKeys: (keyof ComponentSpec['capabilities'])[] = [
    'needsShell', 'needsFilesystem', 'needsNetwork', 'needsGit',
    'needsCodeSearch', 'needsBrowser',
    'providesAnalysis', 'providesCodeGeneration', 'providesRefactoring', 'providesDocumentation',
  ];

  for (const key of capKeys) {
    if (capsA[key] !== capsB[key]) {
      diffs.push({
        path: `capabilities.${key}`,
        label: formatCapabilityName(key),
        oldValue: capsA[key],
        newValue: capsB[key],
        severity: 'minor',
        description: `${formatCapabilityName(key)}: ${capsA[key]} → ${capsB[key]}`,
      });
    }
  }

  return diffs;
}

function formatCapabilityName(key: string): string {
  return key
    .replace(/^needs/, 'Needs ')
    .replace(/^provides/, 'Provides ')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function calculateOverallSeverity(diffs: FieldDiff[]): DiffSeverity {
  if (diffs.length === 0) return 'identical';
  
  const severities = diffs.map(d => d.severity);
  if (severities.includes('breaking')) return 'breaking';
  if (severities.includes('significant')) return 'significant';
  if (severities.includes('moderate')) return 'moderate';
  return 'minor';
}

function generateDiffSummary(
  diffs: FieldDiff[],
  preserved: string[],
  changed: string[]
): string {
  if (diffs.length === 0) {
    return 'Components are semantically identical.';
  }

  const parts: string[] = [];
  
  if (changed.length > 0) {
    parts.push(`Changed: ${changed.join(', ')}`);
  }
  
  if (preserved.length > 0) {
    parts.push(`Preserved: ${preserved.join(', ')}`);
  }

  return parts.join('. ') + '.';
}

export function formatDiffForDisplay(diff: SemanticDiff, useColor: boolean = true): string {
  const lines: string[] = [];
  
  // Header
  const severityColors: Record<DiffSeverity, string> = {
    identical: '\x1b[32m',  // green
    minor: '\x1b[33m',      // yellow
    moderate: '\x1b[33m',   // yellow
    significant: '\x1b[31m', // red
    breaking: '\x1b[31m',   // red
  };
  const reset = '\x1b[0m';
  
  const color = useColor ? severityColors[diff.overallSeverity] : '';
  const colorEnd = useColor ? reset : '';
  
  lines.push(`${color}Overall: ${diff.overallSeverity.toUpperCase()}${colorEnd}`);
  lines.push('');
  lines.push(diff.summary);
  lines.push('');
  
  if (diff.diffs.length > 0) {
    lines.push('Changes:');
    for (const d of diff.diffs) {
      const diffColor = useColor ? severityColors[d.severity] : '';
      lines.push(`  ${diffColor}[${d.severity}]${colorEnd} ${d.label}: ${d.description}`);
    }
  }
  
  return lines.join('\n');
}
