# Changelog

All notable changes to the Cross-Agent Compatibility Engine (CACE) will be
documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.1] - 2026-01-30

### 🛠️ Fix YAML-frontmatter-first output (Windsurf loader compatibility)

- **Move conversion provenance comments after YAML frontmatter** for Claude + Windsurf renderers.
  - Prevents Windsurf workflows/tools failing to load when any content appears before the initial `---`.
- **Update compatibility matrix** to document “frontmatter must be first meaningful content” loader constraint.

---

## [2.5.0] - 2026-01-30

### 🎉 Major Release - Cursor Skills Support (2.4+) + Improved Cursor Output

This release updates Cursor support to reflect Cursor’s Agent Skills standard (v2.4+) and Claude compatibility directories, and fixes Cursor output paths for directory conversion.

### ✨ New Features

- **Cursor Skills rendering**: Claude skills now convert to native Cursor skills at:
  - `.cursor/skills/<name>/SKILL.md`
- **Cursor dual-output support (directory conversion)**: For `--strategy dual-output` and Claude → Cursor,
  CACE can emit both:
  - `.cursor/skills/<name>/SKILL.md` (skill, auto/progressive)
  - `.cursor/commands/<name>.md` (explicit manual command)

### 🔧 Improvements

- **Correct Cursor output paths in `convert-dir`** (no more nested `.cursor/commands/<skill>/SKILL.md` artifacts)
- **Cursor parser + validator now support Skill.md** (Agent Skills format)
- **Cursor version catalog updated**: Cursor current version set to **2.4** with Skill detection markers
- **Doctor matrix updated** to reflect improved Claude → Cursor fidelity

## [2.4.0] - 2026-01-30

### 🎉 Major Release - Dual-Output Strategy & Windsurf Parity

This release introduces the dual-output strategy to preserve Claude skill behavior in Windsurf's bifurcated model, plus comprehensive agent parity knowledge documentation.

### ✨ New Features

#### Dual-Output Strategy (`--strategy dual-output`)
Addresses the fundamental architectural difference between Claude and Windsurf:

**Claude Unified Model:**
- Skills can be both auto-invoked AND manually invoked via `/command`

**Windsurf Bifurcated Model:**
- **Skills**: Auto-invoked, NO `/command` access
- **Workflows**: Manual `/command`, NO auto-invocation

**Dual-Output Solution:**
Generates BOTH artifacts to preserve Claude's dual-nature:
```
.windsurf/workflows/<skill>.md   # Manual /command invocation
.windsurf/skills/<skill>/SKILL.md  # Auto-invocation parity
```

#### New CLI Options
- `cace convert <file> --to windsurf --strategy dual-output`
- `cace convert-dir <dir> --to windsurf --strategy dual-output`

#### Enhanced Windsurf Renderer
- Removed incorrect `auto_execution_mode` mapping
- Added conversion losses for Claude-specific features:
  - `user-invocable: false` → Info loss (no UI hide in Windsurf)
  - `disable-model-invocation` → Warning loss (no programmatic restriction)
- Updated fidelity calculation for expected losses

### 📚 New Documentation

#### AGENT_PARITY_KNOWLEDGE.md
Comprehensive analysis of conversion parity issues:
- Claude `allowed-tools` vs Windsurf tool restrictions (no equivalent)
- Claude `context: fork` vs Windsurf isolation (no equivalent)
- Cursor `.mdc alwaysApply` vs Claude hooks (different activation semantics)
- OpenCode permission patterns (approximate allowed-tools)
- Feature loss summary matrix for all agent pairs

### 🔧 Changes

#### src/cli/index.ts
- Added `--strategy` option to `convert` and `convert-dir` commands
- Implemented dual-output logic for Claude → Windsurf conversion
- Added comprehensive architecture documentation at file top

#### src/cli/convert.ts
- Added `strategy` option to `ConvertOptions` interface

#### src/rendering/windsurf-renderer.ts
- Removed `mapActivationMode` method (no longer used)
- Added documentation for dual-output strategy
- Updated fidelity scoring

#### src/rendering/renderer.test.ts
- Updated test to verify conversion loss for auto activation

### 🎯 Usage

```bash
# Standard conversion (single output - workflow only)
cace convert skill.md --to windsurf
# Output: .windsurf/workflows/skill.md

# Dual-output conversion (preserves both invocation modes)
cace convert skill.md --to windsurf --strategy dual-output
# Output:
#   .windsurf/workflows/skill.md  (manual /command)
#   .windsurf/skills/skill/SKILL.md (auto-invocation)

# Directory conversion with dual-output
cace convert-dir ./skills --to windsurf --strategy dual-output
```

### 📊 Statistics

- **Tests:** 428 pass, 0 fail
- **CACE Health:** 100% across all agents
- **Windsurf Fidelity:** Improved from 87% to 92% with dual-output

