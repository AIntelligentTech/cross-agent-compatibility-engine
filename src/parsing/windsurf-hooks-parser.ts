/**
 * Parser for Windsurf Cascade Hooks (.windsurf/hooks.json)
 *
 * Windsurf hooks use a structured JSON format with event-keyed hook arrays.
 * This parser reads .windsurf/hooks.json into a WindsurfHooksSpec intermediate
 * representation for inspection, round-trip conversion, and fidelity analysis.
 */

// ============================================================================
// Windsurf Hooks Types
// ============================================================================

export interface WindsurfHook {
  command: string;
  show_output?: boolean;
  working_directory?: string;
}

export interface WindsurfHooksSpec {
  /** Map from Windsurf event name to array of hook configurations */
  hooks: Record<string, WindsurfHook[]>;
}

// ============================================================================
// Parser
// ============================================================================

export interface WindsurfHooksParseResult {
  success: boolean;
  spec?: WindsurfHooksSpec;
  errors: string[];
  warnings: string[];
}

/**
 * Parse the content of a .windsurf/hooks.json file into a WindsurfHooksSpec.
 *
 * The parser is intentionally lenient: unknown fields are preserved in the
 * WindsurfHook objects (they won't break the parse). Unknown event names are
 * accepted but generate a warning since the Windsurf event vocabulary may
 * expand over time.
 */
export function parseWindsurfHooks(content: string): WindsurfHooksParseResult {
  const warnings: string[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    return {
      success: false,
      errors: [
        `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      ],
      warnings: [],
    };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      success: false,
      errors: ["Root value must be a JSON object"],
      warnings: [],
    };
  }

  const obj = raw as Record<string, unknown>;

  if (!("hooks" in obj)) {
    return {
      success: false,
      errors: ['Missing required "hooks" key'],
      warnings: [],
    };
  }

  const hooksValue = obj["hooks"];
  if (typeof hooksValue !== "object" || hooksValue === null || Array.isArray(hooksValue)) {
    return {
      success: false,
      errors: ['"hooks" must be an object mapping event names to arrays'],
      warnings: [],
    };
  }

  const knownWindsurfEvents = new Set([
    "pre_read_code",
    "post_read_code",
    "pre_write_code",
    "post_write_code",
    "pre_run_command",
    "post_run_command",
    "pre_mcp_tool_use",
    "post_mcp_tool_use",
    "pre_user_prompt",
    "post_cascade_response",
    "post_cascade_response_with_transcript",
    "post_setup_worktree",
  ]);

  const hooksObj = hooksValue as Record<string, unknown>;
  const parsedHooks: Record<string, WindsurfHook[]> = {};

  for (const [eventName, hookList] of Object.entries(hooksObj)) {
    if (!knownWindsurfEvents.has(eventName)) {
      warnings.push(
        `Unknown Windsurf event "${eventName}" — may not be supported by current Cascade versions`,
      );
    }

    if (!Array.isArray(hookList)) {
      return {
        success: false,
        errors: [`Event "${eventName}" must map to an array of hook objects`],
        warnings,
      };
    }

    const hooks: WindsurfHook[] = [];
    for (let i = 0; i < hookList.length; i++) {
      const item = hookList[i];
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return {
          success: false,
          errors: [
            `Event "${eventName}" hook at index ${i} must be an object`,
          ],
          warnings,
        };
      }

      const hookObj = item as Record<string, unknown>;
      if (typeof hookObj["command"] !== "string") {
        return {
          success: false,
          errors: [
            `Event "${eventName}" hook at index ${i} missing required "command" string field`,
          ],
          warnings,
        };
      }

      const hook: WindsurfHook = {
        command: hookObj["command"] as string,
      };

      if (typeof hookObj["show_output"] === "boolean") {
        hook.show_output = hookObj["show_output"];
      }
      if (typeof hookObj["working_directory"] === "string") {
        hook.working_directory = hookObj["working_directory"];
      }

      hooks.push(hook);
    }

    parsedHooks[eventName] = hooks;
  }

  return {
    success: true,
    spec: { hooks: parsedHooks },
    errors: [],
    warnings,
  };
}
