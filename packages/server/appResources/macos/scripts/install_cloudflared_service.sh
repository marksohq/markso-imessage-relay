#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <CLOUDFLARE_TUNNEL_TOKEN>"
  exit 2
fi

TOKEN="$1"
# Use official cloudflared release for macOS - installs to SYSTEM, not app
CLOUDFLARED_BIN="/usr/local/bin/cloudflared"

echo "🔧 Installing cloudflared service..."

# Detect CPU architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  BINARY_NAME="cloudflared-arm64"
  echo "🍎 Detected Apple Silicon (ARM64)"
elif [ "$ARCH" = "x86_64" ]; then
  BINARY_NAME="cloudflared-amd64"
  echo "💻 Detected Intel (x86_64)"
else
  echo "❌ Unsupported architecture: $ARCH"
  exit 3
fi

# 1) Check if cloudflared is already installed system-wide and working
if [ -x "$CLOUDFLARED_BIN" ] && file "$CLOUDFLARED_BIN" | grep -q "Mach-O.*executable" && "$CLOUDFLARED_BIN" --version >/dev/null 2>&1; then
  echo "✅ cloudflared already installed at $CLOUDFLARED_BIN"
  EXISTING_VERSION=$($CLOUDFLARED_BIN --version 2>&1 | head -1 || echo "unknown")
  echo "   Version: $EXISTING_VERSION"
else
  # Remove broken/corrupted cloudflared if it exists
  if [ -f "$CLOUDFLARED_BIN" ]; then
    echo "⚠️  Removing corrupted cloudflared binary..."
    rm -f "$CLOUDFLARED_BIN"
  fi
  echo "📦 cloudflared not found, installing from app bundle..."
  
  # Find the script directory
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  
  # Get resources path from environment variable (passed from Electron app)
  # Fallback to script-relative path or hardcoded path
  if [ -n "${APP_RESOURCES_PATH:-}" ]; then
    RESOURCES_BASE="$APP_RESOURCES_PATH"
    echo "   Using APP_RESOURCES_PATH: $RESOURCES_BASE"
  else
    # Try to find resources relative to script
    RESOURCES_BASE="$SCRIPT_DIR/.."
    echo "   APP_RESOURCES_PATH not set, using script-relative path: $RESOURCES_BASE"
  fi
  
  # Try multiple paths for the binary
  SEARCH_PATHS=(
    "$RESOURCES_BASE/macos/$BINARY_NAME"
    "$SCRIPT_DIR/../$BINARY_NAME"
    "/Applications/Markso Nurture.app/Contents/Resources/appResources/macos/$BINARY_NAME"
  )
  
  echo "   Searching for binary: $BINARY_NAME"
  echo "   Search paths:"
  for PATH_TO_TRY in "${SEARCH_PATHS[@]}"; do
    echo "     - $PATH_TO_TRY"
  done
  
  APP_CLOUDFLARED=""
  for PATH_TO_TRY in "${SEARCH_PATHS[@]}"; do
    if [ -f "$PATH_TO_TRY" ]; then
      APP_CLOUDFLARED="$PATH_TO_TRY"
      echo "   ✓ Found at: $PATH_TO_TRY"
      break
    else
      echo "   ✗ Not found: $PATH_TO_TRY"
    fi
  done
  
  if [ -n "$APP_CLOUDFLARED" ]; then
    echo "   Found binary at: $APP_CLOUDFLARED"
    
    # Verify the binary is actually a Mach-O executable
    if file "$APP_CLOUDFLARED" | grep -q "Mach-O.*executable"; then
      # Ensure /usr/local/bin directory exists
      if [ ! -d "/usr/local/bin" ]; then
        echo "   Creating /usr/local/bin directory..."
        mkdir -p /usr/local/bin || {
          echo "❌ Failed to create /usr/local/bin directory"
          exit 4
        }
      fi
      
      # Copy the binary with error handling
      echo "   Copying binary to $CLOUDFLARED_BIN..."
      if cp "$APP_CLOUDFLARED" "$CLOUDFLARED_BIN"; then
        chmod +x "$CLOUDFLARED_BIN"
        echo "✅ cloudflared installed to $CLOUDFLARED_BIN"
      else
        echo "❌ Failed to copy binary to $CLOUDFLARED_BIN"
        echo "   Source: $APP_CLOUDFLARED"
        echo "   Destination: $CLOUDFLARED_BIN"
        exit 5
      fi
    else
      echo "❌ File at $APP_CLOUDFLARED is not a valid executable"
      file "$APP_CLOUDFLARED"
      exit 3
    fi
  else
    echo "❌ cloudflared binary not found for $ARCH."
    echo "   Looked for: $BINARY_NAME"
    echo "   Search paths:"
    for PATH_TO_TRY in "${SEARCH_PATHS[@]}"; do
      echo "   - $PATH_TO_TRY"
    done
    echo "   Script dir: $SCRIPT_DIR"
    exit 3
  fi
fi

# Check if service is already running and remove it completely
if launchctl list | grep -q "com.cloudflare.cloudflared"; then
  echo "⚠️  cloudflared service already exists, removing old service..."
  launchctl bootout system/com.cloudflare.cloudflared || true
  sleep 1
fi

# Also check for any existing cloudflared service files and remove them
if [ -f "/Library/LaunchDaemons/com.cloudflare.cloudflared.plist" ]; then
  echo "🗑️  Removing existing cloudflared service files..."
  rm -f /Library/LaunchDaemons/com.cloudflare.cloudflared.plist || true
fi

# Try to uninstall any existing cloudflared service first
echo "🧹 Cleaning up any existing cloudflared installation..."
"$CLOUDFLARED_BIN" service uninstall 2>/dev/null || true

# 2) Run service install using the token
echo "🚀 Installing cloudflared service with tunnel token..."
"$CLOUDFLARED_BIN" service install "$TOKEN"

# 3) Start the service
echo "▶️  Starting cloudflared service..."
launchctl enable system/com.cloudflare.cloudflared || true
launchctl kickstart -k system/com.cloudflare.cloudflared || true

# 4) Wait a moment and verify
sleep 2
if launchctl list | grep -q "com.cloudflare.cloudflared"; then
  echo "✅ cloudflared service installed and started successfully"
  exit 0
else
  echo "⚠️  cloudflared service may not be running. Check with: sudo launchctl list | grep cloudflare"
  exit 0
fi