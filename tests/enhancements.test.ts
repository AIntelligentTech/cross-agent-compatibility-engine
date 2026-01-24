/**
 * Tests for enhanced features: diff, inspect, round-trip, export/import
 */

import { describe, test, expect } from 'bun:test';
import { diffSpecs, formatDiffForDisplay } from '../src/core/diff.js';
import { analyzeSpec, formatInspect, formatConversionReport } from '../src/core/output.js';
import { createError, formatError, enrichError } from '../src/core/errors.js';
import { parseComponent } from '../src/parsing/parser-factory.js';
import { transform } from '../src/transformation/transformer.js';
import type { ComponentSpec } from '../src/core/types.js';

// Sample specs for testing
const sampleSpecA: ComponentSpec = {
  id: 'test-workflow',
  version: { major: 1, minor: 0, patch: 0 },
  sourceAgent: { id: 'windsurf' },
  componentType: 'workflow',
  category: ['testing'],
  intent: {
    summary: 'A test workflow',
    purpose: 'For testing purposes',
  },
  activation: {
    mode: 'manual',
    safetyLevel: 'safe',
  },
  invocation: {
    slashCommand: 'test-workflow',
    userInvocable: true,
  },
  execution: {
    context: 'main',
  },
  body: 'This is the body content.\n\nWith multiple paragraphs.',
  capabilities: {
    needsShell: false,
    needsFilesystem: true,
    needsNetwork: false,
    needsGit: false,
    needsCodeSearch: true,
    needsBrowser: false,
    providesAnalysis: true,
    providesCodeGeneration: false,
    providesRefactoring: false,
    providesDocumentation: false,
  },
  metadata: {
    sourceFile: 'test.md',
  },
};

const sampleSpecB: ComponentSpec = {
  ...sampleSpecA,
  id: 'test-workflow-modified',
  activation: {
    mode: 'suggested',
    safetyLevel: 'sensitive',
  },
  body: 'This is modified body content.\n\nWith different paragraphs.',
};

describe('Semantic Diff', () => {
  test('detects identical specs', () => {
    const diff = diffSpecs(sampleSpecA, sampleSpecA);
    expect(diff.identical).toBe(true);
    expect(diff.overallSeverity).toBe('identical');
    expect(diff.diffs.length).toBe(0);
  });

  test('detects ID change', () => {
    const diff = diffSpecs(sampleSpecA, sampleSpecB);
    expect(diff.identical).toBe(false);
    
    const idDiff = diff.diffs.find(d => d.path === 'id');
    expect(idDiff).toBeDefined();
    expect(idDiff?.oldValue).toBe('test-workflow');
    expect(idDiff?.newValue).toBe('test-workflow-modified');
  });

  test('detects activation mode change', () => {
    const diff = diffSpecs(sampleSpecA, sampleSpecB);
    
    const activationDiff = diff.diffs.find(d => d.path === 'activation.mode');
    expect(activationDiff).toBeDefined();
    expect(activationDiff?.severity).toBe('significant');
  });

  test('detects safety level change', () => {
    const diff = diffSpecs(sampleSpecA, sampleSpecB);
    
    const safetyDiff = diff.diffs.find(d => d.path === 'activation.safetyLevel');
    expect(safetyDiff).toBeDefined();
  });

  test('detects body content changes', () => {
    const diff = diffSpecs(sampleSpecA, sampleSpecB);
    
    const bodyDiff = diff.diffs.find(d => d.path === 'body');
    expect(bodyDiff).toBeDefined();
  });

  test('generates summary', () => {
    const diff = diffSpecs(sampleSpecA, sampleSpecB);
    expect(diff.summary.length).toBeGreaterThan(0);
    expect(diff.changedAspects.length).toBeGreaterThan(0);
  });

  test('formats diff for display', () => {
    const diff = diffSpecs(sampleSpecA, sampleSpecB);
    const formatted = formatDiffForDisplay(diff, false);
    
    expect(formatted).toContain('Overall:');
    expect(formatted).toContain('Changes:');
  });
});

describe('Spec Analysis', () => {
  test('analyzes word and line count', () => {
    const analysis = analyzeSpec(sampleSpecA);
    
    expect(analysis.wordCount).toBeGreaterThan(0);
    expect(analysis.lineCount).toBeGreaterThan(0);
  });

  test('detects capabilities', () => {
    const analysis = analyzeSpec(sampleSpecA);
    
    expect(analysis.capabilitySummary).toContain('Needs filesystem access');
    expect(analysis.capabilitySummary).toContain('Needs code search');
    expect(analysis.capabilitySummary).toContain('Provides analysis');
  });

  test('detects arguments', () => {
    const specWithArgs: ComponentSpec = {
      ...sampleSpecA,
      body: 'Use $ARGUMENTS to do something',
    };
    
    const analysis = analyzeSpec(specWithArgs);
    expect(analysis.hasArguments).toBe(true);
  });

  test('includes conversion compatibility', () => {
    const analysis = analyzeSpec(sampleSpecA);
    
    expect(analysis.conversionCompatibility.claude).toBeDefined();
    expect(analysis.conversionCompatibility.windsurf).toBeDefined();
    expect(analysis.conversionCompatibility.cursor).toBeDefined();
  });
});

