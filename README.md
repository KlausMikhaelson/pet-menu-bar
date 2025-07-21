# 🐕 Menu Bar Dog

A cute dog that sits in your macOS menu bar, runs when you type, and reminds you of upcoming calendar events!

![Menu Bar Dog Demo](assets/demo.gif)

## ✨ Features

- **🏃‍♂️ Animated Dog**: Watch your dog run in the menu bar when you type
- **📅 Calendar Integration**: Connect to Google Calendar for automatic meeting reminders
- **🚨 Smart Reminders**: Get elegant popup reminders 15 minutes before meetings
- **🎨 Dark Mode Ready**: Beautiful black matte design with golden accents
- **⚡ Lightweight**: Minimal resource usage, stays out of your way

## 📦 Installation

### Option 1: Download DMG (Recommended)

1. Download the latest `Menu Bar Dog-1.0.0.dmg` from the [releases](releases/) folder
2. Open the DMG file
3. Drag "Menu Bar Dog" to your Applications folder
4. Launch the app from Applications or Spotlight

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/menu-bar-dog.git
cd menu-bar-dog

# Install dependencies
npm install

# Build and run
npm start

# Or create a DMG for distribution
npm run dist:mac
```

## 🔧 Setup

### Basic Usage

1. **Launch the app** - Look for the dog emoji 🐕 in your menu bar
2. **Right-click the dog** to access menu options:
   - Pet the dog 🐾
   - Make dog run
   - Connect Google Calendar 📅
   - View upcoming events
   - Quit

### Google Calendar Integration

To enable meeting reminders:

1. **Set up Google Calendar API** (see [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md))
2. **Connect your calendar** via the menu bar right-click menu
3. **Enjoy automatic reminders** 15 minutes before your meetings!

## 🎮 How It Works

- **Typing Detection**: The dog runs when you type (excludes modifier keys)
- **Calendar Monitoring**: Checks for upcoming events every 5 minutes
- **Smart Reminders**: Shows popup reminders 15 minutes before meetings
- **Alert Mode**: Dog blinks when you have upcoming events

## 🛠 Development

### Tech Stack

- **Electron** - Cross-platform desktop framework
- **TypeScript** - Type-safe JavaScript
- **Google Calendar API** - Calendar integration
- **node-global-key-listener** - Typing detection

### Project Structure

```
menu-bar-dog/
├── src/
│   ├── main.ts          # Main Electron process
│   ├── calendar.ts      # Google Calendar integration
│   └── dialog.ts        # UI dialogs and popups
├── assets/              # Dog sprites and icons
├── build/               # Build configuration
└── dist/                # Compiled JavaScript
```

### Scripts

- `npm start` - Build and run the app
- `npm run dev` - Run in development mode
- `npm run build` - Compile TypeScript
- `npm run dist:mac` - Build DMG for distribution
- `npm run watch` - Watch for TypeScript changes

## 📱 Distribution

### Creating a DMG

```bash
npm run dist:mac
```

This creates:

- `release/Menu Bar Dog-1.0.0.dmg` - Installer for distribution
- Universal binary supporting both Intel and Apple Silicon Macs

### Code Signing (Optional)

For distribution outside the Mac App Store:

1. Get an Apple Developer certificate
2. Update `package.json` with your signing identity
3. The build process will automatically sign the app

## 🔒 Privacy & Security

- **Local Storage**: All credentials stored locally on your machine
- **Read-Only Access**: Only reads your calendar data, never modifies
- **No Data Collection**: No analytics or data sent to external servers
- **Secure Authentication**: Uses OAuth2 industry standard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Known Issues

- First-time calendar setup requires manual OAuth flow
- Requires macOS 10.14 or later
- Menu bar icon may not appear immediately on some systems

## 💡 Future Features

- [ ] Slack integration
- [ ] Custom reminder sounds
- [ ] Multiple calendar support
- [ ] Customizable reminder timing
- [ ] Dog breed selection

## 📞 Support

- **Setup Issues**: See [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)
- **Bug Reports**: Open an issue on GitHub
- **Feature Requests**: Create an issue with the "enhancement" label

---

Made with ❤️ and 🐕 for productivity enthusiasts
