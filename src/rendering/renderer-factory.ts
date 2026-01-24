/**
 * Renderer factory for creating agent-specific renderers
 */

import type { AgentId, ComponentSpec, RenderResult } from '../core/types.js';
import type { AgentRenderer, RenderOptions } from './renderer-interface.js';
import { ClaudeRenderer } from './claude-renderer.js';
import { WindsurfRenderer } from './windsurf-renderer.js';
import { CursorRenderer } from './cursor-renderer.js';

const renderers: Map<AgentId, AgentRenderer> = new Map();

// Register default renderers
renderers.set('claude', new ClaudeRenderer());
renderers.set('windsurf', new WindsurfRenderer());
renderers.set('cursor', new CursorRenderer());

export function getRenderer(agentId: AgentId): AgentRenderer | undefined {
  return renderers.get(agentId);
}

export function registerRenderer(renderer: AgentRenderer): void {
  renderers.set(renderer.agentId, renderer);
}

export function getSupportedRenderers(): AgentId[] {
  return Array.from(renderers.keys());
}

export function renderComponent(
  spec: ComponentSpec,
  targetAgent: AgentId,
  options?: RenderOptions
): RenderResult {
  const renderer = getRenderer(targetAgent);

  if (!renderer) {
    return {
      success: false,
      errors: [`No renderer available for agent: ${targetAgent}`],
    };
  }

  return renderer.render(spec, options);
}

export function getTargetPath(spec: ComponentSpec, targetAgent: AgentId): string {
  const renderer = getRenderer(targetAgent);
  if (!renderer) {
    return `${spec.id}.md`;
  }
  
  const dir = renderer.getTargetDirectory(spec);
  const filename = renderer.getTargetFilename(spec);
  return `${dir}/${filename}`;
}
