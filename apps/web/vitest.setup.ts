// Configure React act() environment for testing
// React 19 requires this global to be set for test environments
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
