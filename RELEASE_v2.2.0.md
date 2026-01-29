# CACE v2.2.0 Release Notes

**Release Date:** January 29, 2026  
**Version:** 2.2.0  
**Codename:** "Wizard's Tower"

---

## 🎉 Major Release - Multi-Select Wizard & Directory Conversion

CACE v2.2.0 introduces a revolutionary new way to manage AI agent configurations with the **Multi-Select Installation Wizard** and **Full Directory Conversion** capabilities. This release represents a significant leap in usability for complex multi-agent operations.

---

## ✨ What's New

### 🧙 Multi-Select Installation Wizard

The crown jewel of v2.2.0 - an intuitive arrow-key interface for complex multi-agent operations:

```bash
cace wizard
# or
cace w
```

**Key Features:**
- **Four Operation Modes:**
  - `install` - Fresh installation with multi-agent selection
  - `convert` - Convert entire scaffolding directories
  - `migrate` - Migration with validation
  - `sync` - Sync user and project configurations

- **Interactive Multi-Select Interface:**
  - Navigate with ↑↓ arrow keys
  - Select/deselect with spacebar
  - Confirm with enter
  - Cancel with Ctrl+C

- **Visual Progress Tracking:**
  - Real-time progress bars with ETA
  - Per-file conversion status
  - Fidelity scores for each conversion
  - Warning aggregation across batch operations

- **Intelligent Auto-Detection:**
  - Automatically detects source agents from directory contents
  - Shows component counts per agent (e.g., "✓ 12 components found")
  - Identifies agents with no components (e.g., "✗ No components found")

**Example Wizard Session:**
```
? Select operation mode:
❯◯ Install    - Fresh installation with multi-agent selection
 ◉ Convert    - Convert entire scaffolding directories
 ◯ Migrate    - Migration with validation
 ◯ Sync       - Sync user and project configurations

? Select source agents:
 ◉ claude    ✓ 12 components found
 ◯ opencode  ✗ No components found
 ◯ cursor    ✓ 3 components found
 ◯ windsurf  ✗ No components found
 ◉ codex     ✓ 8 components found
 ◯ gemini    ✗ No components found

? Select target agents:
 ◉ opencode  - Recommended for fresh install
 ◯ cursor
 ◯ windsurf
 ◉ gemini    - Good for experimentation

Processing: [████████░░] 80% | ETA: 12s
Converting claude/skill1.md → opencode/skill1.md... ✓
Converting codex/mcp-config.json → opencode/tools.json... ✓
```

---

### 📁 Full Directory Conversion

Convert entire agent setups with a single command:

```bash
# Convert all Claude skills to Codex with automatic backup
cace convert-dir ~/.claude --to codex --backup

# Preview changes without modifying (dry-run mode)
cace convert-dir ./.claude --to gemini --dry-run --verbose

# Convert with include/exclude patterns
cace convert-dir ~/.claude/skills --to opencode \
  --include "*.md" \
  --exclude "test*" \
  --exclude "*.draft.md"
```

**Capabilities:**
- **Recursive Processing** - Handles nested subdirectories automatically
- **Batch Operations** - Convert hundreds of files in one command
- **Dry-Run Mode** - Preview all changes without modifying any files
- **Automatic Backup** - Creates `.backup.<timestamp>` directories before overwriting
- **Include/Exclude Patterns** - Filter files with glob patterns
- **Visual Progress** - Real-time progress bar showing conversion status
- **Per-File Reporting** - Individual fidelity scores and warnings for each file
- **Error Resilience** - Continues processing even if some files fail

**Output Example:**
```
📁 Directory Conversion: ~/.claude → ~/.opencode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found: 156 files to convert
       142 .md files
       14 .mdc files

[████████████████████] 100% | 156/156 files

✅ Conversion Complete!

📊 Summary:
   ✓ Successfully converted: 152 files (97.4%)
   ⚠️  Converted with warnings: 3 files (1.9%)
   ✗ Failed: 1 file (0.6%)

💾 Backup created: ~/.claude.backup.20260129_231845

📈 Average Fidelity: 91%
   Highest: claude/skills/advanced.md → 98%
   Lowest: claude/config.json → 76%

⚠️  Warnings (5 total):
   • context: fork not supported in target agent (3 occurrences)
   • custom hooks require manual porting (2 occurrences)

🔍 View detailed report: cace-report-20260129_231845.json
```

---

### 🔮 Configuration Intelligence Engine

Sophisticated detection and analysis of agent configurations:

**User vs Project Detection:**
- Automatically finds configs at both user (`~/.agent`) and project (`./.agent`) levels
- Shows both locations when configurations exist at multiple levels
- Suggests appropriate target level based on source

**Scattered Config Detection:**
- Identifies orphaned configuration files
- Detects misplaced components (e.g., skills in wrong directories)
- Finds duplicate configurations across locations

**Version Conflict Detection:**
- Identifies mixed versions within scaffolding
- Warns about version inconsistencies that may cause issues
- Suggests standardization approaches

**Cross-Agent Conflict Detection:**
- Warns when multiple agent configurations exist in the same project
- Helps prevent configuration conflicts
- Suggests isolation strategies

**Smart Recommendations:**
- Suggests fixes for detected issues
- Recommends best practices based on detected patterns
- Provides guidance for complex migration scenarios

---

## 🛡️ Safety Features

### Multi-Layer Protection

1. **Dry-Run Mode** (`--dry-run`)
   - Preview all changes before making them
   - Shows exactly what would be converted
   - No files are modified

2. **Automatic Backup** (`--backup`)
   - Creates timestamped backups before overwriting
   - Easy rollback if something goes wrong
   - Stored as `.backup.<timestamp>` directories

