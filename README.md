# Cross-Agent Compatibility Engine (CACE)

A comprehensive, flexible, version-aware cross-agent compatibility engine for bidirectional conversion of agent components between Claude Code, Windsurf (Cascade), and Cursor.

## Features

- **Parse** any agent-specific component (skill, workflow, command) from its native format
- **Normalize** into a canonical, agent-agnostic intermediate representation (IR)
- **Transform** bidirectionally between agents with version awareness
- **Render** optimized output for any target agent
- **Validate** that conversions preserve semantic intent
- **Report** conversion losses and fidelity scores

## Supported Agents

| Agent | Component Types | Status |
|-------|----------------|--------|
| **Claude Code** | skill, hook, memory, agent, config | ✅ Full support |
| **Windsurf (Cascade)** | workflow, rule, memory, config | ✅ Full support |
| **Cursor** | command, config | ✅ Full support |

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/cross-agent-compatibility-engine.git
cd cross-agent-compatibility-engine

# Install dependencies
bun install

# Build
bun run build

# Link CLI globally (optional)
bun link
```

## CLI Usage

### Convert a component

```bash
# Convert a Windsurf workflow to Claude skill
cace convert .windsurf/workflows/deep-architect.md --to claude

# Convert with explicit source agent
cace convert my-skill.md --from claude --to cursor

# Dry run (preview without writing)
cace convert workflow.md --to windsurf --dry-run

# Specify output path
cace convert skill.md --to cursor --output .cursor/commands/my-command.md

# Include conversion comments
cace convert workflow.md --to claude --comments
```

### Validate a component

```bash
# Validate with auto-detection
cace validate .windsurf/workflows/deep-code.md

# Validate with explicit agent
cace validate my-skill.md --from claude

# Verbose output
cace validate workflow.md --verbose
```

### Batch operations

```bash
# Convert multiple files
cace batch-convert .windsurf/workflows/*.md --to claude

# Validate multiple files
cace batch-validate .claude/skills/*/SKILL.md
```

### Utility commands

```bash
# List supported agents
cace agents

# Show compatibility matrix
cace matrix
```

## Programmatic API

```typescript
import { transform, parseComponent, renderComponent } from 'cross-agent-compatibility-engine';

// Full transformation
const result = transform(sourceContent, {
  sourceAgent: 'windsurf',
  targetAgent: 'claude',
});

if (result.success) {
  console.log(result.output);
  console.log(`Fidelity: ${result.fidelityScore}%`);
}

// Parse only
const parseResult = parseComponent(content, { agentId: 'claude' });

// Render from spec
const renderResult = renderComponent(spec, 'cursor');
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-AGENT COMPATIBILITY ENGINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ SOURCE AGENT │───▶│ CANONICAL IR     │───▶│ TARGET AGENT             │  │
│  │              │    │ (ComponentSpec)  │    │                          │  │
│  │ • Parser     │    │                  │    │ • Renderer               │  │
│  │ • Validator  │    │ • Intent         │    │ • Optimizer              │  │
│  │ • Version    │    │ • Capabilities   │    │ • Version Adapter        │  │
│  │   Detector   │    │ • Metadata       │    │ • Validator              │  │
│  └──────────────┘    └──────────────────┘    └──────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Conversion Pipeline

1. **Parse** - Detect agent + version, extract to IR
2. **Validate** - Check IR completeness, semantic consistency
3. **Enrich** - Infer missing capabilities, normalize metadata
4. **Map** - Apply capability mappings for target agent
5. **Adapt** - Apply version-specific adaptations
6. **Render** - Generate target-native artifact
7. **Optimize** - Apply agent-specific best practices
8. **Validate** - Verify output structure, report losses

## Fidelity & Loss Reporting

Every conversion produces a detailed report:

```typescript
interface ConversionReport {
  preservedSemantics: string[];  // What was kept
  losses: ConversionLoss[];      // What was lost
  warnings: ConversionWarning[]; // Potential issues
  suggestions: string[];         // Manual review hints
  fidelityScore: number;         // 0-100 score
}
```

### Example losses

| Source | Target | Feature | Handling |
|--------|--------|---------|----------|
| Claude `context: fork` | Windsurf | Fork execution | ⚠️ Lost - runs in main |
| Claude `allowed-tools` | Cursor | Tool restrictions | ⚠️ Lost - no enforcement |
| Windsurf `auto_execution_mode` | Cursor | Auto-activation | ⚠️ Lost - always manual |
| Claude `$ARGUMENTS` | Windsurf | Structured args | ✅ Converted to prose |

## Project Structure

```
cross-agent-compatibility-engine/
├── src/
│   ├── core/
│   │   ├── types.ts          # ComponentSpec, IR types
│   │   ├── constants.ts      # Agent metadata
│   │   └── schema.ts         # Zod validation schemas
│   ├── parsing/
│   │   ├── parser-interface.ts
│   │   ├── claude-parser.ts
│   │   ├── windsurf-parser.ts
│   │   └── cursor-parser.ts
│   ├── rendering/
│   │   ├── renderer-interface.ts
│   │   ├── claude-renderer.ts
│   │   ├── windsurf-renderer.ts
│   │   └── cursor-renderer.ts
│   ├── transformation/
│   │   ├── transformer.ts
│   │   └── capability-mapper.ts
│   ├── cli/
│   │   ├── index.ts          # CLI entry point
│   │   ├── convert.ts
│   │   └── validate.ts
│   └── index.ts              # Public API
├── tests/
├── package.json
└── tsconfig.json
```

## Development

```bash
# Type check
bun run typecheck

# Run tests
bun test

# Build
bun run build

# Watch mode
bun run dev
```

## Roadmap

### Phase 1: Core Engine (MVP) ✅
- [x] ComponentSpec schema
- [x] Parsers for Claude, Windsurf, Cursor
- [x] Renderers for Claude, Windsurf, Cursor
- [x] Basic capability mapping
- [x] CLI: convert, validate commands
- [x] Loss reporting

### Phase 2: Version Awareness
- [ ] Version catalog for each agent
- [ ] Version detection in parsers
- [ ] Version-specific rendering adapters
- [ ] Migration guides for breaking changes

### Phase 3: Advanced Features
- [ ] Bidirectional round-trip validation
- [ ] Semantic diff between components
- [ ] Batch conversion with parallelization
- [ ] Plugin system for new agents

### Phase 4: Ecosystem Integration
- [ ] IDE extensions (VS Code, JetBrains)
- [ ] CI/CD integration (GitHub Actions)
- [ ] Web UI for browsing and converting
- [ ] Registry of community components

## License

MIT
