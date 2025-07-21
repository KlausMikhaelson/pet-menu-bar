import { app, Tray, Menu, nativeImage, NativeImage } from "electron";
import * as path from "path";
import { CalendarService } from "./calendar";
import { AuthDialog, EventsDialog } from "./dialog";

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
  console.log("Updating context menu...");
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
    console.log("Adding authenticated calendar menu items");
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
    console.log("Adding connect calendar menu item");
    menuItems.push({
      label: "Connect Google Calendar 📅",
      click: () => connectCalendar(),
    });
  } else {
    console.log("Calendar service not initialized yet");
  }

  menuItems.push(
    { type: "separator" as const },
    { label: "Quit", click: () => app.quit() }
  );

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
  console.log(`Context menu set with ${menuItems.length} items`);
}

async function connectCalendar(): Promise<void> {
  try {
    const authUrl = calendarService.getAuthUrl();
    if (!authUrl) {
      console.error("Failed to get auth URL");
      return;
    }

    const code = await authDialog.show(authUrl);
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

  createTray();
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
});
