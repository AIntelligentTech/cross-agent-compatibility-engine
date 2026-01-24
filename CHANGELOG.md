# Changelog

All notable changes to the Cross-Agent Compatibility Engine (CACE) will be
documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-24

### Added

#### Version Awareness (Phase 2)

- **Version Catalog**: Complete version history for Claude Code (1.0, 1.5, 2.0),
  Windsurf (wave-1 through wave-13), and Cursor (0.34, 1.6, 1.7, 2.2, 2.3)
- **Version Detection**: Heuristic-based version detection from content and file
  paths with confidence scoring
- **Version Adaptation**: Automatic content adaptation when converting between
  agent versions
- **Migration Guides**: Step-by-step migration instructions with before/after
  examples
- **Feature Tracking**: Per-version feature introduction, deprecation, and
  removal tracking
- **Breaking Change Documentation**: Comprehensive breaking change catalog with
  severity levels

#### CLI Commands

- `cace version detect <file>` - Detect component version with confidence score
- `cace version list [--agent <agent>]` - List available versions for agents
- `cace version migration-guide <agent> --from <v1> --to <v2>` - Generate
  migration guide
- `cace version breaking-changes <agent> --from <v1> --to <v2>` - List breaking
  changes
- `cace version feature-check <agent> <feature> --version <v>` - Check feature
  availability
- `cace version analyze <agent> <from> <to>` - Analyze migration complexity

#### Test Coverage

- Comprehensive tests for version catalog (50+ tests)
- Version detection tests across all agents
- Version adaptation tests for upgrades and downgrades
- Migration guide generation tests
- Transformation pipeline tests
- Parser tests for all agents
- Renderer tests for all agents

### Changed

- Main index.ts now exports all versioning functionality
- Renderers now apply version adaptation during conversion
- README updated with Phase 2 completion and CLI documentation

## [0.1.0] - 2026-01-23

### Added

#### Core Engine (Phase 1)

- ComponentSpec schema for canonical intermediate representation
- Parsers for Claude Code, Windsurf, and Cursor components
- Renderers for Claude Code, Windsurf, and Cursor output
- Basic capability mapping between agents
- Loss reporting and fidelity scoring

#### CLI Commands

- `cace convert <file> --to <agent>` - Convert components between agents
- `cace validate <file>` - Validate component structure
- `cace batch-convert <glob> --to <agent>` - Batch conversion
- `cace batch-validate <glob>` - Batch validation
- `cace agents` - List supported agents
- `cace matrix` - Show compatibility matrix

#### Enhanced DX (Phase 1.5)

- `cace inspect <file>` - Deep component inspection
- `cace diff <file1> <file2>` - Semantic comparison
- `cace round-trip <file> --via <agent>` - Fidelity validation
- `cace export <file> -o <json>` - Export to JSON
- `cace import <json> --to <agent>` - Import from JSON
- JSON output mode for CI/CD integration
- Colored output and improved error messages

### Supported Agents

| Agent       | Component Types                          |
| ----------- | ---------------------------------------- |
| Claude Code | skill, hook, memory, rule, agent, config |
| Windsurf    | skill, workflow, rule, memory, config    |
| Cursor      | command, rule, memory, config            |
| Gemini CLI  | memory, config                           |
| Universal   | memory (AGENTS.md)                       |
