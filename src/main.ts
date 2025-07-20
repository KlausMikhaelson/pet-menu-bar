import { app, Tray, Menu, nativeImage, NativeImage } from "electron";
import * as path from "path";

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
}

type DogState = "sitting" | "running";
type SpriteType = "sitting" | "running1" | "standing";

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

const dogSprites: DogSprites = {
  sitting: createDogSprite("sitting"),
  running1: createDogSprite("running1"),
  standing: createDogSprite("standing"),
};

function createDogSprite(type: SpriteType): NativeImage | string {
  const spritePaths: Record<SpriteType, string> = {
    sitting: path.join(__dirname, "..", "assets", "dog-sitting.png"),
    running1: path.join(__dirname, "..", "assets", "dog-running.png"),
    standing: path.join(__dirname, "..", "assets", "dog-standing.png"),
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

  tray.setToolTip("Menu Bar Dog - I run when you type!");

  tray.on("click", () => {
    showGreeting();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Pet the dog 🐾",
      click: () => petDog(),
    },
    {
      label: "Make dog run",
      click: () => triggerTyping(),
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
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
  return isTyping ? "running" : "sitting";
}

function restoreOriginalState(state: DogState): void {
  if (state === "running") {
    startRunningAnimation();
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
      if (!isTyping && Math.random() < 0.15) {
        triggerTyping();
      }
    }, 2000);
  }
}

app.whenReady().then(() => {
  createTray();
  setupTypingDetection();

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
});
