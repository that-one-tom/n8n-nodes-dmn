# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an n8n community node package that implements DMN (Decision Model and Notation) 1.3 compliant decision tables. The node allows n8n workflows to evaluate business rules using standardized decision logic with various hit policies and aggregation functions.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Build the TypeScript code and copy assets
npm run build

# Development with file watching
npm run dev

# Lint TypeScript files
npm run lint

# Auto-fix linting issues
npm run lintfix

# Format code with prettier
npm run format
```

### Testing
```bash
# Run the manual test suite (must build first)
npm run build && node test-dmn.js
```

### Publishing
```bash
# Pre-publish checks (build + strict linting)
npm run prepublishOnly
```

## Code Architecture

### Core Components

1. **Main Node (`nodes/DMN/Dmn.node.ts`)**
   - Implements the `INodeType` interface for n8n
   - Provides two operations: `evaluate` (runs decision logic) and `buildTable` (outputs table configuration)
   - Supports all DMN 1.3 hit policies: UNIQUE, FIRST, PRIORITY, ANY, COLLECT, RULE_ORDER, OUTPUT_ORDER
   - Handles aggregation for COLLECT hit policy: SUM, COUNT, MIN, MAX

2. **Decision Engine Architecture**
   - `buildDecisionTable()`: Converts n8n parameters into internal decision table structure
   - `evaluateDecisionTable()`: Main evaluation engine that processes input data against rules
   - `evaluateRule()`: Tests individual rules against input data
   - `parseCondition()`: Parses FEEL-like expressions into operators and operands

### Data Structures

**DecisionTable Interface:**
- `hitPolicy`: String defining how to handle multiple rule matches
- `aggregation`: Optional aggregation function for COLLECT policy
- `rules`: Array of DecisionRule objects
- `inputColumns`: Column definitions with types and optional expressions
- `outputColumns`: Column definitions with types and default values

**DecisionRule Interface:**
- `id`: Unique identifier
- `input`: Array of condition objects (column, operator, value)
- `output`: Array of output objects (column, value)
- `priority`: Optional numeric priority for PRIORITY hit policy
- `annotation`: Optional description

### FEEL Expression Support

The node supports a simplified subset of FEEL (Friendly Enough Expression Language):
- Comparisons: `>= 18`, `< 100`, `= "US"`
- Ranges: `[18..65]` (inclusive range)
- Lists: `in ("US", "CA", "UK")`, `not in ("EXCLUDED")`
- Wildcards: `-` (matches any value)
- Negation: `!= "INACTIVE"`

### Hit Policy Implementation

- **UNIQUE**: Validates only one rule matches, throws error if multiple match
- **FIRST**: Returns first matching rule in table order
- **PRIORITY**: Returns highest priority match (uses `rule.priority` field)
- **ANY**: Validates all matches have identical outputs
- **COLLECT**: Returns all matches, optionally aggregated
- **RULE_ORDER/OUTPUT_ORDER**: Returns all matches in specified order

## Build System

- **TypeScript Compilation**: Uses `tsc` to compile TypeScript to CommonJS
- **Asset Copying**: Copies SVG icons from `nodes/icons/` to `dist/nodes/`
- **Output**: All compiled code goes to `dist/` directory
- **Package Entry**: Points to compiled `dist/nodes/DMN/Dmn.node.js`

## File Structure Context

- `nodes/DMN/Dmn.node.ts` - Main node implementation
- `nodes/DMN/Dmn.node.json` - n8n node metadata
- `nodes/icons/DMN/dmn.svg` - Node icon
- `test-dmn.js` - Manual test suite with realistic scenarios
- `tsconfig.json` - TypeScript configuration targeting ES2020
- `.eslintrc.js` - ESLint config with n8n-nodes-base plugin

## Development Patterns

### Error Handling
- Uses n8n's `ApplicationError` for user-facing errors
- Uses `NodeOperationError` for execution errors with item context
- Supports `continueOnFail()` mode for graceful error handling

### Type Conversion
The node handles automatic type conversion based on column definitions:
- `number`: Uses `Number()` constructor
- `boolean`: Uses `Boolean()` constructor  
- `date`: Uses `new Date()` constructor
- `string`: No conversion needed

### Expression Evaluation
- Simplified FEEL expression parser using regex patterns
- Supports context variable substitution for input transformations
- Uses `Function()` constructor for safe expression evaluation (simplified approach)

## Testing Strategy

The project includes a comprehensive manual test (`test-dmn.js`) that:
- Simulates n8n's execution context with `MockExecuteFunctions`
- Tests multiple input scenarios with different rule matches
- Validates hit policies and aggregation functions
- Includes realistic business rule examples (customer discounts)

When making changes to the decision logic, run the test suite to ensure compatibility with existing workflows.
