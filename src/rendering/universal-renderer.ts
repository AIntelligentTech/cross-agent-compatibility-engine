/**
 * Universal (AGENTS.md) Renderer
 *
 * Wraps the memory renderer to implement the standard AgentRenderer interface.
 * AGENTS.md is a cross-agent standard for providing context to AI coding assistants.
 */

import type { ComponentSpec, RenderResult } from "../core/types.js";
import { BaseRenderer, type RenderOptions } from "./renderer-interface.js";
import { renderAgentsMd } from "./memory/agents-md-renderer.js";

export class UniversalRenderer extends BaseRenderer {
  readonly agentId = "universal" as const;

  render(spec: ComponentSpec, options?: RenderOptions): RenderResult {
    const startTime = Date.now();
    const result = renderAgentsMd(spec, {
      includeMetadata: options?.preserveOriginalMetadata,
    });

    // If successful, update the report with proper timing
    if (result.success && result.report) {
      result.report.durationMs = Date.now() - startTime;
    }

    return result;
  }

  getTargetFilename(_spec: ComponentSpec): string {
    // AGENTS.md is the standard filename
    return "AGENTS.md";
  }

  getTargetDirectory(_spec: ComponentSpec): string {
    // AGENTS.md goes in the project root
    return ".";
  }
}
