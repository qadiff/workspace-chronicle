# Development Guide

This document describes how to set up the development environment and common development workflows.

## Prerequisites

- Node.js (v18 or later recommended)
- npm
- Visual Studio Code

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/qadiff/workspace-chronicle.git
cd workspace-chronicle
```

### 2. Install dependencies

```bash
npm install
```

### 3. Compile TypeScript

```bash
npm run compile
```

### 4. Launch the Extension Host

Press `F5` in VS Code to launch a new VS Code window with the extension loaded.

Alternatively:

```bash
npm run dev
```

Then press `F5`.

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch mode compilation |
| `npm run dev` | Compile and display F5 instruction |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run test:linux` | Run tests on Linux (with xvfb) |
| `npm run package` | Create VSIX package |
| `npm run bump` | Increment patch version (0.0.8 → 0.0.9) |
| `npm run bump:down` | Decrement patch version (0.0.9 → 0.0.8) |
| `npm run version:tag` | Create git tag for current version |
| `npm run version:untag` | Delete git tag for current version |
| `npm run release` | Bump version, compile, and package |

## Testing

Run all tests:

```bash
npm run test
```

On Linux (CI environment):

```bash
npm run test:linux
```

Tests are located in `src/test/` and use Mocha as the test framework.

## Linting

```bash
npm run lint
```

The project uses ESLint with TypeScript support. Husky and lint-staged are configured to run linting on pre-commit.

## Building a VSIX Package

```bash
npm run package
```

This creates a `.vsix` file in the project root that can be installed locally or distributed.

## Development Workflow

1. Create a feature branch
2. Make changes
3. Run `npm run lint` to check for issues
4. Run `npm run test` to run tests
5. Press `F5` to test the extension manually
6. Commit your changes (lint-staged runs automatically)
7. Create a pull request

## Debugging

1. Set breakpoints in VS Code
2. Press `F5` to launch the Extension Development Host
3. Trigger the functionality you want to debug
4. VS Code will pause at your breakpoints

The `.vscode/launch.json` configuration handles the debug setup.