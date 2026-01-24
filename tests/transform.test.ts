/**
 * Tests for the transformation pipeline
 */

import { describe, test, expect } from 'bun:test';
import { transform } from '../src/transformation/transformer.js';
import { parseComponent } from '../src/parsing/parser-factory.js';
import { renderComponent } from '../src/rendering/renderer-factory.js';

// Sample Windsurf workflow
const windsurfWorkflow = `---
description: Implement high-quality code using solid design principles
---

# Deep Code Workflow

This workflow instructs Cascade to focus on implementation quality.

## 1. Understand Requirements

- Restate what the code must do
- Identify callers and consumers

## 2. Shape the Design

- Choose appropriate abstractions
- Apply core design principles
`;

// Sample Claude skill
const claudeSkill = `---
name: deep-code
description: Implement high-quality code using solid design principles
disable-model-invocation: true
user-invocable: true
---

# Deep Code Skill

This skill focuses on implementation quality.

## Steps

1. Understand requirements
2. Shape the design
3. Implement in small steps
`;

// Sample Cursor command
const cursorCommand = `# Deep Code

## Objective

Implement high-quality code using solid design principles.

## Requirements

- Understand the requirements first
- Shape the design before coding
- Implement in small, verifiable steps
`;

describe('Parsing', () => {
  test('parses Windsurf workflow', () => {
    const result = parseComponent(windsurfWorkflow, {
      agentId: 'windsurf',
      sourceFile: '.windsurf/workflows/deep-code.md',
    });

    expect(result.success).toBe(true);
    expect(result.spec).toBeDefined();
    expect(result.spec?.componentType).toBe('workflow');
    expect(result.spec?.intent.summary).toContain('high-quality code');
  });

  test('parses Claude skill', () => {
    const result = parseComponent(claudeSkill, {
      agentId: 'claude',
      sourceFile: '.claude/skills/deep-code/SKILL.md',
    });

    expect(result.success).toBe(true);
    expect(result.spec).toBeDefined();
    expect(result.spec?.componentType).toBe('skill');
    expect(result.spec?.id).toBe('deep-code');
    expect(result.spec?.activation.mode).toBe('manual');
  });

  test('parses Cursor command', () => {
    const result = parseComponent(cursorCommand, {
      agentId: 'cursor',
      sourceFile: '.cursor/commands/deep-code.md',
    });

    expect(result.success).toBe(true);
    expect(result.spec).toBeDefined();
    expect(result.spec?.componentType).toBe('command');
  });
});

describe('Rendering', () => {
  test('renders to Claude format', () => {
    const parseResult = parseComponent(windsurfWorkflow, {
      agentId: 'windsurf',
      sourceFile: '.windsurf/workflows/deep-code.md',
    });

    expect(parseResult.spec).toBeDefined();
    const renderResult = renderComponent(parseResult.spec!, 'claude');

    expect(renderResult.success).toBe(true);
    expect(renderResult.content).toContain('---');
    expect(renderResult.content).toContain('name:');
    expect(renderResult.content).toContain('description:');
  });

  test('renders to Windsurf format', () => {
    const parseResult = parseComponent(claudeSkill, {
      agentId: 'claude',
      sourceFile: '.claude/skills/deep-code/SKILL.md',
    });

    expect(parseResult.spec).toBeDefined();
    const renderResult = renderComponent(parseResult.spec!, 'windsurf');

    expect(renderResult.success).toBe(true);
    expect(renderResult.content).toContain('---');
    expect(renderResult.content).toContain('description:');
  });

  test('renders to Cursor format', () => {
    const parseResult = parseComponent(windsurfWorkflow, {
      agentId: 'windsurf',
      sourceFile: '.windsurf/workflows/deep-code.md',
    });

    expect(parseResult.spec).toBeDefined();
    const renderResult = renderComponent(parseResult.spec!, 'cursor');

    expect(renderResult.success).toBe(true);
    expect(renderResult.content).toContain('# ');
    expect(renderResult.content).toContain('## Objective');
  });
});

describe('Full Transform', () => {
  test('transforms Windsurf to Claude', () => {
    const result = transform(windsurfWorkflow, {
      sourceAgent: 'windsurf',
      targetAgent: 'claude',
      sourceFile: '.windsurf/workflows/deep-code.md',
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output).toContain('name:');
    expect(result.fidelityScore).toBeGreaterThan(50);
  });

  test('transforms Claude to Windsurf', () => {
    const result = transform(claudeSkill, {
      sourceAgent: 'claude',
      targetAgent: 'windsurf',
      sourceFile: '.claude/skills/deep-code/SKILL.md',
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output).toContain('description:');
  });

  test('transforms Windsurf to Cursor', () => {
    const result = transform(windsurfWorkflow, {
      sourceAgent: 'windsurf',
      targetAgent: 'cursor',
      sourceFile: '.windsurf/workflows/deep-code.md',
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output).toContain('## Objective');
  });

  test('transforms Claude to Cursor', () => {
    const result = transform(claudeSkill, {
      sourceAgent: 'claude',
      targetAgent: 'cursor',
      sourceFile: '.claude/skills/deep-code/SKILL.md',
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output).toContain('# Deep Code');
  });

  test('reports warnings for feature loss', () => {
    const claudeWithFork = `---
name: test-skill
description: Test skill with fork context
context: fork
agent: Explore
---

Test body
`;

    const result = transform(claudeWithFork, {
      sourceAgent: 'claude',
      targetAgent: 'windsurf',
    });

    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('Fidelity Scoring', () => {
  test('high fidelity for simple conversions', () => {
    const simpleWorkflow = `---
description: A simple workflow
---

Do something simple.
`;

    const result = transform(simpleWorkflow, {
      sourceAgent: 'windsurf',
      targetAgent: 'claude',
    });

    expect(result.success).toBe(true);
    expect(result.fidelityScore).toBeGreaterThanOrEqual(80);
  });

  test('lower fidelity for complex Claude features to Cursor', () => {
    const complexSkill = `---
name: complex-skill
description: Complex skill with many features
disable-model-invocation: true
context: fork
agent: Explore
allowed-tools:
  - Read
  - Write
---

Complex body with $ARGUMENTS
`;

    const result = transform(complexSkill, {
      sourceAgent: 'claude',
      targetAgent: 'cursor',
    });

    expect(result.success).toBe(true);
    // Cursor loses many features, so fidelity should be lower
    expect(result.fidelityScore).toBeLessThan(90);
  });
});
