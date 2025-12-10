#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <CLOUDFLARE_TUNNEL_TOKEN>"
  exit 2
fi

TOKEN="$1"
# Use official cloudflared release for macOS - installs to SYSTEM, not app
CLOUDFLARED_BIN="/usr/local/bin/cloudflared"

# Per-user configuration
CURRENT_USER=$(whoami)
USER_ID=$(id -u)
SERVICE_NAME="com.cloudflare.cloudflared.${CURRENT_USER}"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

echo "🔧 Installing cloudflared service for user: $CURRENT_USER..."

# Ensure LaunchAgents directory exists
mkdir -p "$HOME/Library/LaunchAgents"

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
    sudo rm -f "$CLOUDFLARED_BIN"
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
      sudo cp "$APP_CLOUDFLARED" "$CLOUDFLARED_BIN"
      sudo chmod +x "$CLOUDFLARED_BIN"
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

# 2) Unload existing user service if it exists
if launchctl list 2>/dev/null | grep -q "$SERVICE_NAME"; then
  echo "⚠️  Existing service found for $CURRENT_USER, unloading..."
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  sleep 1
fi

# Remove old plist if it exists
if [ -f "$PLIST_PATH" ]; then
  echo "🗑️  Removing existing plist..."
  rm -f "$PLIST_PATH"
fi

# 3) Create the LaunchAgent plist for this user
echo "📝 Creating LaunchAgent plist at $PLIST_PATH..."

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${CLOUDFLARED_BIN}</string>
        <string>tunnel</string>
        <string>run</string>
        <string>--token</string>
        <string>${TOKEN}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/cloudflared-${CURRENT_USER}.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/Library/Logs/cloudflared-${CURRENT_USER}.error.log</string>
</dict>
</plist>
EOF

# 4) Load the service for this user
echo "🚀 Loading cloudflared service for $CURRENT_USER..."
launchctl load "$PLIST_PATH"

# 5) Wait a moment and verify
sleep 2
if launchctl list 2>/dev/null | grep -q "$SERVICE_NAME"; then
  echo "✅ cloudflared service installed and started successfully for $CURRENT_USER"
  echo "   Service name: $SERVICE_NAME"
  echo "   Plist: $PLIST_PATH"
  echo "   Logs: ~/Library/Logs/cloudflared-${CURRENT_USER}.log"
  exit 0
else
  echo "⚠️  cloudflared service may not be running. Check with: launchctl list | grep cloudflared"
  exit 0
fi
