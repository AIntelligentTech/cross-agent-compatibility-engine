# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in
Cross-Agent Compatibility Engine, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email security concerns to: **security@aintelligenttech.com**
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Resolution Timeline**: Depends on severity
  - Critical: 24-72 hours
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Next release cycle

### Disclosure Policy

- We follow responsible disclosure practices
- We will credit reporters in release notes (unless anonymity is requested)
- We ask that you give us reasonable time to address issues before public
  disclosure

## Security Best Practices for Users

### Input Validation

CACE validates all input using Zod schemas. However, when integrating:

- Validate file paths before passing to CACE
- Sanitize any user-provided content in component files
- Use the `--dry-run` flag to preview changes before writing

### File System Access

CACE reads and writes files as specified. To minimize risk:

- Run with appropriate file system permissions
- Use explicit `--output` paths rather than default locations
- Review conversion output before deploying to production

### Dependencies

We maintain minimal dependencies to reduce attack surface:

- `commander` - CLI framework (well-maintained)
- `gray-matter` - YAML parsing (stable)
- `chalk` - Terminal colors (no security concerns)
- `zod` - Schema validation (TypeScript-native)

All dependencies are regularly audited via `npm audit`.

## Security Considerations in Design

### No Network Access

CACE operates entirely locally. It:

- Does not make network requests
- Does not phone home or collect telemetry
- Does not require internet connectivity

### No Code Execution

CACE parses and transforms text content. It:

- Does not execute code from component files
- Does not eval() or run dynamic code
- Treats all input as data, not executable

### Deterministic Output

Given the same input, CACE produces the same output. This makes it:

- Auditable
- Reproducible
- Suitable for CI/CD pipelines
