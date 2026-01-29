# CACE Critical Gap Analysis & Resolution Loss Assessment

## Executive Summary

This document provides a brutally honest assessment of where CACE fails, what information is irretrievably lost during conversion, and identifies the critical need for an LLM-assisted optimization step to address defaults and semantic drift.

---

## 1. Fundamental Information Loss Matrix

### 1.1 Claude Code → Any Agent (Highest Loss)

| Feature | Claude | Target | Loss Type | Severity | Recoverable? |
|---------|--------|--------|-----------|----------|--------------|
| `context: fork` | Isolated subagent | Main context only | **SEMANTIC** | CRITICAL | ❌ NO |
| `allowed-tools` | Tool restrictions | No equivalent | **CAPABILITY** | HIGH | ❌ NO |
| `agent: explore` | Subagent delegation | Inline execution | **BEHAVIORAL** | HIGH | ⚠️ PARTIAL |
| `disable-model-invocation` | Auto-invoke control | Always manual or always auto | **CONTROL** | MEDIUM | ⚠️ PARTIAL |
| `user-invocable: false` | Hidden from menu | Always visible | **UI/UX** | LOW | ✅ YES |
| `argument-hint` | Argument description | Generic placeholder | **UX** | LOW | ⚠️ PARTIAL |

**Critical Finding**: Claude's `context: fork` is **irreplaceable**. When converting to other agents, skills that depend on isolated context (e.g., "Analyze this codebase" skills) will pollute the main context window, potentially causing:
- Context window overflow
- Loss of conversation history
- Unintended side effects
- Performance degradation

### 1.2 Windsurf Skills vs Workflows Dilemma

**The Unavoidable Ambiguity:**

Claude skills can be both auto-invoked AND manually invoked. Windsurf forces a binary choice:

```
Claude Skill: user-invocable: true + disable-model-invocation: false
              ↓
Windsurf:     ???
              
Option A: Windsurf Skill → Auto-invoked, progressive disclosure
  - ✅ Preserves auto-invocation
  - ❌ Loses explicit /command access
  - ❌ Cannot chain from user prompt
  
Option B: Windsurf Workflow → Manual /command
  - ✅ Preserves explicit invocation
  - ❌ Loses auto-invocation
  - ❌ User must remember to use it
```

**Default Selection Required**: CACE defaults to **Windsurf Skill** for auto-invocation preservation, but this is a **value judgment** that may not match user intent.

### 1.3 OpenCode Native Compatibility Paradox

**The Problem**: OpenCode can natively read Claude files, so conversion is technically unnecessary. But:

```
User converts Claude → OpenCode:
  - Input: .claude/skills/my-skill/SKILL.md
  - Output: .opencode/commands/my-skill.md
  
Problem:
  1. OpenCode would have read the original natively
  2. Conversion loses Claude-specific features (fork, allowed-tools)
  3. User now has TWO versions to maintain
  4. Conversion was destructive, not additive
```

**Gap**: CACE should recommend using original files, not converting them.

---

## 2. Semantic Drift During Conversion

### 2.1 Activation Model Drift

```yaml
# Claude: Progressive disclosure with triggers
activation:
  mode: suggested  # Agent decides when to use
  triggers:
    - type: keyword
      keywords: ["deploy", "release"]
    - type: context
      pattern: "production"

# Converted to Cursor: Static alwaysApply
description: Deployment skill
alwaysApply: true  # ❌ ALWAYS included, not contextually triggered

# Result: Agent gets constant deployment instructions
# even when discussing unrelated topics
```

**Information Loss**: Contextual intelligence → Static inclusion

### 2.2 Execution Model Drift

```yaml
# Claude: Fork context for isolation
execution:
  context: fork
  subAgent: explore

# Converted to Windsurf: Main context
# (No equivalent in Windsurf)

# Result: Large codebase analysis runs in main context
# Previous conversation history compressed or lost
```

**Information Loss**: Isolated execution → Shared state

### 2.3 Capability Boundary Drift

```yaml
# Claude: Restricted tool access
allowed-tools: ["Read", "Grep"]  # Cannot modify files

# Converted to Cursor: Full capabilities
# (No tool restrictions in Cursor)

# Result: Skill that was "safe" (read-only analysis)
# can now accidentally modify code
```

**Information Loss**: Security boundary → Trust boundary

---

## 3. Defaults We Must Select (And Their Dangers)

### 3.1 Component Type Defaults

**Claude → Windsurf**:
- Claude skill with `disable-model-invocation: true` → **Windsurf Workflow**
- Claude skill with `disable-model-invocation: false` → **Windsurf Skill**
- **DANGER**: If user set `disable-model-invocation: true` temporarily for testing, CACE incorrectly routes to Workflow

**Claude → Cursor**:
- All skills → **Cursor Command** (no auto-invocation in Cursor)
- **DANGER**: User loses progressive disclosure benefit

### 3.2 Frontmatter Defaults

