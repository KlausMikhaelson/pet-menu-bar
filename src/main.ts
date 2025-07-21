import { app, Tray, Menu, nativeImage, NativeImage } from "electron";
import * as path from "path";
import { CalendarService } from "./calendar";
import {
  AuthDialog,
  EventsDialog,
  TrayPopup,
  CredentialsSetupDialog,
} from "./dialog";

interface IGlobalKeyEvent {
  state: "DOWN" | "UP";
  name?: string;
  rawKey?: any;
}

interface IGlobalKeyListener {
  (event: IGlobalKeyEvent): void;
}

interface GlobalKeyboardListener {
  addListener(listener: IGlobalKeyListener): Promise<void>;
  kill(): void;
}

interface DogSprites {
  sitting: NativeImage | string;
  running1: NativeImage | string;
  standing: NativeImage | string;
  alert: NativeImage | string;
}

type DogState = "sitting" | "running" | "alert";
type SpriteType = "sitting" | "running1" | "standing" | "alert";

let GlobalKeyboardListener:
  | typeof import("node-global-key-listener").GlobalKeyboardListener
  | undefined;
let keyListener: GlobalKeyboardListener | undefined;

try {
  const { GlobalKeyboardListener: GKL } = require("node-global-key-listener");
  GlobalKeyboardListener = GKL;
} catch (error) {
  console.log(
    "node-global-key-listener not available, falling back to simulation"
  );
}

let tray: Tray;
let isTyping: boolean = false;
let typingTimeout: NodeJS.Timeout | undefined;
let animationInterval: NodeJS.Timeout | undefined;
let calendarService: CalendarService;
let authDialog: AuthDialog;
let eventsDialog: EventsDialog;
let trayPopup: TrayPopup;
let credentialsSetupDialog: CredentialsSetupDialog;
let isAlert: boolean = false;

const dogSprites: DogSprites = {
  sitting: createDogSprite("sitting"),
  running1: createDogSprite("running1"),
  standing: createDogSprite("standing"),
  alert: createDogSprite("alert"),
};

function createDogSprite(type: SpriteType): NativeImage | string {
  const spritePaths: Record<SpriteType, string> = {
    sitting: path.join(__dirname, "..", "assets", "dog-sitting.png"),
    running1: path.join(__dirname, "..", "assets", "dog-running.png"),
    standing: path.join(__dirname, "..", "assets", "dog-standing.png"),
    alert: path.join(__dirname, "..", "assets", "dog-sitting.png"), // Use sitting for alert, could add specific alert sprite
  };

  try {
    return nativeImage
      .createFromPath(spritePaths[type])
      .resize({ width: 24, height: 24 });
  } catch (error) {
    const emojiMap: Record<SpriteType, string> = {
      sitting: "🐕",
      running1: "🏃‍♂️🐕",
      standing: "🐕‍🦺",
      alert: "🚨🐕",
    };
    return emojiMap[type];
  }
}

function createTray(): void {
  const initialIcon = dogSprites.sitting;

  if (typeof initialIcon === "string") {
    const emptyIcon = nativeImage.createEmpty();
    tray = new Tray(emptyIcon);
    tray.setTitle(initialIcon);
  } else {
    tray = new Tray(initialIcon);
    tray.setTitle("");
  }

  tray.setToolTip(
    "Menu Bar Dog - I run when you type and remind you of events!"
  );

  // Left click handler
  tray.on("click", () => {
    console.log("Tray left-clicked");
    showGreeting();
  });

  // Right click handler - this should show the context menu automatically
  tray.on("right-click", () => {
    console.log("Tray right-clicked - context menu should appear");
    // Context menu is handled automatically by Electron, but let's ensure it's set
    updateContextMenu();
  });

  updateContextMenu();
  console.log("Tray created and context menu set");
}

