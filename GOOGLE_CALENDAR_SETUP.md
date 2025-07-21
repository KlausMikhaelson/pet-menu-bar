# Google Calendar Setup Instructions

To enable Google Calendar integration with your Menu Bar Dog, follow these steps:

## 1. Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

## 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" (unless you have a Google Workspace account)
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add your email to test users
4. For Application type, choose "Desktop application"
5. Give it a name (e.g., "Menu Bar Dog Calendar")
6. Click "Create"

## 3. Download Credentials

1. After creating the OAuth client, click the download icon next to your credentials
2. This will download a JSON file
3. Rename this file to `credentials.json`
4. Place it in the root directory of your Menu Bar Dog project (same folder as package.json)

## 4. First Time Setup

1. Build and start your application: `npm start`
2. Right-click on the dog in your menu bar
3. Click "Connect Google Calendar 📅"
4. Follow the authentication flow:
   - Click "Authorize Calendar Access" to open your browser
   - Sign in to your Google account
   - Grant permission to read your calendar
   - Copy the authorization code
   - Paste it into the app and click "Connect Calendar"

## 5. Features

Once connected, your Menu Bar Dog will:

- **Automatic Reminders**: Get notifications 15 minutes before events start
- **Alert Mode**: The dog will blink with an alert icon when you have upcoming events
- **View Events**: Right-click the dog and select "View upcoming events" to see what's coming up
- **Stay Connected**: Your credentials are saved securely and the dog will reconnect automatically

## Security Notes

- Your `credentials.json` and `token.json` files contain sensitive information
- These files are automatically excluded from git (in .gitignore)
- Never share these files publicly
- The app only requests read-only access to your calendar

## Troubleshooting

**"Google Calendar credentials not found"**

- Make sure `credentials.json` is in the root directory
- Check that the file is properly formatted JSON

**Authentication fails**

- Make sure you've enabled the Google Calendar API
- Check that your OAuth consent screen is properly configured
- Verify you're using the correct authorization code

**No events showing**

- The app only shows events in the next 24 hours
- Make sure you have events in your primary calendar
- Check that the events have specific times (not all-day events)

## Privacy

This application:

- Only reads your calendar data (read-only access)
- Stores credentials locally on your machine
- Does not send your data to any external servers
- Only shows events from your primary calendar
