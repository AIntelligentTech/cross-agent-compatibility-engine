/**
 * Cross-Agent Compatibility Engine
 *
 * A comprehensive, flexible, version-aware cross-agent compatibility engine
 * for bidirectional conversion of agent components.
 */

// Core exports
export * from "./core/types.js";
export * from "./core/constants.js";
export * from "./core/schema.js";

// Parsing exports
export * from "./parsing/index.js";

// Rendering exports
export * from "./rendering/index.js";

// Transformation exports
export * from "./transformation/index.js";

// Versioning exports
export * from "./versioning/index.js";

// Main conversion function
export { transform, transformSpec } from "./transformation/transformer.js";
export { parseComponent, detectAgent } from "./parsing/parser-factory.js";
export {
  renderComponent,
  getTargetPath,
} from "./rendering/renderer-factory.js";