describe('Error Handling', () => {
  test('creates error with all fields', () => {
    const error = createError('PARSE_FAILED', 'Could not parse file', {
      details: 'Invalid YAML',
      suggestion: 'Check frontmatter syntax',
      context: { file: 'test.md' },
    });

    expect(error.code).toBe('PARSE_FAILED');
    expect(error.message).toBe('Could not parse file');
    expect(error.details).toBe('Invalid YAML');
    expect(error.suggestion).toBe('Check frontmatter syntax');
    expect(error.context?.file).toBe('test.md');
  });

  test('enriches error with default suggestion', () => {
    const error = createError('UNKNOWN_AGENT', 'Could not detect agent');
    const enriched = enrichError(error);

    expect(enriched.suggestion).toBeDefined();
    expect(enriched.suggestion?.length).toBeGreaterThan(0);
  });

  test('formats error for display', () => {
    const error = createError('FILE_NOT_FOUND', 'File not found', {
      details: '/path/to/file.md',
    });
    
    const formatted = formatError(error, false);
    expect(formatted).toContain('FILE_NOT_FOUND');
    expect(formatted).toContain('File not found');
    expect(formatted).toContain('/path/to/file.md');
  });
});

describe('Output Formatting', () => {
  test('formats inspect output as text', () => {
    const analysis = analyzeSpec(sampleSpecA);
    const output = formatInspect(
      { spec: sampleSpecA, analysis },
      { format: 'text', color: false, verbose: false }
    );

    expect(output).toContain('Component: test-workflow');
    expect(output).toContain('Type: workflow');
    expect(output).toContain('Activation');
    expect(output).toContain('Capabilities');
  });

  test('formats inspect output as JSON', () => {
    const analysis = analyzeSpec(sampleSpecA);
    const output = formatInspect(
      { spec: sampleSpecA, analysis },
      { format: 'json', color: false, verbose: false }
    );

    const parsed = JSON.parse(output);
    expect(parsed.spec.id).toBe('test-workflow');
    expect(parsed.analysis.wordCount).toBeGreaterThan(0);
  });
});

describe('Round-Trip Fidelity', () => {
  const windsurfWorkflow = `---
description: Test workflow for round-trip
---

# Test Workflow

This is a simple test workflow.

## Steps

1. Do something
2. Do something else
`;

  test('windsurf → claude → windsurf preserves semantics', () => {
    // Step 1: Parse original
    const original = parseComponent(windsurfWorkflow, {
      agentId: 'windsurf',
      sourceFile: '.windsurf/workflows/test.md',
    });
    expect(original.success).toBe(true);

    // Step 2: Convert to Claude
    const toClaude = transform(windsurfWorkflow, {
      sourceAgent: 'windsurf',
      targetAgent: 'claude',
    });
    expect(toClaude.success).toBe(true);

    // Step 3: Convert back to Windsurf
    const backToWindsurf = transform(toClaude.output!, {
      sourceAgent: 'claude',
      targetAgent: 'windsurf',
    });
    expect(backToWindsurf.success).toBe(true);

    // Step 4: Compare
    const diff = diffSpecs(original.spec!, backToWindsurf.spec!);
    
    // Should preserve core semantics (component type changes workflow→skill→workflow, so it's preserved)
    expect(diff.preservedAspects).toContain('summary');
    expect(diff.preservedAspects).toContain('activation mode');
    expect(diff.preservedAspects).toContain('body content');
  });

  test('claude → cursor → claude has expected losses', () => {
    const claudeSkill = `---
name: test-skill
description: Test skill
disable-model-invocation: true
context: fork
agent: Explore
---

Test body with $ARGUMENTS
`;

    // Step 1: Parse original
    const original = parseComponent(claudeSkill, {
      agentId: 'claude',
    });
    expect(original.success).toBe(true);

    // Step 2: Convert to Cursor
    const toCursor = transform(claudeSkill, {
      sourceAgent: 'claude',
      targetAgent: 'cursor',
    });
    expect(toCursor.success).toBe(true);
    // Cursor should have lower fidelity due to feature loss
    expect(toCursor.fidelityScore).toBeLessThan(100);

    // Step 3: Convert back to Claude
    const backToClaude = transform(toCursor.output!, {
      sourceAgent: 'cursor',
      targetAgent: 'claude',
    });
    expect(backToClaude.success).toBe(true);

    // Step 4: Compare - should detect drift
    const diff = diffSpecs(original.spec!, backToClaude.spec!);
    
    // Fork context should be lost
    expect(diff.changedAspects.length).toBeGreaterThan(0);
  });
});

describe('Conversion Report', () => {
  test('formats conversion report as text', () => {
    const report = {
      source: { agent: 'windsurf' as const, componentType: 'workflow' as const, id: 'test' },
      target: { agent: 'claude' as const, componentType: 'skill' as const, id: 'test' },
      preservedSemantics: ['summary', 'body content'],
      losses: [
        {
          category: 'execution' as const,
          severity: 'warning' as const,
          description: 'Auto-execution mode not supported',
          sourceField: 'activation.mode',
        },
      ],
      warnings: [
        { code: 'TEST_WARNING', message: 'Test warning message' },
      ],
      suggestions: ['Review the output'],
      fidelityScore: 85,
      convertedAt: new Date().toISOString(),
      durationMs: 42,
    };

    const formatted = formatConversionReport(report, {
      format: 'text',
      color: false,
      verbose: true,
    });

    expect(formatted).toContain('Conversion Report');
    expect(formatted).toContain('windsurf');
    expect(formatted).toContain('claude');
    expect(formatted).toContain('85%');
    expect(formatted).toContain('Preserved');
    expect(formatted).toContain('Losses');
    expect(formatted).toContain('Warnings');
  });
});
