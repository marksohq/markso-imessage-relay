# Production Release Guide for Markso Nurture

## Overview

This guide explains how to build and release the Markso Nurture app for production with auto-updates via GitHub releases.

## Prerequisites

1. **GitHub Repository**: `marksohq/markso-imessage-relay`
2. **GitHub Token**: For publishing releases (set as `GH_TOKEN` environment variable)
3. **Code Signing** (optional but recommended):
   - Apple Developer Account
   - Code signing certificates installed in Keychain
   - Set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` environment variables

## Build Configuration

### Electron Builder Config

The app is configured in `packages/server/scripts/electron-builder-config.js`:
- **Product Name**: Markso Nurture
- **App ID**: `com.markso.nurture`
- **GitHub Repo**: `marksohq/markso-imessage-relay`
- **Release Type**: release

### Environment Variables

**For Building:**
```bash
export API_BASE_URL=https://api.nurture.markso.io  # Production API URL
export NODE_ENV=production
```

**For Publishing (if using GitHub releases):**
```bash
export GH_TOKEN=your_github_token_here
```

## Release Process

### Step 1: Update Version

Update the version in `packages/server/package.json`:
```json
{
  "version": "1.0.0"  // Update to new version (e.g., "1.0.1")
}
```

### Step 2: Build for Production

```bash
# From project root
npm run build
```

This will:
1. Build the UI with production API URL
2. Build the server
3. Create DMG files in `dist/`

### Step 3: Create GitHub Release

**Option A: Using electron-builder (Automatic)**
```bash
cd packages/server
export GH_TOKEN=your_github_token
npm run release  # This builds AND publishes to GitHub
```

**Option B: Manual Release**
1. Build the app: `npm run build`
2. Go to GitHub: https://github.com/marksohq/markso-imessage-relay/releases
3. Click "Draft a new release"
4. Tag: `v1.0.0` (must match version in package.json)
5. Title: `v1.0.0` or descriptive title
6. Upload DMG files from `dist/`:
   - `Markso Nurture-1.0.0-arm64.dmg` (Apple Silicon)
   - `Markso Nurture-1.0.0.dmg` (Intel)
7. Publish release

### Step 4: Verify Auto-Updates

The app will automatically:
1. Check GitHub releases every 12 hours (configurable)
2. Compare current version with latest release
3. Show notification if update is available
4. Allow users to download and install updates

## Auto-Update Configuration

### How It Works

1. **UpdateService** (`packages/server/src/server/services/updateService/index.ts`):
   - Checks GitHub releases API
   - Compares versions using semver
   - Notifies users of available updates

2. **electron-updater**:
   - Handles downloading updates
   - Installs updates automatically
   - Configured via electron-builder config

### Update Check Settings

Users can enable/disable update checks via the config:
- `check_for_updates`: boolean (default: true)

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Set `API_BASE_URL` to production URL
- [ ] Build the app: `npm run build`
- [ ] Test the DMG installation
- [ ] Create GitHub release with DMG files
- [ ] Tag release as `v{version}` (e.g., `v1.0.0`)
- [ ] Verify auto-update detection works
- [ ] Test update installation process

## Important Notes

1. **DMG Naming**: The app looks for DMG files named `Markso Nurture-{version}*.dmg`
2. **Version Format**: Must follow semver (e.g., `1.0.0`, `1.0.1`)
3. **GitHub Tags**: Must be prefixed with `v` (e.g., `v1.0.0`)
4. **Release Type**: Set `releaseType: "release"` in electron-builder config for public releases
5. **Code Signing**: Required for notarization (optional but recommended)

## Troubleshooting

**Updates not detected:**
- Check GitHub repo URL matches: `marksohq/markso-imessage-relay`
- Verify release is published (not draft)
- Check DMG file naming matches pattern
- Verify version format is correct

**Build fails:**
- Ensure all dependencies are installed: `npm install`
- Check Node.js version (v20.x recommended)
- Verify electron-builder config is correct
