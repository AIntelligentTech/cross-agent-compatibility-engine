import { dirname } from "node:path";
import type { ComponentMetadata } from "./types.js";

export type UnknownFieldMap = Record<string, unknown>;

export interface PreservationInput {
  sourceFile?: string;
  originalFormat: string;
  rawFrontmatter?: UnknownFieldMap;
  rawConfig?: UnknownFieldMap;
  knownKeys?: readonly string[];
}

export function extractUnknownFields(
  data: UnknownFieldMap,
  knownKeys: readonly string[],
): UnknownFieldMap | undefined {
  const customFields = Object.fromEntries(
    Object.entries(data).filter(([key]) => !knownKeys.includes(key)),
  );

  return Object.keys(customFields).length > 0 ? customFields : undefined;
}

export function createMetadata(
  input: PreservationInput,
  overrides: Partial<ComponentMetadata> = {},
): ComponentMetadata {
  const metadata: ComponentMetadata = {
    sourceFile: input.sourceFile,
    sourcePath: input.sourceFile,
    sourceDirectory: input.sourceFile ? dirname(input.sourceFile) : undefined,
    originalFormat: input.originalFormat,
    updatedAt: new Date().toISOString(),
    rawFrontmatter: input.rawFrontmatter,
    rawConfig: input.rawConfig,
    customFields:
      input.rawFrontmatter && input.knownKeys
        ? extractUnknownFields(input.rawFrontmatter, input.knownKeys)
        : undefined,
    preservedKeys: input.knownKeys ? [...input.knownKeys] : undefined,
    ...overrides,
  };

  return metadata;
}

export function mergeRawFrontmatter(
  frontmatter: UnknownFieldMap,
  metadata: ComponentMetadata,
  excludedKeys: readonly string[] = [],
): UnknownFieldMap {
  const merged: UnknownFieldMap = {
    ...frontmatter,
  };

  const preservedEntries = Object.entries(metadata.customFields ?? {}).filter(
    ([key]) => !excludedKeys.includes(key) && merged[key] === undefined,
  );

  for (const [key, value] of preservedEntries) {
    merged[key] = value;
  }

  return merged;
}

export function cloneRawConfig(metadata: ComponentMetadata): UnknownFieldMap | undefined {
  if (!metadata.rawConfig) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(metadata.rawConfig)) as UnknownFieldMap;
}