**Missing Fields**:
```yaml
# Claude skill has: name, description, allowed-tools, context, agent, model

# Cursor rule has: description, globs, alwaysApply

# Conversion defaults:
description: "{original description}"  # ✅ Preserved
globs: ["**/*"]                        # ❌ DEFAULT: applies to ALL files
alwaysApply: false                     # ❌ DEFAULT: agent decides

# Problem: User must manually tune globs
```

### 3.3 Body Content Defaults

**Chained References**:
```markdown
# Claude: Can use SlashCommand tool to invoke other skills
Use SlashCommand to call /test-suite

# Converted to Windsurf:
Call /test-suite  # ❌ May not exist in Windsurf

# Problem: Broken references
```

---

## 4. The "Lossy Conversion" Fallacy

### 4.1 Current Approach: Preserve What's Possible

```typescript
// Current CACE logic:
if (featureExistsInTarget(feature)) {
  preserve(feature)
} else {
  logWarning("Feature lost: " + feature.name)
}
```

**Problem**: This is a **defeatist** approach. We're accepting loss without attempting recovery.

### 4.2 Proposed Approach: Semantic Reconstruction

```typescript
// LLM-assisted optimization:
if (featureExistsInTarget(feature)) {
  preserve(feature)
} else {
  // Attempt semantic reconstruction
  reconstruction = llm.optimize(feature, targetAgent, {
    strategy: "approximate",
    riskLevel: "safe"
  })
  apply(reconstruction)
}
```

---

## 5. Critical Gaps Requiring LLM Optimization

### Gap 1: Context Isolation Loss

**Problem**: `context: fork` has no equivalent

**LLM Optimization Opportunity**:
```
Input: Claude skill with context: fork
LLM Task: "This skill requires isolated execution. Suggest how to:
  1. Document the isolation requirement in body
  2. Add manual instructions for user to clear context first
  3. Suggest target-agent specific workarounds"
  
Output: Enhanced body text with isolation instructions
```

### Gap 2: Tool Restriction Loss

**Problem**: `allowed-tools: ["Read", "Grep"]` has no equivalent

**LLM Optimization Opportunity**:
```
Input: Skill with allowed-tools restriction
LLM Task: "Convert tool restrictions into explicit body instructions:
  - Add 'DO NOT use Write or Edit tools'
  - Add 'Only use Read and Grep for analysis'
  - Add warning about tool misuse"
  
Output: Body with explicit tool usage constraints
```

### Gap 3: Auto-Invocation Intelligence Loss

**Problem**: Contextual triggers (keywords, globs) lost

**LLM Optimization Opportunity**:
```
Input: Claude skill with contextual activation
LLM Task: "Optimize for target agent:
  - For Cursor: Suggest globs patterns based on skill purpose
  - For Windsurf: Suggest tags for progressive disclosure
  - For OpenCode: Suggest skill() tool invocation patterns"
  
Output: Target-appropriate activation configuration
```

### Gap 4: Semantic Intent Preservation

**Problem**: Literal translation loses intent

**Example**:
```markdown
# Claude skill (literal conversion):
Use the Task tool to delegate to subagent

# Converted to Windsurf (literal):
Use the Task tool to delegate to subagent  # ❌ Tool doesn't exist

# Converted with LLM optimization:
This process should be run in isolation. 
In Windsurf, this means:
1. First run /clear to reset context
2. Then execute this workflow
3. Review results before continuing
```

---

## 6. Risk Assessment for LLM Optimization

### 6.1 Risk Levels

**--safe (Default)**:
- Only touches: default values, syntax errors, formatting
- Preserves: All semantic content, structure, intent
- Never: Modifies body content, adds/removes features
- Use case: Fix obvious conversion errors

**--medium**:
- Can: Improve frontmatter defaults (globs, descriptions)
- Can: Add target-specific best practices
- Can: Fix broken cross-references
- Cannot: Modify body instructions substantially
- Use case: Optimize without changing behavior

**--high**:
- Can: Rewrite body content for target agent
- Can: Reinterpret features in target-appropriate way
- Can: Add/remove instructions to preserve intent
- Cannot: Change core purpose or safety constraints
- Use case: Maximum optimization with user review

**--dangerous (Explicit opt-in)**:
- Can: Major restructuring
- Can: Interpret intent broadly
- Can: Add new capabilities not in original
- Requires: Manual review and testing
- Use case: When conversion fidelity is critically low

### 6.2 Why Risk Levels Matter

**Scenario**: Converting a security audit skill from Claude to Cursor

