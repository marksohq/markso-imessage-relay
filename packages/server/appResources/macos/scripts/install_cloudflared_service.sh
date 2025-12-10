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
  
  # Try multiple paths for the binary
  SEARCH_PATHS=(
    "$SCRIPT_DIR/../$BINARY_NAME"
    "/Applications/Markso Nurture.app/Contents/Resources/appResources/macos/$BINARY_NAME"
  )
  
  APP_CLOUDFLARED=""
  for PATH_TO_TRY in "${SEARCH_PATHS[@]}"; do
    if [ -f "$PATH_TO_TRY" ]; then
      APP_CLOUDFLARED="$PATH_TO_TRY"
      break
    fi
  done
  
  if [ -n "$APP_CLOUDFLARED" ]; then
    echo "   Found binary at: $APP_CLOUDFLARED"
    
    # Verify the binary is actually a Mach-O executable
    if file "$APP_CLOUDFLARED" | grep -q "Mach-O.*executable"; then
      cp "$APP_CLOUDFLARED" "$CLOUDFLARED_BIN"
      chmod +x "$CLOUDFLARED_BIN"
      echo "✅ cloudflared installed to $CLOUDFLARED_BIN"
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
cloudflared service uninstall 2>/dev/null || true

# 2) Run service install using the token
echo "🚀 Installing cloudflared service with tunnel token..."
cloudflared service install "$TOKEN"

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