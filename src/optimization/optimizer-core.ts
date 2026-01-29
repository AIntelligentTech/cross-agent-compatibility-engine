/**
 * LLM Optimization Core System
 * 
 * Provides semantic reconstruction of lost features during agent conversion.
 * Uses LLM-based optimization to approximate lost functionality through
 * explicit instructions and target-specific adaptations.
 */

import type { AgentId, ComponentType } from '../core/types.js';

export type RiskLevel = 'safe' | 'medium' | 'high' | 'dangerous';

export interface OptimizationOptions {
  riskLevel: RiskLevel;
  dryRun?: boolean;
  preserveStructure?: boolean;
  targetVersion?: string;
}

export interface OptimizationChange {
  type: 'frontmatter' | 'body' | 'structure' | 'reference';
  severity: 'info' | 'warning' | 'critical';
  location: string;
  original?: string;
  proposed: string;
  rationale: string;
  category: 
    | 'default-value' 
    | 'syntax-fix' 
    | 'semantic-reconstruction' 
    | 'feature-approximation' 
    | 'best-practice' 
    | 'safety-guardrail';
  reversible: boolean;
}

export interface OptimizationResult {
  success: boolean;
  originalContent: string;
  optimizedContent?: string;
  agent: AgentId;
  componentType: ComponentType;
  riskLevel: RiskLevel;
  changes: OptimizationChange[];
  warnings: string[];
  stats: {
    changesByType: Record<string, number>;
    featuresApproximated: number;
    safetyGuardrailsAdded: number;
  };
  fidelity: {
    original: number;
    afterConversion: number;
    afterOptimization: number;
  };
}

export interface OptimizationContext {
  sourceAgent?: AgentId;
  targetAgent: AgentId;
  componentType: ComponentType;
  lostFeatures: LostFeature[];
  originalFrontmatter: Record<string, unknown>;
  targetFrontmatter: Record<string, unknown>;
  originalBody: string;
  targetBody: string;
}

export interface LostFeature {
  name: string;
  sourceValue: unknown;
  severity: 'critical' | 'high' | 'medium' | 'low';
  semanticImpact: string;
  approximationStrategy: string;
}

/**
 * Base class for LLM optimizers
 */
export abstract class BaseOptimizer {
  abstract readonly targetAgent: AgentId;
  abstract readonly supportedRiskLevels: readonly RiskLevel[];

  /**
   * Main optimization entry point
   */
  abstract optimize(
    content: string,
    context: OptimizationContext,
    options: OptimizationOptions
  ): Promise<OptimizationResult>;

  /**
   * Analyze what was lost in conversion
   */
  abstract analyzeLoss(
    context: OptimizationContext
  ): LostFeature[];

  /**
   * Generate optimization prompt for LLM
   */
  protected generatePrompt(
    context: OptimizationContext,
    riskLevel: RiskLevel,
    changes: OptimizationChange[]
  ): string {
    return `
You are an expert AI coding assistant configuration optimizer. 
Your task is to improve a converted agent component to better match the original intent.

## ORIGINAL (Source Agent: ${context.sourceAgent})
Frontmatter:
${JSON.stringify(context.originalFrontmatter, null, 2)}

Body:
${context.originalBody}

## CONVERTED (Target Agent: ${context.targetAgent})
Frontmatter:
${JSON.stringify(context.targetFrontmatter, null, 2)}

Body:
${context.targetBody}

## LOST FEATURES
${context.lostFeatures.map(f => `- ${f.name}: ${f.semanticImpact}`).join('\n')}

## RISK LEVEL: ${riskLevel.toUpperCase()}
${this.getRiskLevelInstructions(riskLevel)}

## TASK
Optimize the converted component to:
1. Approximate lost features through explicit instructions
2. Add target-specific best practices
3. Fix obvious conversion errors
4. Maintain semantic intent

Output only the optimized content in the target agent's format.
Include comments explaining major changes.
`.trim();
  }

  private getRiskLevelInstructions(riskLevel: RiskLevel): string {
    const instructions: Record<RiskLevel, string> = {
      safe: `
- ONLY fix: syntax errors, formatting, obvious defaults
- PRESERVE: All body content exactly as-is
- PRESERVE: All frontmatter fields
- DO NOT: Add new instructions, modify body, change structure
- GOAL: Safe, conservative fixes only`,

      medium: `
- CAN: Improve frontmatter defaults (globs, descriptions)
- CAN: Add target-specific best practices
- CAN: Fix broken references
- CANNOT: Modify body instructions substantially
- CANNOT: Change core logic or safety constraints
- GOAL: Optimize without behavioral change`,

      high: `
- CAN: Rewrite body content for target agent
- CAN: Reinterpret features in target-appropriate way
- CAN: Add/remove instructions to preserve intent
- CAN: Add safety guardrails for lost restrictions
- CANNOT: Change core purpose
- GOAL: Maximum optimization preserving intent`,

      dangerous: `
- CAN: Major restructuring
- CAN: Broad interpretation of intent
- CAN: Add new capabilities
- CAN: Remove constraints if beneficial
- REQUIRES: Explicit user acknowledgment
- GOAL: Best possible result for target agent`
    };

    return instructions[riskLevel];
  }

  /**
   * Calculate fidelity scores
   */
  protected calculateFidelity(
    original: string,
    converted: string,
    optimized?: string
  ): OptimizationResult['fidelity'] {
    // Simple string similarity (in real implementation, use semantic similarity)
    const originalTokens = new Set(original.split(/\s+/));
    const convertedTokens = new Set(converted.split(/\s+/));
    const optimizedTokens = optimized ? new Set(optimized.split(/\s+/)) : convertedTokens;

    const convertedIntersection = new Set([...originalTokens].filter(x => convertedTokens.has(x)));
    const optimizedIntersection = new Set([...originalTokens].filter(x => optimizedTokens.has(x)));

    return {
      original: 100,
      afterConversion: Math.round((convertedIntersection.size / originalTokens.size) * 100),
      afterOptimization: Math.round((optimizedIntersection.size / originalTokens.size) * 100)
    };
  }
}

/**
 * Factory for getting appropriate optimizer
 */
export class OptimizerFactory {
  private static optimizers = new Map<AgentId, BaseOptimizer>();

  static register(optimizer: BaseOptimizer): void {
    OptimizerFactory.optimizers.set(optimizer.targetAgent, optimizer);
  }

  static getOptimizer(agent: AgentId): BaseOptimizer | undefined {
    return OptimizerFactory.optimizers.get(agent);
  }

  static getSupportedOptimizers(): AgentId[] {
    return Array.from(OptimizerFactory.optimizers.keys());
  }
}
