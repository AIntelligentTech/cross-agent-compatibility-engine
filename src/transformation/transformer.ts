/**
 * Core transformation logic for converting between agents
 */

import type { AgentId, ComponentSpec, RenderResult } from '../core/types.js';
import { parseComponent } from '../parsing/parser-factory.js';
import { renderComponent } from '../rendering/renderer-factory.js';
import type { ParserOptions } from '../parsing/parser-interface.js';
import type { RenderOptions } from '../rendering/renderer-interface.js';

export interface TransformOptions extends ParserOptions, RenderOptions {
  sourceAgent?: AgentId;
  targetAgent: AgentId;
}

export interface TransformResult {
  success: boolean;
  output?: string;
  filename?: string;
  spec?: ComponentSpec;
  errors: string[];
  warnings: string[];
  fidelityScore?: number;
}

export function transform(
  content: string,
  options: TransformOptions
): TransformResult {
  const warnings: string[] = [];

  // Step 1: Parse the source content
  const parseResult = parseComponent(content, {
    ...options,
    agentId: options.sourceAgent,
  });

  if (!parseResult.success || !parseResult.spec) {
    return {
      success: false,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
    };
  }

  warnings.push(...parseResult.warnings);

  // Step 2: Render to target agent
  const renderResult = renderComponent(parseResult.spec, options.targetAgent, options);

  if (!renderResult.success) {
    return {
      success: false,
      errors: renderResult.errors,
      warnings,
    };
  }

  // Collect warnings from render report
  if (renderResult.report) {
    for (const w of renderResult.report.warnings) {
      warnings.push(`[${w.code}] ${w.message}`);
    }
    for (const loss of renderResult.report.losses) {
      if (loss.severity === 'warning' || loss.severity === 'critical') {
        warnings.push(`[LOSS:${loss.category}] ${loss.description}`);
      }
    }
  }

  return {
    success: true,
    output: renderResult.content,
    filename: renderResult.filename,
    spec: parseResult.spec,
    errors: [],
    warnings,
    fidelityScore: renderResult.report?.fidelityScore,
  };
}

export function transformSpec(
  spec: ComponentSpec,
  targetAgent: AgentId,
  options?: RenderOptions
): RenderResult {
  return renderComponent(spec, targetAgent, options);
}