```markdown
# Original (Claude):
---
name: security-audit
description: Audit for security vulnerabilities
allowed-tools: ["Read", "Grep"]  # Cannot modify files
---

Perform security audit. DO NOT modify any files.

# --safe conversion (Cursor):
---
description: Security audit skill
globs: ["**/*"]  # ❌ Default applies to everything
alwaysApply: false
---

Perform security audit. DO NOT modify any files.
# ❌ Cursor doesn't enforce tool restrictions!
# User could still accidentally run /edit

# --high optimization (Cursor):
---
description: Security audit skill - READ ONLY
globs: ["src/**/*", "**/*.js", "**/*.ts"]  # ✅ Smart globs
alwaysApply: false
---

⚠️ READ-ONLY SECURITY AUDIT ⚠️
This command only analyzes code for vulnerabilities.
It will NOT fix or modify any files.

To fix issues, manually apply the recommendations
or run /security-fix after reviewing.

Steps:
1. Read and analyze code
2. Identify vulnerabilities
3. Report findings ONLY
4. Do NOT use Edit tool
```

**Impact**: High optimization adds safety guardrails that were lost in conversion.

---

## 7. Value Assessment: Why LLM Optimization is Essential

### 7.1 Without Optimization

```
User converts Claude → Cursor:
  Input: Security skill with allowed-tools: [Read]
  Output: Cursor command with no tool restrictions
  Result: User runs command, accidentally modifies production code
  Blame: "CACE said it converted successfully!"
```

### 7.2 With Optimization (--safe)

```
User converts Claude → Cursor:
  Input: Security skill with allowed-tools: [Read]
  Output: Cursor command + warning about lost restrictions
  Result: User aware of limitations, manually adds safety text
  Blame: User made informed decision
```

### 7.3 With Optimization (--high)

```
User converts Claude → Cursor:
  Input: Security skill with allowed-tools: [Read]
  Output: Cursor command with explicit READ-ONLY instructions
  Result: Skill behavior preserved through explicit text
  Blame: N/A - Intent preserved
```

### 7.4 Business Value

| Metric | Without Opt | With --safe | With --high |
|--------|-------------|-------------|-------------|
| Conversion fidelity | 60-70% | 70-80% | 85-95% |
| User trust | LOW | MEDIUM | HIGH |
| Safety preservation | NONE | WARNED | MAINTAINED |
| Manual fixing required | EXTENSIVE | MODERATE | MINIMAL |
| Support burden | HIGH | MEDIUM | LOW |

---

## 8. Trade-off Analysis

### 8.1 Benefits of LLM Optimization

✅ **Preserves semantic intent** even when features don't map 1:1
✅ **Reduces manual fixing** by user after conversion
✅ **Maintains safety guarantees** through explicit instructions
✅ **Improves defaults** (globs, descriptions, patterns)
✅ **Fixes broken references** and cross-skill dependencies
✅ **Adds target-specific best practices**

### 8.2 Risks of LLM Optimization

⚠️ **Non-deterministic**: LLM may produce different outputs for same input
⚠️ **Hallucination risk**: May add instructions not in original
⚠️ **Over-optimization**: May change behavior in unintended ways
⚠️ **Performance**: Adds latency to conversion process
⚠️ **Cost**: Requires LLM API calls (if not using local model)
⚠️ **Trust**: Users may not understand what was changed

### 8.3 Mitigation Strategies

1. **Risk levels**: User controls optimization aggressiveness
2. **Diff preview**: Show changes before applying (dry-run)
3. **Full audit log**: Track every change made by LLM
4. **Fallback**: Can always revert to literal conversion
5. **Safety mode default**: --safe is default, higher levels require explicit opt-in
6. **Warning labels**: Clear warnings about what was optimized

---

## 9. Implementation Architecture

### 9.1 Slash Command Integration

```bash
# After conversion, optimize the result
cace convert my-skill.md -t cursor

cace optimize .cursor/commands/my-skill.md \
  --from cursor \
  --risk medium \
  --dry-run  # Preview changes first

cace optimize .cursor/commands/my-skill.md \
  --from cursor \
  --risk medium \
  --apply    # Apply changes
```

### 9.2 Pipeline Integration

```bash
# Combined command (one-step conversion + optimization)
cace convert my-skill.md -t cursor --optimize --risk medium

# Which is equivalent to:
cace convert my-skill.md -t cursor
  ↓ (auto-triggers if fidelity < 80%)
cace optimize <output> --risk medium --auto
```

---

## 10. Recommendation

**CRITICAL**: LLM-assisted optimization is **NOT OPTIONAL** for production use.

Without it:
- CACE is a naive converter that accepts data loss
- Users bear burden of fixing conversions
- Safety features lost without warning
- Conversion fidelity too low for trust

With it:
- CACE is an intelligent transformation system
- Semantic intent preserved through reconstruction
- Safety maintained through explicit instructions
- High-fidelity conversions users can trust

---

## Conclusion

The current CACE system is **fundamentally incomplete**. It can parse and render, but it cannot **preserve intent** when features don't map directly. 

LLM-assisted optimization is not a nice-to-have feature—it is **essential infrastructure** to make CACE production-ready. Without it, CACE is a toy. With it, CACE is a professional tool.

**Recommendation**: Implement LLM optimization as core feature, not add-on.

---

*Assessment Date: January 29, 2026*
*Status: BLOCKING for v1.0.0 production release*
