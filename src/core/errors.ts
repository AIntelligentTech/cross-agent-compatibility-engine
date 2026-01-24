/**
 * Enhanced error handling with contextual, actionable messages
 */

export type ErrorCode =
  | 'PARSE_FAILED'
  | 'INVALID_FRONTMATTER'
  | 'UNKNOWN_AGENT'
  | 'UNSUPPORTED_CONVERSION'
  | 'FILE_NOT_FOUND'
  | 'FILE_READ_ERROR'
  | 'FILE_WRITE_ERROR'
  | 'VALIDATION_FAILED'
  | 'SCHEMA_INVALID'
  | 'RENDER_FAILED'
  | 'ROUND_TRIP_DRIFT';

export interface CaceError {
  code: ErrorCode;
  message: string;
  details?: string;
  suggestion?: string;
  context?: Record<string, unknown>;
}

export function createError(
  code: ErrorCode,
  message: string,
  options?: {
    details?: string;
    suggestion?: string;
    context?: Record<string, unknown>;
  }
): CaceError {
  return {
    code,
    message,
    ...options,
  };
}

export function formatError(error: CaceError, useColor: boolean = true): string {
  const red = useColor ? '\x1b[31m' : '';
  const yellow = useColor ? '\x1b[33m' : '';
  const gray = useColor ? '\x1b[90m' : '';
  const reset = useColor ? '\x1b[0m' : '';

  const lines: string[] = [];
  
  lines.push(`${red}Error [${error.code}]: ${error.message}${reset}`);
  
  if (error.details) {
    lines.push(`${gray}  Details: ${error.details}${reset}`);
  }
  
  if (error.suggestion) {
    lines.push(`${yellow}  Suggestion: ${error.suggestion}${reset}`);
  }
  
  if (error.context && Object.keys(error.context).length > 0) {
    lines.push(`${gray}  Context: ${JSON.stringify(error.context)}${reset}`);
  }
  
  return lines.join('\n');
}

export const ERROR_SUGGESTIONS: Record<ErrorCode, string> = {
  PARSE_FAILED: 'Check that the file has valid YAML frontmatter (--- delimiters) and valid markdown content.',
  INVALID_FRONTMATTER: 'Ensure frontmatter fields match the expected schema for the agent type.',
  UNKNOWN_AGENT: 'Use --from <agent> to specify the source agent, or check that the file path matches agent conventions.',
  UNSUPPORTED_CONVERSION: 'This conversion path is not yet supported. Check `cace matrix` for supported conversions.',
  FILE_NOT_FOUND: 'Verify the file path exists and is accessible.',
  FILE_READ_ERROR: 'Check file permissions and ensure the file is not locked by another process.',
  FILE_WRITE_ERROR: 'Check write permissions for the output directory.',
  VALIDATION_FAILED: 'Run `cace validate <file> --verbose` for detailed validation errors.',
  SCHEMA_INVALID: 'The component spec does not match the expected schema. Check required fields.',
  RENDER_FAILED: 'The component could not be rendered for the target agent. Check conversion warnings.',
  ROUND_TRIP_DRIFT: 'Significant semantic changes detected after round-trip conversion. Review the diff output.',
};

export function enrichError(error: CaceError): CaceError {
  if (!error.suggestion && ERROR_SUGGESTIONS[error.code]) {
    return {
      ...error,
      suggestion: ERROR_SUGGESTIONS[error.code],
    };
  }
  return error;
}
