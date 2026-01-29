/**
 * Claude-to-Target Optimizer
 * 
 * Optimizes conversions FROM Claude Code to other agents.
 * Focuses on reconstructing:
 * - context: fork isolation
 * - allowed-tools restrictions
 * - agent delegation
 * - model preferences
 */

import { BaseOptimizer, type OptimizationContext, type OptimizationOptions, type OptimizationResult, type OptimizationChange, type LostFeature } from '../optimizer-core.js';
import matter from 'gray-matter';

export class ClaudeSourceOptimizer extends BaseOptimizer {
  readonly targetAgent = 'claude' as const; // Source optimizer
  readonly supportedRiskLevels = ['safe', 'medium', 'high', 'dangerous'] as const;

  async optimize(
    content: string,
    context: OptimizationContext,
    options: OptimizationOptions
  ): Promise<OptimizationResult> {
    const changes: OptimizationChange[] = [];
    const warnings: string[] = [];
    const stats = {
      changesByType: {} as Record<string, number>,
      featuresApproximated: 0,
      safetyGuardrailsAdded: 0
    };

    // Parse current content
    const parsed = matter(content);
    const fm = parsed.data as Record<string, unknown>;
    let body = parsed.content.trim();

    // Analyze what we lost
    const lostFeatures = this.analyzeLoss(context);

    // Apply optimizations based on risk level
    for (const feature of lostFeatures) {
      const change = this.approximateFeature(feature, body, fm, options.riskLevel);
      if (change) {
        changes.push(change);
        stats.featuresApproximated++;
        
        if (change.category === 'safety-guardrail') {
          stats.safetyGuardrailsAdded++;
        }

        // Apply the change
        if (change.type === 'body') {
          body = change.proposed;
        }
      }
    }

    // Add target-specific best practices
    if (options.riskLevel !== 'safe') {
      const bestPractices = this.addBestPractices(context, body, fm, options.riskLevel);
      changes.push(...bestPractices);
    }

    // Reconstruct frontmatter
    const optimizedFrontmatter = this.reconstructFrontmatter(fm, context, options.riskLevel);

    // Build optimized content
    const optimizedContent = matter.stringify(body, optimizedFrontmatter);

    // Calculate fidelity
    const fidelity = this.calculateFidelity(
      context.originalBody,
      context.targetBody,
      body
    );

    return {
      success: true,
      originalContent: content,
      optimizedContent,
      agent: context.targetAgent,
      componentType: context.componentType,
      riskLevel: options.riskLevel,
      changes,
      warnings,
      stats: {
        changesByType: this.aggregateChangesByType(changes),
        featuresApproximated: stats.featuresApproximated,
        safetyGuardrailsAdded: stats.safetyGuardrailsAdded
      },
      fidelity
    };
  }

  analyzeLoss(context: OptimizationContext): LostFeature[] {
    const lost: LostFeature[] = [];
    const original = context.originalFrontmatter || {};

    // Check for fork context loss
    if (original.context === 'fork') {
      lost.push({
        name: 'context: fork',
        sourceValue: 'fork',
        severity: 'critical',
        semanticImpact: 'Skill requires isolated execution, will run in shared context',
        approximationStrategy: 'Add explicit instructions to clear context first, document isolation requirement'
      });
    }

    // Check for allowed-tools loss
    if (original['allowed-tools'] && Array.isArray(original['allowed-tools'])) {
      lost.push({
        name: 'allowed-tools',
        sourceValue: original['allowed-tools'],
        severity: 'high',
        semanticImpact: 'Tool restrictions lost, skill has full capabilities',
        approximationStrategy: 'Add explicit "DO NOT USE" instructions for restricted tools'
      });
    }

    // Check for agent delegation loss
    if (original.agent) {
      lost.push({
        name: `agent: ${original.agent}`,
        sourceValue: original.agent,
        severity: 'high',
        semanticImpact: 'Subagent delegation lost, runs in main context',
        approximationStrategy: 'Add instructions for manual delegation or context management'
      });
    }

    // Check for model preference loss
    if (original.model) {
      lost.push({
        name: 'model preference',
        sourceValue: original.model,
        severity: 'medium',
        semanticImpact: 'Model-specific optimizations lost',
        approximationStrategy: 'Note model preference in description'
      });
    }

    // Check for argument-hint loss
    if (original['argument-hint']) {
      lost.push({
        name: 'argument-hint',
        sourceValue: original['argument-hint'],
        severity: 'low',
        semanticImpact: 'Argument documentation lost',
        approximationStrategy: 'Add argument documentation to body'
      });
    }

    return lost;
  }

  private approximateFeature(
    feature: LostFeature,
    body: string,
    _fm: Record<string, unknown>,
    riskLevel: string
  ): OptimizationChange | null {
    switch (feature.name) {
      case 'context: fork':
        return this.approximateForkContext(body, feature, riskLevel);
      case 'allowed-tools':
        return this.approximateToolRestrictions(body, feature, riskLevel);
      case 'agent: explore':
      case 'agent: plan':
        return this.approximateAgentDelegation(body, feature, riskLevel);
      default:
        return null;
    }
  }

