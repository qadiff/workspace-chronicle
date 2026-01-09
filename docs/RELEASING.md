# Release Guide

This document describes the release process for Workspace Chronicle.

## Version Management

The project uses a custom version management script located at `scripts/bump-version.js`.

### Version Commands

| Command | Description |
|---------|-------------|
| `npm run bump` | Increment patch version (e.g., 0.0.8 → 0.0.9) |
| `npm run bump:down` | Decrement patch version (e.g., 0.0.9 → 0.0.8) |
| `npm run version:tag` | Create a local git tag (e.g., `v0.0.9`) |
| `npm run version:untag` | Delete a local git tag |

### Important Notes

- `npm run version:tag` creates a **local tag only**. You must push manually:

  ```bash
  git push origin v0.0.9
  ```

- `npm run version:untag` deletes the **local tag only**. To delete a remote tag:

  ```bash
  git push origin --delete v0.0.9
  ```

## Release Workflow

### 1. Prepare the release

Ensure all changes are committed and the code passes lint and tests:

```bash
npm run lint
npm run test
```

### 2. Bump version and create package

Use the release script to bump version, compile, and package:

```bash
npm run release
```

Or do it step by step:

```bash
npm run bump           # Increment version in package.json
npm run compile        # Compile TypeScript
npm run package        # Create VSIX file
```

### 3. Commit

```bash
git add package.json
git commit -m "Release v0.0.9"
```

### 4. Create git tag

Create the tag after committing the version change:

```bash
npm run version:tag    # Creates local tag (e.g., v0.0.9)
```

### 5. Push

```bash
git push origin main
git push origin v0.0.9
```

### 6. Publish to VS Code Marketplace

```bash
vsce publish
```

Or upload the `.vsix` file manually through the [VS Code Marketplace Publisher](https://marketplace.visualstudio.com/manage).

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Currently, the project is in early development (`0.0.x`), so all changes increment the patch version.

## Rollback

If you need to rollback a release:

### Undo version bump (before commit)

```bash
npm run bump:down
```

### Delete a tag

Local:

```bash
npm run version:untag
```

Remote:

```bash
git push origin --delete v0.0.x
```

## CI/CD

GitHub Actions automatically runs tests on pull requests. See `.github/workflows/` for workflow configurations.