const { app, Tray, Menu, nativeImage } = require("electron");
const path = require("path");

let GlobalKeyboardListener;
let keyListener;
try {
  const { GlobalKeyboardListener: GKL } = require("node-global-key-listener");
  GlobalKeyboardListener = GKL;
} catch (error) {
  console.log(
    "node-global-key-listener not available, falling back to simulation"
  );
}

let tray;
let isTyping = false;
let typingTimeout;
let animationInterval;

const dogSprites = {
  sitting: createDogSprite("sitting"),
  running1: createDogSprite("running1"),
  standing: createDogSprite("standing"),
};

function createDogSprite(type) {
  const spritePaths = {
    sitting: path.join(__dirname, "assets", "dog-sitting.png"),
    running1: path.join(__dirname, "assets", "dog-running.png"),
    standing: path.join(__dirname, "assets", "dog-standing.png"),
  };

  try {
    return nativeImage
      .createFromPath(spritePaths[type])
      .resize({ width: 24, height: 24 });
  } catch (error) {
    const emojiMap = {
      sitting: "🐕",
      running1: "🏃‍♂️🐕",
      standing: "🐕‍🦺",
    };
    return emojiMap[type];
  }
}

function createTray() {
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

function showGreeting() {
  const originalState = getCurrentDogState();

  if (typeof dogSprites.sitting === "string") {
    tray.setTitle("🐕 Hi!");
  } else {
    tray.setImage(dogSprites.sitting);
    tray.setTitle("Hi!");
  }

  setTimeout(() => {
    restoreOriginalState(originalState);
    if (typeof dogSprites.sitting === "string") {
      tray.setTitle("");
    }
  }, 2000);
}

function petDog() {
  const originalState = getCurrentDogState();

  if (typeof dogSprites.sitting === "string") {
    tray.setTitle("🐕 ❤️");
  } else {
    tray.setImage(dogSprites.sitting);
    tray.setTitle("❤️");
  }

  setTimeout(() => {
    restoreOriginalState(originalState);
    if (typeof dogSprites.sitting === "string") {
      tray.setTitle("");
    }
  }, 2000);
}

function getCurrentDogState() {
  return isTyping ? "running" : "sitting";
}

function restoreOriginalState(state) {
  if (state === "running") {
    startRunningAnimation();
  } else {
    stopRunningAnimation();
  }
}

function startRunningAnimation() {
  if (animationInterval) return;

  let frame = 0;
  animationInterval = setInterval(() => {
    const sprite = frame % 2 === 0 ? dogSprites.running1 : dogSprites.standing;

    if (typeof sprite === "string") {
      tray.setTitle(sprite);
    } else {
      tray.setImage(sprite);
      tray.setTitle("");
    }

    frame++;
  }, 500);
}

function stopRunningAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }

  if (typeof dogSprites.sitting === "string") {
    tray.setTitle(dogSprites.sitting);
  } else {
    tray.setImage(dogSprites.sitting);
    tray.setTitle("");
  }
}

function triggerTyping() {
  isTyping = true;
  startRunningAnimation();

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    stopRunningAnimation();
  }, 3000);
}

function setupTypingDetection() {
  if (GlobalKeyboardListener) {
    keyListener = new GlobalKeyboardListener();

    keyListener.addListener(function (e) {
      if (e.state === "DOWN" && e.name) {
        if (
          ![
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
          ].includes(e.name)
        ) {
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

app.on("window-all-closed", () => {});

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