---

## [2.3.0] - 2026-01-30

### 🎉 Major Release - Intelligent Configuration Audit System

This release introduces a comprehensive configuration audit system that assesses agent scaffolding for validity, currency, optimization opportunities, and provides actionable recommendations for improvement.

### ✨ New Features

#### Configuration Audit Engine (`cace wizard → audit`)
- **Comprehensive health assessment** - Multi-dimensional analysis of all agent configurations
- **Validity checking** - Validates against current agent standards and best practices
- **Version currency detection** - Identifies outdated configurations and new features available
- **Optimization analysis** - Finds opportunities to improve performance and structure
- **Pruning recommendations** - Identifies unused, orphaned, and duplicate files
- **Cross-agent synchronization** - Checks consistency across multiple agent types

#### Audit Wizard Mode
- **Interactive configuration** - Select search paths and audit checks via wizard
- **Configurable search paths** - Home directory, business directory, current directory
- **Selectable checks** - Choose which audits to run (validity, version, optimization, pruning, sync)
- **Rich visual reporting** - Color-coded health scores and detailed findings
- **Multiple report formats** - Console, JSON, and Markdown reports
- **Automatic report saving** - Saves reports to `~/.cace/audit-reports/`

#### Intelligent Assessment Features
- **Agent knowledge base** - Up-to-date best practices for Claude, Cursor, Windsurf, Gemini, Codex, Opencode
- **Anti-pattern detection** - Identifies common mistakes and deprecated features
- **Best practice validation** - Checks for missing recommended features
- **Health scoring** - Overall system health score (0-100) with status classification
- **Prioritized recommendations** - Critical, high, medium, low priority actions
- **Effort estimation** - Low/medium/high effort ratings for each recommendation

#### System Health Dashboard
- **Overall health score** - Weighted average of all dimensions
- **Validity score** - Percentage of valid configurations
- **Currency score** - Percentage of up-to-date configurations
- **Optimization score** - Room for improvement metric
- **Maintenance score** - Pruning and cleanup status
- **Status classification** - Excellent (90+), Good (75+), Fair (60+), Poor (40+), Critical (<40)

### 🔧 Improvements

#### Generic & Portable Architecture
- **Configurable search paths** - Works with any filesystem structure
- **No hardcoded paths** - All paths configurable via audit configuration
- **Agent-agnostic core** - Supports any agent type through configuration
- **Reusable components** - Audit engine can be used standalone or via wizard

#### Enhanced Wizard
- **New audit mode** - Fifth operation mode in the wizard
- **Intelligent defaults** - Sensible defaults for home/business directory scanning
- **Progress reporting** - Real-time feedback during long-running audits
- **Error resilience** - Continues auditing even if individual checks fail

### 📊 New Files

```
src/audit/audit-engine.ts (800+ lines)
  - ConfigurationAuditEngine class
  - Comprehensive audit logic
  - Agent knowledge base
  - Health scoring algorithms
  - Report generation

src/audit/report-formatter.ts
  - AuditReportFormatter class
  - Console, JSON, Markdown formatters
  - Visual report generation
```

### 🎯 Use Cases

#### System Health Check
```bash
cace wizard
# Select: 🔍 Audit - Comprehensive configuration assessment
# Check: All options enabled
# Result: Full system health report with actionable recommendations
```

#### Configuration Validation
```bash
cace wizard → audit
# Search: Current directory only
# Checks: Validity only
# Result: Identify invalid or deprecated configurations
```

#### Optimization Audit
```bash
cace wizard → audit
# Search: Home directory
# Checks: Optimization + Pruning
# Result: Find files to optimize/remove for better performance
```

### 📁 Reports Location

Audit reports are automatically saved to:
- `~/.cace/audit-reports/audit-<timestamp>.json` - Machine-readable JSON
- `~/.cace/audit-reports/audit-<timestamp>.md` - Human-readable Markdown

---

## [2.2.0] - 2026-01-29

### 🎉 Major Release - Multi-Select Wizard & Directory Conversion

This release introduces a powerful multi-select installation wizard and full directory conversion capabilities with intelligent configuration detection.

### ✨ New Features

#### Multi-Select Installation Wizard (`cace wizard`)
- **Interactive multi-select interface** - Navigate with arrow keys, select with space
- **Four operation modes:**
  - `install` - Fresh installation with multi-agent selection
  - `convert` - Convert entire scaffolding directories
  - `migrate` - Migration with validation
  - `sync` - Sync user and project configurations
- **Visual progress tracking** - Real-time progress bars with ETA
- **Intelligent detection** - Auto-detects source agents from directory contents
- **Configuration intelligence** - Detects scattered configs and version conflicts

