/**
 * Test setup file - ensures all components are registered before tests run
 */

// Import and register all validators
import '../src/validation/index.js';

// Import and register all optimizers
import { OptimizerFactory } from '../src/optimization/optimizer-core.js';
import { ClaudeSourceOptimizer } from '../src/optimization/optimizers/claude-source-optimizer.js';

// Register optimizers
OptimizerFactory.register(new ClaudeSourceOptimizer());

console.log('✅ Test setup complete - all components registered');
