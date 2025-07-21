#!/bin/bash

# Menu Bar Dog - Release Preparation Script
# This script builds the DMG files and prepares them for distribution

set -e

echo "🐕 Menu Bar Dog - Preparing Release"
echo "=================================="

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf release/
rm -rf dist/

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Build DMG for distribution
echo "📦 Building DMG for macOS..."
npm run dist:mac

# Check if DMGs were created
if [ -f "release/Menu Bar Dog-1.0.0.dmg" ]; then
    echo "✅ Intel DMG created: $(ls -lh release/Menu\ Bar\ Dog-1.0.0.dmg | awk '{print $5}')"
fi

if [ -f "release/Menu Bar Dog-1.0.0-arm64.dmg" ]; then
    echo "✅ Apple Silicon DMG created: $(ls -lh release/Menu\ Bar\ Dog-1.0.0-arm64.dmg | awk '{print $5}')"
fi

# Create release notes
echo "📝 Creating release notes..."
cat > release/RELEASE_NOTES.md << EOF
# Menu Bar Dog v1.0.0

## 🎉 Initial Release

A cute dog that sits in your macOS menu bar and reminds you of calendar events!

### ✨ Features
- Animated dog that runs when you type
- Google Calendar integration for meeting reminders
- Beautiful black matte design with golden accents
- Popup reminders 15 minutes before meetings
- Right-click menu with various dog interactions

### 📦 Installation
1. Download the appropriate DMG for your Mac:
   - **Intel Macs**: Menu Bar Dog-1.0.0.dmg
   - **Apple Silicon Macs**: Menu Bar Dog-1.0.0-arm64.dmg
2. Open the DMG and drag the app to Applications
3. Launch and enjoy your new menu bar companion!

### 🔧 Setup
For Google Calendar integration, see the included GOOGLE_CALENDAR_SETUP.md file.

### 📋 Requirements
- macOS 10.14 or later
- Internet connection for calendar features

---
Made with ❤️ and 🐕
EOF

# Copy setup guide to release folder
cp GOOGLE_CALENDAR_SETUP.md release/

echo ""
echo "🎉 Release preparation complete!"
echo ""
echo "📁 Files created in release/ folder:"
ls -la release/
echo ""
echo "🚀 Ready for distribution!"
echo "   - Upload DMG files to GitHub releases"
echo "   - Include RELEASE_NOTES.md in the release description"
echo "   - Make sure users have GOOGLE_CALENDAR_SETUP.md for calendar setup" 