# Changelog

All notable changes to the Cross-Agent Compatibility Engine (CACE) will be
documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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