#### Full Directory Conversion (`cace convert-dir`)
- **Convert entire directories** - e.g., `~/.claude` or `./.claude`
- **Recursive processing** - Handles nested subdirectories
- **Dry-run mode** - Preview changes without modifying files
- **Backup option** - Creates `.backup.<timestamp>` files
- **Include/exclude patterns** - Filter files with glob patterns
- **Batch conversion** - Convert hundreds of files in one command
- **Visual progress** - Progress bar showing conversion status
- **Detailed reporting** - Per-file fidelity scores and warnings

#### Configuration Intelligence Engine
- **User vs Project detection** - Automatically finds configs at both levels
- **Scattered config detection** - Finds orphaned and misplaced configurations
- **Version conflict detection** - Identifies mixed versions in scaffolding
- **Cross-agent conflict detection** - Warns about multiple agent configs
- **Smart recommendations** - Suggests fixes and best practices

#### Advanced Features
- **Mixed version handling** - Detects and reports version inconsistencies
- **Fidelity tracking per file** - Individual scores for each conversion
- **Warning aggregation** - Collects all warnings across batch operations
- **Error resilience** - Continues processing even if some files fail
- **Directory structure mapping** - Intelligently maps between agent directory layouts

### 🛡️ Safety & Error Handling

- **Dry-run mode** - Test conversions without making changes
- **Backup creation** - Automatic backups before overwriting
- **Validation integration** - Validate converted files automatically
- **Confirmation prompts** - Confirm destructive operations
- **Error recovery** - Detailed error messages with suggestions
- **Partial success handling** - Reports success/failure per file

### 📊 Performance

- **Batch processing** - Process multiple files efficiently
- **Progress tracking** - Visual feedback for long operations
- **Memory efficient** - Streams large directories
- **Concurrent capable** - Architecture supports parallel processing

### 🎯 Use Cases

#### Converting Entire Agent Setups
```bash
# Convert all Claude skills to Codex
cace convert-dir ~/.claude --to codex --backup

# Convert project-level scaffolding
cace convert-dir ./.claude --to gemini --dry-run

# Batch convert with filters
cace convert-dir ~/.claude/skills --to opencode --include "*.md" --exclude "test*"
```

#### Multi-Agent Installation
```bash
# Install multiple agents at once
cace wizard
# Select: [✓] Claude, [✓] Codex, [✓] Gemini
# Install at: [✓] Project level
```

#### Detecting Configuration Issues
```bash
# Check for scattered configs
cace wizard → convert
# Shows: "Found user config at ~/.claude and project at ./.claude"
# Shows: "3 orphaned config files detected"
```

### 📁 New Files

```
src/cli/wizard.ts (1100+ lines)
  - Complete wizard implementation
  - Multi-select UI components
  - Configuration detection engine
  - Progress tracking system
  - Directory conversion logic
```

### 🔧 CLI Improvements

- **New commands:**
  - `cace wizard` (alias: `w`) - Multi-select wizard
  - `cace convert-dir <path>` (alias: `cd`) - Directory conversion
  
- **Enhanced existing commands:**
  - `cace convert` - Now shows visual fidelity scores
  - `cace validate` - Better error categorization
  - `cace doctor` - Shows 6×6 compatibility matrix

### 🐛 Bug Fixes

- **Wizard Rendering** - Fixed visual artifacts in multi-select interface caused by extra newlines in ANSI escape sequences
  - Removed unnecessary `\n` characters from question and instruction messages
  - Ensured line clearing calculation matches actual line count
  - Improved rendering stability during arrow key navigation

---

## [2.1.1] - 2026-01-29

### 📚 Documentation Improvements

- **Comprehensive README overhaul** - Complete rewrite with v2.1.0 best practices
- **REPL-first approach** - Interactive mode now recommended as primary usage method
- **Visual quick start** - Added 3 quick start options (Interactive ⭐, CLI, Local)
- **6-agent matrix** - Complete conversion fidelity table for all 30 paths
- **Usage examples** - Interactive mode examples alongside CLI examples
- **Deep dive sections** - Detailed interactive mode documentation
- **Better discoverability** - Clear navigation and feature highlights
- **Updated stats** - 428 tests, 6 agents, 91% average fidelity

### 🎯 New User Experience

- **REPL mode emphasized** - Now the recommended starting point for all users
- **Visual guidance** - Screenshots and example outputs in documentation
- **Safety first** - Clear disclaimers and warnings throughout
- **Learning path** - Demo command for guided tutorial
- **Reference materials** - Complete command reference and guides

---

## [2.1.0] - 2026-01-29

### 🎉 Major Release - Interactive Mode & Enhanced UX

This release introduces a powerful interactive REPL mode and significantly enhanced CLI outputs with rich formatting, visual indicators, and comprehensive guidance.

### ✨ New Features

