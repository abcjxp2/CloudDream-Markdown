#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SWIFT_DIR="$ROOT_DIR/swift-mac"
BUILD_DIR="$ROOT_DIR/release-swift"
APP_DIR="$BUILD_DIR/云梦Markdown.app"
EXECUTABLE="$SWIFT_DIR/.build/release/CloudDreamMarkdownMac"
RESOURCE_BUNDLE="$SWIFT_DIR/.build/release/CloudDreamMarkdownMac_CloudDreamMarkdownMac.bundle"

swift build --package-path "$SWIFT_DIR" -c release

rm -rf "$BUILD_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"
cp "$EXECUTABLE" "$APP_DIR/Contents/MacOS/云梦Markdown"
cp "$ROOT_DIR/assets/YunmengMarkdown.icns" "$APP_DIR/Contents/Resources/YunmengMarkdown.icns"
cp -R "$RESOURCE_BUNDLE" "$APP_DIR/Contents/Resources/"

cat > "$APP_DIR/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>云梦Markdown</string>
  <key>CFBundleExecutable</key>
  <string>云梦Markdown</string>
  <key>CFBundleIconFile</key>
  <string>YunmengMarkdown.icns</string>
  <key>CFBundleIdentifier</key>
  <string>com.local.yunmeng-markdown.native</string>
  <key>CFBundleName</key>
  <string>云梦Markdown</string>
  <key>CFBundleDevelopmentRegion</key>
  <string>zh_CN</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>14.0</string>
  <key>CFBundleDocumentTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeExtensions</key>
      <array>
        <string>md</string>
        <string>markdown</string>
      </array>
      <key>CFBundleTypeName</key>
      <string>Markdown Document</string>
      <key>CFBundleTypeRole</key>
      <string>Viewer</string>
      <key>LSHandlerRank</key>
      <string>Alternate</string>
    </dict>
  </array>
</dict>
</plist>
PLIST

echo "Created $APP_DIR"