function updateContextMenu(): void {
  console.log("=== Updating context menu ===");
  console.log("Calendar service exists:", !!calendarService);
  console.log(
    "Calendar service has credentials:",
    calendarService?.hasCredentials()
  );
  console.log(
    "Calendar service is authenticated:",
    calendarService?.isAuthenticated()
  );

  const menuItems = [
    {
      label: "Pet the dog 🐾",
      click: () => petDog(),
    },
    {
      label: "Make dog run",
      click: () => triggerTyping(),
    },
    { type: "separator" as const },
  ];

  // Calendar menu items - only add if calendarService is initialized
  if (calendarService && calendarService.isAuthenticated()) {
    console.log("✅ Adding authenticated calendar menu items");
    menuItems.push(
      {
        label: "View upcoming events 📅",
        click: () => showUpcomingEvents(),
      },
      {
        label: "Disconnect calendar",
        click: () => disconnectCalendar(),
      }
    );
  } else if (calendarService) {
    console.log("➕ Adding connect calendar menu item");
    menuItems.push({
      label: "Connect Google Calendar 📅",
      click: () => connectCalendar(),
    });
  } else {
    console.log("⚠️ Calendar service not initialized yet");
  }

  menuItems.push(
    { type: "separator" as const },
    { label: "Quit", click: () => app.quit() }
  );

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
  console.log(`✅ Context menu set with ${menuItems.length} items`);
}

async function connectCalendar(): Promise<void> {
  console.log("=== connectCalendar() called ===");
  console.log("Calendar service exists:", !!calendarService);
  console.log(
    "Calendar service has credentials:",
    calendarService?.hasCredentials()
  );
  console.log(
    "Calendar service is authenticated:",
    calendarService?.isAuthenticated()
  );

  try {
    // First check if credentials exist
    if (!calendarService.hasCredentials()) {
      console.log("No credentials found, showing setup dialog");
      const choice = await credentialsSetupDialog.show();

      if (choice === "use-developer") {
        console.log("User chose quick setup");
        // Create bundled credentials for easy setup
        await createBundledCredentials();

        // Check if credentials were successfully created
        if (!calendarService.hasCredentials()) {
          console.error("Failed to create bundled credentials");
          return;
        }
        console.log("Bundled credentials created, continuing with auth flow");
      } else if (choice === "setup-own") {
        console.log("User chose advanced setup");
        // Show the detailed setup guide
        await showDetailedSetupGuide();
        return;
      } else {
        console.log("User cancelled credentials setup");
        // User cancelled
        return;
      }
    } else {
      console.log("Credentials already exist, checking authentication status");
      if (calendarService.isAuthenticated()) {
        console.log("Already authenticated! Showing current connection status");
        // Already connected, maybe show a status or allow reconnection
        if (typeof dogSprites.sitting === "string") {
          tray.setTitle("🐕 📅 Already Connected!");
        } else {
          tray.setTitle("📅 Already Connected!");
        }

        setTimeout(() => {
          restoreOriginalState(getCurrentDogState());
        }, 2000);
        return;
      }
    }

    console.log("Getting auth URL from calendar service");
    const authUrl = calendarService.getAuthUrl();
    if (!authUrl) {
      console.error("Failed to get auth URL - credentials may be invalid");
      return;
    }

    console.log("Showing auth dialog");
    const code = await authDialog.show(authUrl);
    console.log("Received auth code, attempting authentication");

    const success = await calendarService.authenticateWithCode(code);

    if (success) {
      console.log("Calendar connected successfully!");
      updateContextMenu();

      // Show a quick success message
      if (typeof dogSprites.sitting === "string") {
        tray.setTitle("🐕 📅 Connected!");
      } else {
        tray.setTitle("📅 Connected!");
      }

      setTimeout(() => {
        restoreOriginalState(getCurrentDogState());
      }, 3000);
    } else {
      console.error("Failed to authenticate with Google Calendar");
    }
  } catch (error) {
    console.error("Calendar authentication cancelled or failed:", error);
  }
}