  private approximateForkContext(
    body: string,
    feature: LostFeature,
    riskLevel: string
  ): OptimizationChange | null {
    if (riskLevel === 'safe') {
      return {
        type: 'body',
        severity: 'warning',
        location: 'body-prefix',
        proposed: body, // No change in safe mode
        rationale: `Lost feature "${feature.name}" requires explicit user handling`,
        category: 'semantic-reconstruction',
        reversible: true
      };
    }

    const guardrail = riskLevel === 'dangerous' 
      ? '' 
      : `

⚠️ ISOLATION REQUIRED ⚠️
This process should run in isolated context (equivalent to Claude's context: fork).
Since this agent doesn't support automatic isolation:
- Run /clear before executing if context is full
- This process may be interrupted by other operations
- Results should be reviewed before continuing
`;

    return {
      type: 'body',
      severity: 'critical',
      location: 'body-prefix',
      original: body.slice(0, 100) + '...',
      proposed: guardrail + '\n' + body,
      rationale: 'Approximated fork context with explicit isolation instructions',
      category: 'safety-guardrail',
      reversible: true
    };
  }

  private approximateToolRestrictions(
    body: string,
    feature: LostFeature,
    riskLevel: string
  ): OptimizationChange | null {
    if (riskLevel === 'safe') return null;

    const allowedTools = feature.sourceValue as string[];
    const restrictedTools = this.inverseToolList(allowedTools);

    const restriction = `

🔒 TOOL RESTRICTIONS 🔒
This skill is designed to be READ-ONLY for safety.
DO NOT use the following tools:
${restrictedTools.map(t => `- ${t}: DO NOT USE`).join('\n')}

If you need to modify files, ask the user for explicit permission first.
`;

    return {
      type: 'body',
      severity: 'critical',
      location: 'body-prefix',
      original: body.slice(0, 100) + '...',
      proposed: restriction + '\n' + body,
      rationale: 'Converted allowed-tools restrictions into explicit safety instructions',
      category: 'safety-guardrail',
      reversible: true
    };
  }

  private approximateAgentDelegation(
    body: string,
    feature: LostFeature,
    riskLevel: string
  ): OptimizationChange | null {
    if (riskLevel === 'safe') return null;

    const agentType = feature.sourceValue as string;
    
    const delegation = `

📋 DELEGATION NOTE 📋
Original skill delegated to "${agentType}" subagent for:
${agentType === 'explore' ? '- Read-only codebase exploration\n- Fast initial analysis' : 
  agentType === 'plan' ? '- Planning and analysis phase\n- Before implementation' : 
  '- Specialized processing'}

Since this agent doesn't support subagent delegation:
- This runs in main context
- Consider using @agent mentions if available
- Break into separate manual steps if needed
`;

    return {
      type: 'body',
      severity: 'warning',
      location: 'body-section',
      original: body,
      proposed: body + delegation,
      rationale: 'Documented lost subagent delegation',
      category: 'semantic-reconstruction',
      reversible: true
    };
  }

  private addBestPractices(
    context: OptimizationContext,
    body: string,
    fm: Record<string, unknown>,
    riskLevel: string
  ): OptimizationChange[] {
    const changes: OptimizationChange[] = [];

    // Improve globs for Cursor
    if (context.targetAgent === 'cursor' && !fm.globs && riskLevel !== 'safe') {
      changes.push({
        type: 'frontmatter',
        severity: 'info',
        location: 'frontmatter',
        original: 'globs: undefined',
        proposed: 'globs: ["src/**/*.{ts,tsx,js,jsx}", "**/*.md"]',
        rationale: 'Added sensible default globs based on common project structures',
        category: 'best-practice',
        reversible: true
      });
    }

    return changes;
  }

  private reconstructFrontmatter(
    fm: Record<string, unknown>,
    context: OptimizationContext,
    riskLevel: string
  ): Record<string, unknown> {
    const reconstructed = { ...fm };

    // Add description if missing (from original)
    if (!reconstructed.description && context.originalFrontmatter.description) {
      reconstructed.description = context.originalFrontmatter.description;
    }

    // Add model note if lost
    if (context.originalFrontmatter.model && riskLevel !== 'safe') {
      const originalDesc = (reconstructed.description as string) || '';
      if (!originalDesc.includes('model')) {
        reconstructed.description = `${originalDesc} (Optimized for: ${context.originalFrontmatter.model})`.trim();
      }
    }

    return reconstructed;
  }

  private inverseToolList(allowed: string[]): string[] {
    const allTools = ['Read', 'Edit', 'Write', 'Bash', 'Task', 'Search', 'Grep', 'Glob', 'GitCommit', 'UserInput'];
    return allTools.filter(t => !allowed.includes(t));
  }

  private aggregateChangesByType(changes: OptimizationChange[]): Record<string, number> {
    return changes.reduce((acc, change) => {
      acc[change.type] = (acc[change.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
