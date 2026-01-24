# Response Boxes Integration Guide

**Version:** 1.0.0 **Last Updated:** 2026-01-24

This document describes how CACE (Cross-Agent Compatibility Engine) integrates
with the Response Boxes metacognitive system.

---

## Overview

Response Boxes is a structured annotation system that enables AI coding agents
to:

- Surface hidden reasoning and assumptions
- Track cross-session learning
- Self-assess response quality

CACE can convert Response Boxes components between agents, enabling consistent
metacognitive behavior across Claude Code, OpenCode, Windsurf, and Cursor.

---

## Response Boxes Architecture

### Core Components

| Component        | Purpose                           | Location                                       |
| ---------------- | --------------------------------- | ---------------------------------------------- |
| **Rules/Spec**   | Box taxonomy and usage guidelines | `agents/<agent>/rules/response-boxes.md`       |
| **Output Style** | Format specification              | `agents/<agent>/output-styles/response-box.md` |
| **Collector**    | Captures boxes from responses     | Hooks/plugins                                  |
| **Injector**     | Injects cross-session context     | Hooks/plugins                                  |
| **Analyzer**     | Synthesizes learnings from boxes  | `/analyze-boxes` skill                         |

### Event Store

All agents share a common event store:

```
~/.response-boxes/analytics/boxes.jsonl
```

This append-only JSONL file contains:

- `BoxCreated` - Raw boxes from responses
- `LearningCreated` - Synthesized patterns
- `EvidenceLinked` - Box-to-learning connections

---

## Converting Response Boxes Components

### Rules Conversion

```bash
# Convert Claude rules to Windsurf
cace convert agents/claude-code/rules/response-boxes.md --to windsurf

# Convert to Cursor (.mdc format)
cace convert agents/claude-code/rules/response-boxes.md --to cursor
```

**Conversion Notes:**

- Claude's 400+ line spec may exceed Windsurf's 12k char limit
- Split into multiple rule files if necessary
- Cursor supports both `.md` and `.mdc` formats

### Skill Conversion

```bash
# Convert analyze-boxes skill to Windsurf workflow
cace convert agents/claude-code/skills/analyze-boxes/SKILL.md --to windsurf

# Convert to OpenCode (native fallback available)
cace convert agents/claude-code/skills/analyze-boxes/SKILL.md --to opencode
```

**Conversion Notes:**

- Windsurf workflows cannot use `context: fork`
- OpenCode natively reads `.claude/skills/` via fallback
- Cursor skills are Nightly-only

### Hook Conversion

```bash
# Preview hook event mapping
cace inspect agents/claude-code/hooks/session-processor.sh --verbose
```

**Event Mapping:**

| Claude Code    | Windsurf                | OpenCode          | Cursor               |
| -------------- | ----------------------- | ----------------- | -------------------- |
| `SessionStart` | ❌ None                 | `session.created` | ❌ None              |
| `SessionEnd`   | ❌ None                 | `session.deleted` | ❌ None              |
| `PostToolUse`  | `post_cascade_response` | `message.updated` | `afterAgentResponse` |

---

## Agent-Specific Implementations

### Claude Code (Reference)

**Full support** - All features implemented:

- `SessionStart` hook for automatic injection
- `SessionEnd` hook for automatic collection
- Native skill support for `/analyze-boxes`
- Output style for format guidance

### OpenCode

**Full support** via plugin:

- `message.updated` event for collection
- `experimental.chat.system.transform` for injection
- Native skill fallback to `.claude/skills/`

**CACE conversion not required** - OpenCode natively reads Claude artifacts.

### Windsurf

**Enhanced support** - Collection automatic, injection manual:

- `post_cascade_response` hook for collection
- Workflow for manual injection
- Rules for static guidance

**CACE useful for:**

- Converting Claude skills to Windsurf workflows
- Adapting rule format

### Cursor

**Basic support** - Collection automatic, injection manual:

- `afterAgentResponse` hook for collection
- Skill for manual context display
- Rules for static guidance

**CACE useful for:**

- Converting Claude skills to Cursor commands
- Adapting rule format to `.mdc`

---

## ComponentSpec for Response Boxes

Response Boxes components map to CACE's canonical IR:

```typescript
// Example: analyze-boxes skill
const analyzeBoxesSpec: ComponentSpec = {
  id: "response-boxes-analyze",
  version: { major: 1, minor: 0, patch: 0 },
  componentType: "skill",

  intent: {
    summary: "AI-powered analysis of response boxes",
    purpose: "Identify patterns, create learnings, link evidence",
    whenToUse: "After boxes accumulate across sessions",
  },

  activation: {
    mode: "manual",
    safetyLevel: "safe",
    triggers: [
      {
        type: "keyword",
        keywords: ["analyze-boxes", "review boxes", "synthesize learnings"],
      },
    ],
  },

  invocation: {
    slashCommand: "analyze-boxes",
    userInvocable: true,
    arguments: [],
  },

  execution: {
    context: "main",
    allowedTools: ["Read", "Grep", "Glob", "Bash"],
  },

  capabilities: {
    needsFilesystem: true,
    needsShell: true,
    needsCodeSearch: true,
    needsNetwork: false,
    needsGit: false,
    needsBrowser: false,
    providesAnalysis: true,
    providesCodeGeneration: false,
    providesRefactoring: false,
    providesDocumentation: false,
  },

  body: `...skill instructions...`,

  metadata: {
    tags: ["metacognition", "learning", "self-improvement"],
    sourceFile: "agents/claude-code/skills/analyze-boxes/SKILL.md",
  },
};
```

---

## Conversion Report Integration

CACE conversion reports can be logged as Response Boxes events:

```typescript
// After conversion, emit a BoxCreated event
const conversionBox: BoxCreatedEvent = {
  event: "BoxCreated",
  id: `cace_conversion_${Date.now()}`,
  ts: new Date().toISOString(),
  box_type: "Decision",
  fields: {
    what: `Converted ${report.source.id} from ${report.source.agent} to ${report.target.agent}`,
    reasoning: `Fidelity: ${report.fidelityScore}%. Losses: ${report.losses.length}`,
  },
  context: {
    source: "cace",
    conversion_id: report.id,
  },
  initial_score: report.fidelityScore,
  schema_version: 1,
};
```

This enables tracking of cross-agent component migrations.

---

## Best Practices

### Converting Response Boxes Rules

1. **Check character limits** - Windsurf rules: 6k/file, 12k total
2. **Split large specs** - Break into logical sections
3. **Preserve box taxonomy** - The 13 box types are core to the system
4. **Keep examples** - Box format examples help agents learn

### Converting Response Boxes Skills

1. **Check tool requirements** - Some agents don't support `allowed-tools`
2. **Handle fork context** - Only Claude supports isolated execution
3. **Adapt shell commands** - jq dependency may need alternatives

### Cross-Agent Learning

1. **Share event store** - All agents read/write to same `boxes.jsonl`
2. **Standardize box format** - Same parsing works across agents
3. **Document agent source** - Include `context.agent` in events

---

## Related Documentation

- [Response Boxes: Cross-Agent Compatibility](../../agent-response-boxes/docs/cross-agent-compatibility.md)
- [CACE: Agent Artifact Compatibility Matrix](./research/agent-artifact-compatibility-matrix.md)
- [Response Boxes: Architecture](../../agent-response-boxes/docs/architecture.md)

---

## Changelog

| Version | Date       | Changes                   |
| ------- | ---------- | ------------------------- |
| 1.0.0   | 2026-01-24 | Initial integration guide |