async function createBundledCredentials(): Promise<void> {
  const fs = require("fs");
  const path = require("path");

  const credentialsPath = path.join(__dirname, "..", "credentials.json");
  console.log("Looking for credentials at:", credentialsPath);

  // In development, credentials.json should already exist in the project root
  // In production (DMG), credentials should be in app resources
  let bundledCredentials;
  let credentialsSource = "";

  // First try the current credentials.json (development)
  if (fs.existsSync(credentialsPath)) {
    try {
      bundledCredentials = fs.readFileSync(credentialsPath, "utf8");
      credentialsSource = "existing file";
      console.log("✅ Using existing credentials.json file");
    } catch (error) {
      console.error("Error reading existing credentials:", error);
    }
  }

  // If no existing credentials, try app resources (production DMG)
  if (!bundledCredentials) {
    const bundledCredentialsPath = path.join(
      process.resourcesPath,
      "credentials.json"
    );
    console.log("Checking app resources at:", bundledCredentialsPath);

    if (fs.existsSync(bundledCredentialsPath)) {
      try {
        bundledCredentials = fs.readFileSync(bundledCredentialsPath, "utf8");
        credentialsSource = "app resources";
        console.log("✅ Using bundled credentials from app resources");

        // Copy to the expected location
        fs.writeFileSync(credentialsPath, bundledCredentials);
      } catch (error) {
        console.error("Error copying bundled credentials:", error);
      }
    }
  }

  // If still no credentials, create placeholders
  if (!bundledCredentials) {
    console.log("No bundled credentials found, creating placeholders");
    const placeholderCredentials = createPlaceholderCredentials();
    fs.writeFileSync(
      credentialsPath,
      JSON.stringify(placeholderCredentials, null, 2)
    );

    console.log(
      "⚠️  Created placeholder credentials - you'll need to add your own API keys"
    );
    // Show setup guide since we only have placeholders
    await showDetailedSetupGuide();
    return;
  }

  console.log(
    `Credentials loaded from ${credentialsSource}, reinitializing calendar service`
  );

  // Reinitialize the calendar service with the new credentials
  const initialized = await calendarService.initialize();
  if (initialized) {
    console.log("✅ Calendar service reinitialized successfully");
  } else {
    console.error("❌ Failed to reinitialize calendar service");
  }
}

function createPlaceholderCredentials() {
  return {
    installed: {
      client_id: "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
      project_id: "your-project-id",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "YOUR_ACTUAL_CLIENT_SECRET",
      redirect_uris: ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
    },
  };
}

async function showDetailedSetupGuide(): Promise<void> {
  const { shell } = require("electron");
  const path = require("path");

  // Try to open the setup guide from the app's resources
  const setupPath = path.join(
    process.resourcesPath,
    "GOOGLE_CALENDAR_SETUP.md"
  );

  try {
    await shell.openPath(setupPath);
  } catch (error) {
    // Fallback: open the online documentation
    await shell.openExternal(
      "https://developers.google.com/calendar/api/quickstart/nodejs"
    );
  }
}

function disconnectCalendar(): void {
  calendarService.disconnect();
  updateContextMenu();

  // Show disconnection message
  if (typeof dogSprites.sitting === "string") {
    tray.setTitle("🐕 📅 Disconnected");
  } else {
    tray.setTitle("📅 Disconnected");
  }

  setTimeout(() => {
    restoreOriginalState(getCurrentDogState());
  }, 2000);
}

async function showUpcomingEvents(): Promise<void> {
  const events = await calendarService.getUpcomingEvents();
  eventsDialog.show(events);
}

function showGreeting(): void {
  const originalState = getCurrentDogState();

  if (typeof dogSprites.sitting === "string") {
    tray.setTitle("🐕 Hi!");
  } else {
    tray.setImage(dogSprites.sitting as NativeImage);
    tray.setTitle("Hi!");
  }

  setTimeout(() => {
    restoreOriginalState(originalState);
    if (typeof dogSprites.sitting === "string") {
      tray.setTitle("");
    }
  }, 2000);
}

function petDog(): void {
  const originalState = getCurrentDogState();

  if (typeof dogSprites.sitting === "string") {
    tray.setTitle("🐕 ❤️");
  } else {
    tray.setImage(dogSprites.sitting as NativeImage);
    tray.setTitle("❤️");
  }

  setTimeout(() => {
    restoreOriginalState(originalState);
    if (typeof dogSprites.sitting === "string") {
      tray.setTitle("");
    }
  }, 2000);
}

function getCurrentDogState(): DogState {
  if (isAlert) return "alert";
  return isTyping ? "running" : "sitting";
}

function restoreOriginalState(state: DogState): void {
  if (state === "running") {
    startRunningAnimation();
  } else if (state === "alert") {
    startAlertAnimation();
  } else {
    stopRunningAnimation();
  }
}

function startRunningAnimation(): void {
  if (animationInterval) return;

  let frame = 0;
  animationInterval = setInterval(() => {
    const sprite = frame % 2 === 0 ? dogSprites.running1 : dogSprites.standing;

    if (typeof sprite === "string") {
      tray.setTitle(sprite);
    } else {
      tray.setImage(sprite as NativeImage);
      tray.setTitle("");
    }

    frame++;
  }, 500);
}