#### Interactive REPL Mode (`cace interactive`)
- **Guided prompts** for all operations (convert, validate, agents, config)
- **Real-time configuration** with session preferences
- **Interactive demonstrations** with step-by-step tutorials
- **Command history** and tab completion support
- **Rich visual output** with colors, progress bars, and emojis
- **Built-in help system** with contextual guidance
- **Safety confirmations** before destructive operations

**Interactive Commands:**
- `convert [file]` - Interactive file conversion with agent selection
- `validate [file]` - Interactive validation with detailed reporting
- `agents` - Browse all 6 supported agents with feature comparison
- `config` - Configure preferences (verbose, strict, default agents)
- `demo` - Run guided demonstration for new users
- `status` - View current session status
- `disclaimer` - Show important safety information
- `help` / `?` - Show available commands
- `quit` / `exit` / `q` - Exit interactive mode

### 🎨 Enhanced CLI Outputs

#### Convert Command
- **Visual fidelity score** with progress bar (0-100%)
- **Severity-based categorization** of features requiring attention
  - Critical (manual action required) - shown in red
  - Warnings (review recommended) - shown in yellow
  - Info (minor differences) - shown in blue
- **Recommendations** for each loss with actionable advice
- **Disclaimers section** with safety reminders
- **Next steps** guidance after conversion
- **Verbose mode** with detailed conversion report

#### Validate Command
- **Validation score** with visual progress bar
- **Categorized issues** by severity (Errors, Warnings, Info)
- **Field-level guidance** showing which frontmatter fields need attention
- **Actionable suggestions** with fix recommendations
- **Agent-specific best practices** displayed after validation
- **Quick fix commands** suggested for common issues

#### Doctor Command
- **Full-screen dashboard** with system status
- **Visual check indicators** (✓/⚠/✗) with color coding
- **6x6 compatibility matrix** showing all agent conversion paths
- **Score-based coloring** (green ≥90%, yellow ≥80%, red <80%)
- **Recommendations** based on current configuration
- **Documentation links** for further reading

### 📋 Improved User Experience

- **Clear disclaimers** about conversion limitations
- **Visual warnings** for security-sensitive features
- **Progress indicators** for long-running operations
- **Contextual help** throughout all commands
- **Color-coded severity levels** for all issues
- **Structured output** with headers and sections
- **Emoji indicators** for quick visual scanning

### 🔒 Safety & Guidance

- **Pre-conversion warnings** about potential feature loss
- **Security reminders** for allowed-tools and sandbox modes
- **Validation before save** in interactive mode
- **Confirmation prompts** for destructive operations
- **Best practices guidance** for each agent type

### 📝 Documentation

- Added comprehensive help text in interactive mode
- Tooltips and suggestions throughout CLI
- Agent-specific guidance for configuration
- Quick reference for all commands

---

## [2.0.0] - 2026-01-29

### 🎉 Major Release - 6 Agent Support

This release adds complete support for OpenAI Codex and Google Gemini CLI, bringing the total supported agents to 6.

### ✨ New Features

#### OpenAI Codex Support
- **Parser** - Full TOML/YAML frontmatter support
- **Validator** - Comprehensive validation
- **Renderer** - Feature-complete rendering
- Supports: Skills, Commands, Rules, Memory
- Features: Approval policies, Sandbox modes, MCP servers, Web search

#### Google Gemini CLI Support
- **Parser** - YAML frontmatter support
- **Validator** - Comprehensive validation
- **Renderer** - Feature-complete rendering
- Supports: Skills, Commands, Memory
- Features: Temperature control, Code execution, Google search

### 📊 Statistics

- **Total Conversion Paths:** 30 (6 agents × 5 directions)
- **Average Fidelity:** 91%
- **Tests:** 428 passing (100%)
- **Test Coverage:** 85%

---

## [1.2.0] - 2026-01-29

### 🎉 Major Enhancement - Unique Features Documentation

Comprehensive documentation of 30+ unique agent-specific features.

### ✨ New Features

- **Agent Unique Features Matrix** - Research across all supported agents
- **Feature categorization** by type (Security, Context, UI, Patterns, Tools)
- **Conversion gap analysis** showing what gets lost
- **Approximation strategies** for non-convertible features

---

## [1.1.0] - 2026-01-29

### 🎉 Production Release

- Initial production release with 4-agent support
- 393/396 tests passing
- Full CI/CD pipeline

---

## [1.0.0] - 2026-01-29

### 🎉 Major Release - Complete System Refactor

Complete overhaul with focus on validation, correctness, and usability.

### ✨ New Features

- **Versioned Validation System** - Comprehensive validators for all agents
- **Simplified CLI Interface** - `install`, `convert`, `validate`, `doctor` commands
- **Full TypeScript Support** - Complete type safety
- **Comprehensive Test Suite** - 100+ test cases

---

For older versions, see git history.
