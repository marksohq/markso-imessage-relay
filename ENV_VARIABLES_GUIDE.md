# Environment Variables Guide for Markso Server

## How Environment Variables Work

### Quick Start: API Base URL

The API base URL is configured via the `API_BASE_URL` environment variable:

**Development:**
- **Default:** `https://usable-uniquely-kit.ngrok-free.app` (automatically used when `NODE_ENV=development`)
- **Override:** `API_BASE_URL=https://your-dev-url.com npm start`

**Production:**
- **Default:** `https://api.nurture.markso.io` (automatically used when `NODE_ENV=production`)
- **Override:** `API_BASE_URL=https://your-prod-url.com npm run build`

**Note:** The webpack config automatically selects the correct default based on `NODE_ENV`, so you typically don't need to set it manually unless you want to override.

### Development vs Production

**Development:**
- Environment variables are set via shell `export` commands in `package.json` scripts
- Available at runtime via `process.env.*`
- Example: `export NODE_ENV=development && webpack ...`

**Production:**
- Environment variables can be:
  1. Set at build time (baked into bundle)
  2. Set at runtime (via system environment)
  3. Loaded from config files (recommended for secrets)

### Current Usage

The app currently uses:
- `NODE_ENV` - Determines dev vs production mode
- `HOME` - User home directory path
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` - For code signing/notarization

### Best Practices

#### 1. For Build-Time Variables (Safe to Bundle)

Use Webpack's `DefinePlugin` to inject values at build time:

```javascript
// webpack.main.config.js
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
    })
  ]
};
```

**Note:** Only use for non-sensitive values that are safe to bundle.

#### 2. For Runtime Variables (Sensitive Data)

**Option A: System Environment Variables**
```bash
# Set before running the app
export API_KEY=your-secret-key
./Markso.app/Contents/MacOS/Markso
```

**Option B: Config File (Recommended)**
```javascript
// Load from config file at runtime
const config = require('./config.json');
// Or use dotenv for .env files
require('dotenv').config();
```

**Option C: Electron's `app.getPath('userData')` Config**
```javascript
// Store in user's app data directory
const configPath = path.join(app.getPath('userData'), 'config.json');
```

#### 3. For Renderer Process (UI)

The renderer process has limited access to `process.env`. To pass values:

```javascript
// Main process
ipcMain.handle('get-env', () => {
  return {
    apiUrl: process.env.API_URL,
    // Only pass non-sensitive values
  };
});

// Renderer process
const env = await ipcRenderer.invoke('get-env');
```

### Security Considerations

1. **Never bundle secrets** - Don't use `DefinePlugin` for API keys, passwords, etc.
2. **Use Keychain/secure storage** - For sensitive data (already implemented for server password, webhook secret)
3. **Validate at runtime** - Check that required env vars are set
4. **Use different values per environment** - Dev, staging, production

### Recommended Setup for Production

1. **Non-sensitive config**: Use `DefinePlugin` in webpack
2. **Sensitive config**: Load from secure storage (Keychain) or config file
3. **Runtime config**: Use system environment variables or IPC

### Example: Adding a New Environment Variable

```javascript
// 1. In main process (packages/server/src/server/index.ts)
const apiUrl = process.env.API_URL || 'https://api.markso.com';

// 2. For build-time (if non-sensitive):
// webpack.main.config.js
new webpack.DefinePlugin({
  'process.env.API_URL': JSON.stringify(process.env.API_URL || 'https://api.markso.com'),
})

// 3. For runtime (if sensitive):
// Load from config or Keychain
const apiKey = await KeypairService.getApiKey(); // or from config file
```

### Current Implementation Notes

- `NODE_ENV` is set via shell export in package.json scripts
- Database paths use `process.env.HOME` (system variable)
- Sensitive data (server password, webhook secret) stored in Keychain ✅
- No `.env` file support currently (can be added with `dotenv` package)