function startAlertAnimation(): void {
  if (animationInterval) return;

  let frame = 0;
  animationInterval = setInterval(() => {
    const sprite = frame % 2 === 0 ? dogSprites.alert : dogSprites.sitting;

    if (typeof sprite === "string") {
      tray.setTitle(sprite);
    } else {
      tray.setImage(sprite as NativeImage);
      tray.setTitle("");
    }

    frame++;
  }, 750); // Slower blinking for alert
}

function stopRunningAnimation(): void {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = undefined;
  }

  if (typeof dogSprites.sitting === "string") {
    tray.setTitle(dogSprites.sitting);
  } else {
    tray.setImage(dogSprites.sitting as NativeImage);
    tray.setTitle("");
  }
}

function triggerTyping(): void {
  if (isAlert) return; // Don't interrupt alert mode

  isTyping = true;
  startRunningAnimation();

  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  typingTimeout = setTimeout(() => {
    isTyping = false;
    stopRunningAnimation();
  }, 3000);
}

function triggerAlert(): void {
  isAlert = true;
  startAlertAnimation();

  // Alert mode lasts for 30 seconds
  setTimeout(() => {
    isAlert = false;
    restoreOriginalState(getCurrentDogState());
  }, 30000);
}

function setupTypingDetection(): void {
  if (GlobalKeyboardListener) {
    keyListener = new GlobalKeyboardListener();

    keyListener.addListener(function (e: IGlobalKeyEvent) {
      if (e.state === "DOWN" && e.name) {
        const excludedKeys = [
          "LEFT CTRL",
          "RIGHT CTRL",
          "LEFT SHIFT",
          "RIGHT SHIFT",
          "LEFT ALT",
          "RIGHT ALT",
          "LEFT META",
          "RIGHT META",
          "CAPS LOCK",
          "TAB",
          "ESCAPE",
        ];

        if (!excludedKeys.includes(e.name)) {
          triggerTyping();
        }
      }
    });

    console.log("Real typing detection enabled");
  } else {
    console.log("Using simulated typing detection");
    setInterval(() => {
      if (!isTyping && !isAlert && Math.random() < 0.15) {
        triggerTyping();
      }
    }, 2000);
  }
}

async function setupCalendarIntegration(): Promise<void> {
  // Set up the reminder callback to show tray popup
  calendarService.setReminderCallback((event, minutesUntil) => {
    // Show the tray popup reminder
    trayPopup.showReminder(event.summary, minutesUntil, event.location);

    // Trigger alert mode on the dog
    triggerAlert();

    console.log(
      `Tray reminder shown for: ${event.summary} in ${minutesUntil} minutes`
    );
  });

  const initialized = await calendarService.initialize();
  if (initialized) {
    console.log("Calendar service initialized successfully");

    // Update context menu now that calendar is connected
    updateContextMenu();

    // Check for immediate upcoming events and show alert if needed
    const nextEvent = await calendarService.getNextEvent();
    if (nextEvent) {
      const now = new Date();
      const timeUntilEvent = nextEvent.start.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeUntilEvent / (1000 * 60));

      if (minutesUntil <= 15 && minutesUntil > 0) {
        triggerAlert();
      }
    }
  } else {
    console.log(
      "Calendar service not initialized - credentials may be missing"
    );
    // Update context menu to show connect option
    updateContextMenu();
  }
}

app.whenReady().then(async () => {
  // Initialize calendar services first
  calendarService = new CalendarService();
  authDialog = new AuthDialog();
  eventsDialog = new EventsDialog();
  credentialsSetupDialog = new CredentialsSetupDialog();

  createTray();

  // Initialize tray popup after tray is created
  trayPopup = new TrayPopup(tray);

  setupTypingDetection();

  // Then initialize calendar integration
  await setupCalendarIntegration();

  if (process.platform === "darwin") {
    app.dock.hide();
  }
});

app.on("window-all-closed", () => {
  // Keep the app running even when all windows are closed
});

app.on("before-quit", () => {
  if (animationInterval) {
    clearInterval(animationInterval);
  }
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  if (keyListener) {
    keyListener.kill();
  }
  if (authDialog) {
    authDialog.close();
  }
  if (eventsDialog) {
    eventsDialog.close();
  }
  if (trayPopup) {
    trayPopup.close();
  }
  if (credentialsSetupDialog) {
    credentialsSetupDialog.close();
  }
});
