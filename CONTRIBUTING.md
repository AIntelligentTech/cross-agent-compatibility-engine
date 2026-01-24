# Contributing to Cross-Agent Compatibility Engine

Thank you for your interest in contributing to CACE! This document provides
guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Adding New Agents](#adding-new-agents)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0 (recommended) or Node.js >= 18.0.0
- Git
- TypeScript knowledge

### Development Setup

```bash
# Clone the repository
git clone https://github.com/AIntelligentTech/cross-agent-compatibility-engine.git
cd cross-agent-compatibility-engine

# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun test

# Type check
bun run typecheck
```

## Making Changes

### Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/aider-support`)
- `fix/` - Bug fixes (e.g., `fix/cursor-parser-edge-case`)
- `docs/` - Documentation changes (e.g., `docs/api-examples`)
- `refactor/` - Code refactoring (e.g., `refactor/parser-interface`)
- `test/` - Test additions/fixes (e.g., `test/windsurf-renderer`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `test` - Adding or fixing tests
- `chore` - Maintenance tasks

**Examples:**

```
feat(parser): add support for Aider agent

fix(cursor-renderer): handle empty tool arrays

docs(readme): add batch conversion examples

test(versioning): add migration guide edge cases
```

## Coding Standards

### TypeScript Guidelines

We use strict TypeScript. Key requirements:

```typescript
// Use explicit types for exports
export function parseComponent(
  content: string,
  options: ParseOptions,
): ParseResult {
  // ...
}

// Prefer interfaces over type aliases for objects
interface ComponentSpec {
  id: string;
  name: string;
  // ...
}

// Use const assertions for literal objects
const AGENT_IDS = ["claude", "windsurf", "cursor"] as const;

// Prefer nullish coalescing over ||
const value = input ?? defaultValue;

// Use optional chaining
const name = config?.metadata?.name;
```

### Code Style

- **No `any`** - Use `unknown` and type narrowing instead
- **No `@ts-ignore`** - Fix type issues properly
- **No non-null assertions** (`!`) - Use optional chaining or guards
- **Explicit return types** on exported functions
- **Meaningful names** - Avoid abbreviations

### File Organization

```
src/
├── core/           # Core types, schemas, constants
├── parsing/        # Agent-specific parsers
│   └── memory/     # Memory file parsers
├── rendering/      # Agent-specific renderers
│   └── memory/     # Memory file renderers
├── transformation/ # Transformation pipeline
├── versioning/     # Version detection and adaptation
└── cli/            # CLI commands
```

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/parsing/parser.test.ts

# Run tests with coverage (when configured)
bun test --coverage
```

### Writing Tests

```typescript
import { describe, test, expect } from "bun:test";

describe("ClaudeParser", () => {
  test("should parse skill with all fields", () => {
    const content = `---
name: my-skill
description: A test skill
---
Instructions here`;

    const result = parseClaudeSkill(content);

    expect(result.name).toBe("my-skill");
    expect(result.description).toBe("A test skill");
  });

  test("should handle missing optional fields", () => {
    // Test edge cases
  });
});
```

### Test Requirements

- All new features must include tests
- All bug fixes must include regression tests
- Maintain or improve existing coverage
- Test both success and error paths

## Pull Request Process

### Before Submitting

1. **Ensure tests pass**: `bun test`
2. **Type check passes**: `bun run typecheck`
3. **Lint passes**: `bun run lint` (if configured)
4. **Build succeeds**: `bun run build`
5. **Update documentation** if needed

### PR Template

When opening a PR, include:

```markdown
## Summary

Brief description of changes.

## Changes

- Change 1
- Change 2

## Testing

How were these changes tested?

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (for features/fixes)
- [ ] Types are correct (no `any`)
```

### Review Process

1. Create PR against `main` branch
2. Automated CI checks must pass
3. At least one maintainer review required
4. Address review feedback
5. Squash and merge when approved

## Adding New Agents

To add support for a new agent (e.g., Aider):

### 1. Update Core Types

```typescript
// src/core/types.ts
export type AgentId =
  | "claude"
  | "windsurf"
  | "cursor"
  | "aider" // Add new agent
  | "universal";
```

### 2. Add Agent Constants

```typescript
// src/core/constants.ts
export const AGENT_METADATA: Record<AgentId, AgentMetadata> = {
  // ...existing agents...
  aider: {
    name: "Aider",
    filePatterns: [".aider/**/*.md"],
    configFile: ".aider.conf.yml",
    componentTypes: ["command", "config"],
  },
};
```

### 3. Create Parser

```typescript
// src/parsing/aider-parser.ts
import { BaseParser } from "./parser-interface";

export class AiderParser extends BaseParser {
  readonly agentId = "aider" as const;

  parse(content: string): ComponentSpec {
    // Implementation
  }

  detect(content: string): boolean {
    // Detection logic
  }
}
```

### 4. Create Renderer

```typescript
// src/rendering/aider-renderer.ts
import { BaseRenderer } from "./renderer-interface";

export class AiderRenderer extends BaseRenderer {
  readonly agentId = "aider" as const;

  render(spec: ComponentSpec): string {
    // Implementation
  }
}
```

### 5. Register in Factories

```typescript
// src/parsing/parser-factory.ts
import { AiderParser } from "./aider-parser";

registerParser(new AiderParser());

// src/rendering/renderer-factory.ts
import { AiderRenderer } from "./aider-renderer";

registerRenderer(new AiderRenderer());
```

### 6. Add Version Information (Optional)

```typescript
// src/versioning/version-catalog.ts
export const AIDER_VERSIONS: AgentVersionInfo[] = [
  {
    version: { major: 1, minor: 0, patch: 0 },
    releaseDate: "2024-01-01",
    features: ["basic-commands"],
    breakingChanges: [],
  },
];
```

### 7. Write Tests

Create comprehensive tests in:

- `src/parsing/aider-parser.test.ts`
- `src/rendering/aider-renderer.test.ts`

### 8. Update Documentation

- Update README.md agent support table
- Add examples to CLI usage section
- Update CHANGELOG.md

## Questions?

- Open a
  [GitHub Discussion](https://github.com/AIntelligentTech/cross-agent-compatibility-engine/discussions)
- Check existing issues for similar questions
- Review documentation in `/docs`

Thank you for contributing!
