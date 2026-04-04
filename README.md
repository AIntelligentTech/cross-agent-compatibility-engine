# CACE (Cross-Agent Compatibility Engine) v2.5.5

[![CI](https://github.com/AIntelligentTech/cace-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/AIntelligentTech/cace-cli/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/cace-cli.svg)](https://www.npmjs.com/package/cace-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen.svg)](./TEST_REPORT_FINAL.md)

**🚀 Version-aware cross-agent compatibility tool with automatic agent detection!**

Convert and validate AI agent components between **6 major agents**: Claude Code, OpenCode, Cursor, Windsurf, **OpenAI Codex**, and **Google Gemini** with version compatibility knowledge and beautiful visual outputs.

**Now integrated with [Business OS v9.6+](https://github.com/AIntelligentTech/business-os)** for automatic cross-agent scaffolding generation.

---

## ✨ What's New in v2.3.0

### 🧙 Multi-Select Wizard Mode (NEW!)
The ultimate way to manage complex multi-agent operations with an intuitive arrow-key interface:

```bash
cace wizard
```

**Wizard Features:**
- **Multi-select interface** - Navigate with ↑↓, select with space, confirm with enter
- **Four operation modes:** install, convert, migrate, sync
- **Visual progress tracking** - Real-time progress bars with ETA
- **Intelligent detection** - Auto-detects source agents from directory contents
- **Configuration intelligence** - Finds scattered configs and version conflicts

### 📁 Full Directory Conversion (NEW!)
Convert entire agent setups in one command:

```bash
# Convert all Claude skills to Codex
cace convert-dir ~/.claude --to codex --backup

# Preview changes with dry-run
cace convert-dir ./.claude --to gemini --dry-run

# Filter with patterns
cace convert-dir ~/.claude/skills --to opencode --include "*.md" --exclude "test*"
```

**Directory Conversion Features:**
- **Recursive processing** - Handles nested subdirectories
- **Batch operations** - Convert hundreds of files
- **Dry-run mode** - Preview without modifying
- **Auto-backup** - Creates `.backup.<timestamp>` files
- **Per-file fidelity** - Individual scores and warnings

### 🎮 Interactive REPL Mode
The easiest way to use CACE - guided prompts, rich visuals, and zero learning curve:

```bash
cace interactive
```

### 🤖 6 Agent Support
Supports **all major AI coding agents**:
1. **Claude Code** - Rich skills with agent delegation
2. **OpenCode** - Permission-based security model
3. **Cursor** - .mdc rules and commands
4. **Windsurf** - Skills, Workflows, and Cascade
5. **OpenAI Codex** - MCP servers and approval policies
6. **Google Gemini CLI** - Code execution and multi-directory

---

## 🚀 Quick Start (4 Options)

### Option 1: Multi-Select Wizard ⭐ **RECOMMENDED FOR COMPLEX OPERATIONS**
Perfect for multi-agent installations and batch conversions with an intuitive arrow-key interface:

```bash
# Install globally
npm install -g cace-cli

# Start the wizard
cace wizard
# Or use the shortcut
cace w
```

**Wizard Modes:**
- **Install** - Multi-select agents to install with intelligent level detection
- **Convert** - Convert entire scaffolding directories with visual progress
- **Migrate** - Full migration with validation and conflict detection
- **Sync** - Sync user and project configurations

**Example wizard session:**
```
? Select operation mode: [Use arrows, space to select, enter to confirm]
❯◯ Install    - Fresh installation with multi-agent selection
 ◉ Convert    - Convert entire scaffolding directories
 ◯ Migrate    - Migration with validation
 ◯ Sync       - Sync user and project configurations

? Select source agents: [Use arrows, space to select, enter to confirm]
 ◉ claude    ✓ 12 components found
 ◯ opencode  ✗ No components found
 ◯ cursor    ✓ 3 components found
 ◯ windsurf  ✗ No components found
 ◉ codex     ✓ 8 components found
 ◯ gemini    ✗ No components found
```

### Option 2: Directory Conversion ⭐ **FOR BULK OPERATIONS**
Convert entire agent setups in one command:

```bash
# Convert all Claude skills to Codex with backup
cace convert-dir ~/.claude --to codex --backup

# Preview changes (dry-run)
cace convert-dir ./.claude --to gemini --dry-run --verbose

# Convert with filters
cace convert-dir ~/.claude/skills --to opencode --include "*.md" --exclude "test*"
```

### Option 3: Interactive Mode ⭐ **FOR GUIDED WORKFLOWS**
The easiest way to start with guided prompts and visual feedback:

```bash
# Start interactive mode
cace interactive
# Or use the shortcut
cace i
```

**Inside interactive mode:**
```
cace> demo              # Run the guided tutorial
cace> convert my-skill.md   # Convert with visual guidance
cace> validate my-skill.md  # Validate interactively
cace> wizard            # Launch the multi-select wizard
cace> agents            # See all 6 supported agents
cace> help              # Show all commands
```

### Option 4: Standard CLI (For Power Users)
Direct command-line usage with rich output:

```bash
# Convert with beautiful visual output
cace convert my-skill.md --to codex

# Validate with detailed report
cace validate my-skill.md --agent claude

# Check system with dashboard
cace doctor
```

### Local Development
For contributing or testing:

```bash
# Clone the repository
git clone https://github.com/AIntelligentTech/cace-cli.git
cd cace-cli

# Install dependencies
npm install

# Run tests (428 tests passing!)
npm test

# Build and run locally
npm run build
node dist/cli/index.js wizard
```

---

## 💡 Usage Examples

### Converting Skills (Interactive Mode - Easiest!)
```bash
# Start interactive mode
cace interactive

# Then use guided prompts:
cace> convert .claude/skills/my-skill/SKILL.md
# 🤖 Select source agent: 1 (claude)
# 🎯 Select target agent: 5 (codex)
# ⚠️  Proceed? yes

# Output shows:
# ✅ Conversion Complete
# 📊 Fidelity Score: 92% [█████████░]
# ⚠️  Features Requiring Attention (2)
#    • context: fork not supported in Codex
# 💡 Save now? yes
```

### Converting Skills (CLI Mode - Fast!)
```bash
# Quick conversion
cace convert my-skill.md --to codex

# With optimization
cace convert my-skill.md --to gemini --optimize --risk high

# Batch conversion
cace convert .claude/skills/* --to opencode --output ./.opencode/
```

### Validating Components
```bash
# Interactive validation (recommended)
cace interactive
cace> validate my-skill.md

# CLI validation with detailed report
cace validate my-skill.md --agent claude --strict

# Auto-detect agent
cace validate component.md
```

### Installing Scaffolding
```bash
# Interactive installation
cace interactive
cace> install

# Or use CLI:
# Install all 6 agents
cace install all

# Install specific agents
cace install claude codex gemini

# Install at user level (global config)
cace install all --user

# Generate a new component
cace install claude --single my-skill --type skill
```

### System Health Check
```bash
# Beautiful dashboard with 6×6 matrix
cace doctor

# Shows:
# - System compatibility checks
# - Agent configurations
# - Conversion fidelity matrix (all 6 agents!)
# - Personalized recommendations
```

---

## 🔄 Supported Conversions (All 30 Paths!)

| From → To | Fidelity | Notes |
|-----------|----------|-------|
| **Claude → OpenCode** | **98%** | ⭐ Native compatibility |
| Claude → Cursor | 92% | Tool restrictions approximated |
| Claude → Windsurf | 87% | Skills vs Workflows mapping |
| **Claude → Codex** | **92%** | ⭐ NEW - Strong mapping |
| **Claude → Gemini** | **88%** | ⭐ NEW - Good mapping |
| OpenCode → Claude | 95% | Excellent reverse |
| Cursor → Claude | 90% | Good .mdc mapping |
| Windsurf → Claude | 85% | Multi-level hooks handled |
| **Codex → Claude** | **90%** | ⭐ NEW - Excellent reverse |
| **Gemini → Claude** | **87%** | ⭐ NEW - Good reverse |
| **Any → AGENTS.md** | **95%** | Universal format (recommended) |

**Average Fidelity: 91%** across all 30 conversion paths!

---

## 🛡️ Risk Levels for Optimization

When optimizing conversions, choose your risk level:

| Level | Use Case | Changes Made |
|-------|----------|--------------|
| `--safe` | CI/CD, automation | Syntax fixes only |
| `--medium` | Production with review | Best practices, defaults |
| `--high` | Maximum fidelity | Body rewrites, safety guardrails |
| `--dangerous` | Prototyping | Major restructuring |

**Recommendation:** 
- **New users:** Use `cace interactive` (handles this automatically)
- **CI/CD:** Use `--safe` for automation
- **Production:** Use `--high` for manual conversions with review

---

## 🎮 Interactive Mode Deep Dive

### Why Use Interactive Mode?

✅ **Zero Learning Curve** - Guided prompts for every operation  
✅ **Visual Feedback** - Beautiful output with colors, emojis, and progress bars  
✅ **Safety First** - Warnings and confirmations before actions  
✅ **Discoverability** - Explore all features through the help system  
✅ **Session Memory** - Set defaults and preferences that persist  

### Interactive Commands Reference

```bash
cace interactive     # Start the REPL
cace i               # Shortcut alias
```

**Available Commands:**
- `convert [file]` - Convert files with guided agent selection
- `validate [file]` - Validate with interactive reporting
- `agents` - Browse all 6 agents and their features
- `config` - Configure verbose, strict, default agents
- `demo` - Run the guided tutorial (great for first-time users!)
- `status` - View current session status
- `disclaimer` - Show important safety information
- `help` or `?` - Show available commands
- `clear` - Clear the screen
- `quit`, `exit`, or `q` - Exit interactive mode

### Example Interactive Session

```bash
$ cace interactive

╔══════════════════════════════════════════════════════════════╗
║                CACE - Interactive Mode v2.3.0                ║
║  Cross-Agent Compatibility Engine - 6 Agents + Wizard Mode   ║
╚══════════════════════════════════════════════════════════════╝

🚀 Welcome to CACE Interactive Mode!

Type 'help' for available commands or 'quit' to exit.

⚠️  IMPORTANT DISCLAIMER ⚠️

• Conversions may lose agent-specific features
• Security settings (allowed-tools, sandbox modes) require manual review
• Always validate converted files before use
• Test in a safe environment first

cace> demo
🎮 Guided Demonstration

This demo will walk you through a typical conversion workflow.

Press Enter to start...

[Interactive demo continues with step-by-step guidance]
```

---

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](./docs/quickstart.md)** - Get up and running in 5 minutes
- **[Interactive Mode Guide](./docs/interactive.md)** - Master the REPL
- **[CLI Reference](./docs/cli.md)** - Complete command reference

### Development
- **[API Documentation](./docs/api.md)** - Programmatic usage
- **[Architecture](./docs/architecture.md)** - How CACE works
- **[Contributing](./CONTRIBUTING.md)** - Join the project!
- **[Changelog](./CHANGELOG.md)** - Release history

### Research & Analysis
- **[Compatibility Evolution Timeline](./docs/research/compatibility-evolution-timeline.md)** - How scaffold compatibility changed over time and what that means for CACE today
- **[Agent Unique Features Matrix](./docs/research/agent-unique-features-matrix.md)** - 30+ unique features across agents
- **[Product Manager Assessment](./docs/PM_ASSESSMENT_v1.2.0.md)** - Strategic analysis

---

## 🧪 Testing

```bash
# Run all tests (428 tests passing!)
npm test

# Run specific test file
bun test tests/codex-parser.test.ts

# Build and test
npm run build && npm test

# Check test coverage
npm run test:coverage
```

**Test Metrics:**
- ✅ 428 tests passing (100%)
- ✅ 899 expect() calls
- ✅ 18 test files
- ✅ ~147ms execution time
- ✅ 85% code coverage

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Contribute

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/cace-cli.git
cd cace-cli

# Install and test
npm install
npm test

# Make changes and commit
git checkout -b feature/my-feature
# ... make changes ...
npm test

git commit -m "feat: add new feature"
git push origin feature/my-feature

# Open Pull Request
```

---

## 📊 Project Stats

- **Test Coverage:** 85%
- **Test Pass Rate:** 100% (428/428) ✅
- **Agents Supported:** 6 (Claude, OpenCode, Cursor, Windsurf, Codex, Gemini) ⭐
- **Conversion Paths:** 30 (6 agents × 5 targets each)
- **Component Types:** 12
- **Lines of Code:** ~14,000
- **TypeScript:** 100% strict mode
- **License:** MIT

---

## 🗺️ Roadmap

### v2.1.x (Current)
- ✅ Interactive REPL mode
- ✅ 6 agent support (Codex, Gemini added)
- ✅ Rich visual outputs
- ✅ Safety disclaimers and guidance

### v2.3.0 (Planned)
- [ ] Plugin system for custom agents
- [ ] Web interface for visual conversion
- [ ] Batch operations with progress tracking
- [ ] Import resolution and inlining

### v2.3.0 (Planned)
- [ ] Aider integration
- [ ] Continue.dev support
- [ ] Custom optimizer plugins
- [ ] Performance optimizations

### v3.0.0 (Future)
- [ ] Real-time sync
- [ ] AI-powered migration recommendations
- [ ] Collaborative editing
- [ ] Enterprise features

---

## 🐛 Bug Reports

Report bugs at [GitHub Issues](https://github.com/AIntelligentTech/cace-cli/issues).

Include:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS)
- Minimal code example
- Run `cace doctor` output

---

## 💬 Community

- **GitHub Discussions:** [Join the conversation](https://github.com/AIntelligentTech/cace-cli/discussions)
- **Discord:** Coming soon!
- **Twitter:** [@AIntelligentTech](https://twitter.com/AIntelligentTech)

---

## 🙏 Acknowledgments

- **Anthropic** - Claude Code and agent delegation concepts
- **OpenAI** - Codex, MCP servers, and approval policies
- **Google** - Gemini CLI and ADK
- **Exafunction** - Windsurf and Cascade
- **Cursor** - .mdc format and rule system
- **OpenCode** - Permission-based security model
- **Community** - Feedback, testing, and contributions

---

## 📜 License

MIT © [AIntelligent Tech](https://github.com/AIntelligentTech)

---

<p align="center">
  <strong>⭐ Star us on GitHub if you find CACE useful! ⭐</strong>
</p>

<p align="center">
  <a href="https://github.com/AIntelligentTech/cace-cli">GitHub</a> •
  <a href="https://www.npmjs.com/package/cace-cli">npm</a> •
  <a href="./docs/quickstart.md">Quick Start</a> •
  <a href="./CHANGELOG.md">Changelog</a>
</p>