3. **Validation Integration** (`--validate`)
   - Automatically validates converted files
   - Catches issues immediately
   - Prevents invalid configurations

4. **Confirmation Prompts**
   - Confirms destructive operations
   - Shows summary before batch operations
   - Cancel anytime with Ctrl+C

5. **Error Recovery**
   - Detailed error messages with suggestions
   - Partial success handling
   - Continues processing even if some files fail

---

## 📊 Performance

### Optimized for Large Operations

- **Batch Processing** - Efficiently processes multiple files
- **Streaming** - Memory-efficient for large directories
- **Progress Feedback** - Visual indicators for long operations
- **Concurrent Architecture** - Ready for parallel processing (future enhancement)

**Benchmarks:**
- 100 files: ~3 seconds
- 500 files: ~12 seconds
- 1000 files: ~25 seconds

---

## 🎯 Use Cases

### Converting Entire Setups

```bash
# Migrate from Claude to OpenCode for a team
$ cace convert-dir ~/.claude --to opencode --backup --validate
✓ Converted 247 files with 94% average fidelity
✓ Backup: ~/.claude.backup.20260129_231845
✓ All files validated successfully

# Switch project from Codex to Gemini
$ cace convert-dir ./.codex --to gemini --dry-run
Would convert 18 files with estimated 89% fidelity
Run without --dry-run to execute
```

### Multi-Agent Installation

```bash
# Set up multiple agents for a new project
$ cace wizard
? Select operation mode: Install
? Select agents: [✓] Claude, [✓] Codex, [✓] Gemini
? Install at: [✓] Project level
✓ Created: ./.claude/ ./.codex/ ./.gemini/
✓ Generated: AGENTS.md (unified documentation)
```

### Detecting Issues

```bash
# Check for configuration problems
$ cace wizard → convert
Scanning for configurations...

⚠️  Found Issues:
   • User config at ~/.claude (version: 2.1.0)
   • Project config at ./.claude (version: 2.0.0)
   • 3 orphaned config files in ./src/
   • Duplicate skill: "database" in both locations

? How would you like to resolve? [Use arrows]
❯ Merge project into user
  Keep separate
  Standardize on project level
```

---

## 🔧 CLI Improvements

### New Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `cace wizard` | `w` | Multi-select installation wizard |
| `cace convert-dir <path>` | `cd` | Directory conversion |

### Enhanced Commands

| Command | Enhancement |
|---------|-------------|
| `cace convert` | Now shows visual fidelity scores |
| `cace validate` | Better error categorization |
| `cace doctor` | Shows 6×6 compatibility matrix |
| `cace interactive` | New `wizard` command launches multi-select UI |

---

## 📁 New Files

```
src/cli/wizard.ts (1100+ lines)
  ├── Multi-select UI components
  ├── Configuration detection engine
  ├── Progress tracking system
  ├── Directory conversion logic
  └── Batch processing utilities
```

---

## 🐛 Bug Fixes

### Wizard Rendering (v2.2.0-fix.1)

**Issue:** Visual artifacts in multi-select interface when navigating with arrow keys.

**Cause:** Extra newlines (`\n`) in console output caused ANSI cursor-up escape sequences to not clear all previous lines properly.

**Fix:** 
- Removed unnecessary `\n` characters from question and instruction messages
- Ensured line clearing calculation (`options.length + 2`) matches actual line count
- Improved rendering stability during arrow key navigation

**Files Changed:** `src/cli/wizard.ts` (lines 102-103, 113, 129)

---

## 📈 Statistics

### Code Metrics
- **Total Lines:** ~16,000 TypeScript
- **Test Coverage:** 85% (428 tests passing)
- **New Code:** 1,100+ lines (wizard.ts)
- **Documentation:** 3,000+ words

### Performance
- **Wizard Launch:** <500ms
- **Directory Scan:** ~100 files/second
- **Conversion Speed:** ~50 files/second
- **Memory Usage:** <50MB for 1000 files

---

## 🔄 Migration Guide

### From v2.1.x to v2.2.0

**No breaking changes.** v2.2.0 is fully backward compatible with v2.1.x.

**New Capabilities:**
- Use `cace wizard` for complex multi-agent operations
- Use `cace convert-dir` for batch conversions
- All existing commands work unchanged

**Recommended:**
- Try `cace wizard` for your next installation
- Use `cace convert-dir` when migrating entire setups

---

## 🎓 Documentation

### New Guides
- **[Wizard Mode Guide](./docs/wizard.md)** - Master the multi-select interface
- **[Directory Conversion Guide](./docs/convert-dir.md)** - Bulk conversion workflows
- **[Configuration Intelligence](./docs/config-intelligence.md)** - Understanding detection

### Updated Guides
- **[Quick Start](./README.md#quick-start)** - Now includes wizard mode
- **[Interactive Mode](./docs/interactive.md)** - New `wizard` command
- **[CLI Reference](./docs/cli.md)** - New commands documented

---

## 🙏 Acknowledgments

This release represents the vision of making CACE the most user-friendly cross-agent compatibility tool. The wizard interface was designed based on user feedback requesting easier ways to handle complex multi-agent scenarios.

Special thanks to the beta testers who provided invaluable feedback during development.

---

## 🚀 Getting Started

```bash
# Install or upgrade
npm install -g cace-cli@2.2.0

# Try the wizard
cace wizard

# Or convert a directory
cace convert-dir ~/.claude --to opencode --dry-run
```

---

## 📞 Support

- **Documentation:** See [README.md](./README.md) and [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/AIntelligentTech/cace-cli/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AIntelligentTech/cace-cli/discussions)

---

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

---

**CACE v2.2.0** - The ultimate cross-agent compatibility experience! 🧙✨

*Released January 29, 2026*
