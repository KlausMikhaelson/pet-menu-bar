#!/bin/bash

# Menu Bar Dog - Credentials Setup Script
# This script helps you set up Google Calendar credentials for distribution

set -e

echo "🐕 Menu Bar Dog - Credentials Setup"
echo "=================================="

# Check if credentials.json exists
if [ -f "credentials.json" ]; then
    echo "✅ Found existing credentials.json"
    
    # Validate the credentials file
    if command -v jq >/dev/null 2>&1; then
        # Use jq if available for better validation
        if jq -e '.installed.client_id' credentials.json >/dev/null 2>&1; then
            CLIENT_ID=$(jq -r '.installed.client_id' credentials.json)
            if [[ "$CLIENT_ID" != "null" && "$CLIENT_ID" != "YOUR_ACTUAL_CLIENT_ID"* ]]; then
                echo "✅ Credentials appear to be valid"
                echo "   Client ID: ${CLIENT_ID:0:20}..."
            else
                echo "⚠️  Credentials contain placeholder values"
                echo "   Please update with your actual Google API credentials"
            fi
        else
            echo "❌ Invalid credentials format"
            exit 1
        fi
    else
        # Basic validation without jq
        if grep -q "YOUR_ACTUAL_CLIENT_ID" credentials.json; then
            echo "⚠️  Credentials contain placeholder values"
            echo "   Please update with your actual Google API credentials"
        else
            echo "✅ Credentials appear to be configured"
        fi
    fi
    
    echo ""
    echo "📦 Building DMG with bundled credentials..."
    npm run dist:mac
    
    echo ""
    echo "🎉 DMG built successfully!"
    echo "   Users will be able to use 'Quick Setup' option"
    echo "   Your credentials will be shared with all users"
    
else
    echo "❌ No credentials.json found"
    echo ""
    echo "To bundle your credentials with the app:"
    echo "1. Follow GOOGLE_CALENDAR_SETUP.md to create Google API credentials"
    echo "2. Download the credentials file and save as 'credentials.json'"
    echo "3. Run this script again"
    echo ""
    echo "Or build without bundled credentials:"
    echo "npm run dist:mac"
    echo ""
    echo "Users will need to set up their own credentials"
fi 