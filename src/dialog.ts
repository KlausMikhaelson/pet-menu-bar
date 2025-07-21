import { BrowserWindow, shell, ipcMain, screen, Tray } from "electron";
import * as path from "path";

export class AuthDialog {
  private window: BrowserWindow | null = null;

  constructor() {}

  show(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.window = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
        title: "Connect Google Calendar",
        modal: true,
        resizable: false,
        autoHideMenuBar: true,
      });

      // Create a simple HTML page for authentication
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Calendar Authentication</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: #1a1a1a;
              color: #ffffff;
              text-align: center;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              background: rgba(255, 255, 255, 0.1);
              padding: 30px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
              border: 1px solid #333333;
            }
            h1 {
              margin-bottom: 20px;
              font-size: 24px;
              color: #ffc107;
            }
            .dog-emoji {
              font-size: 48px;
              margin-bottom: 20px;
            }
            p {
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .auth-button {
              background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%);
              color: #000000;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              margin-bottom: 20px;
              font-weight: 600;
            }
            .auth-button:hover {
              background: linear-gradient(135deg, #ffca28 0%, #ff9800 100%);
            }
            .code-input {
              width: 100%;
              padding: 12px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              margin-bottom: 10px;
              box-sizing: border-box;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border: 1px solid #333333;
            }
            .submit-button {
              background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%);
              color: #000000;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              width: 100%;
              font-weight: 600;
            }
            .submit-button:hover {
              background: linear-gradient(135deg, #ffca28 0%, #ff9800 100%);
            }
            .step {
              margin-bottom: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="dog-emoji">🐕</div>
            <h1>Connect Google Calendar</h1>
            
            <div class="step">
              <p><strong>Step 1:</strong> Click the button below to open Google's authorization page</p>
              <button class="auth-button" onclick="openAuth()">Authorize Calendar Access</button>
            </div>
            
            <div class="step">
              <p><strong>Step 2:</strong> Copy the authorization code and paste it below</p>
              <input type="text" class="code-input" id="authCode" placeholder="Paste authorization code here" />
              <button class="submit-button" onclick="submitCode()">Connect Calendar</button>
            </div>
          </div>

          <script>
            const { shell, ipcRenderer } = require('electron');
            
            function openAuth() {
              shell.openExternal('${authUrl}');
            }
            
            function submitCode() {
              const code = document.getElementById('authCode').value.trim();
              if (code) {
                ipcRenderer.send('auth-code', code);
              }
            }
            
            // Handle Enter key in input
            document.getElementById('authCode').addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                submitCode();
              }
            });
          </script>
        </body>
        </html>
      `;

      this.window.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
      );

      // Set up IPC listener for this specific dialog
      const authCodeHandler = (event: any, code: string) => {
        resolve(code);
        ipcMain.off("auth-code", authCodeHandler);
        this.close();
      };

      ipcMain.on("auth-code", authCodeHandler);

      this.window.on("closed", () => {
        this.window = null;
        ipcMain.off("auth-code", authCodeHandler);
        reject(new Error("Authentication dialog was closed"));
      });
    });
  }

  close(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}

export class CredentialsSetupDialog {
  private window: BrowserWindow | null = null;

  constructor() {}

  show(): Promise<"use-developer" | "setup-own" | "cancel"> {
    return new Promise((resolve, reject) => {
      this.window = new BrowserWindow({
        width: 650,
        height: 750,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
        title: "Setup Google Calendar",
        modal: true,
        resizable: false,
        autoHideMenuBar: true,
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Setup Google Calendar</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 30px;
              background: #1a1a1a;
              color: #ffffff;
              line-height: 1.6;
            }
            .container {
              max-width: 550px;
              margin: 0 auto;
              background: rgba(255, 255, 255, 0.05);
              padding: 30px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
              border: 1px solid #333333;
            }
            h1 {
              text-align: center;
              margin-bottom: 20px;
              font-size: 28px;
              color: #ffc107;
            }
            .dog-emoji {
              text-align: center;
              font-size: 48px;
              margin-bottom: 20px;
            }
            .option-card {
              background: rgba(255, 255, 255, 0.03);
              padding: 25px;
              border-radius: 12px;
              margin-bottom: 20px;
              border: 1px solid #333333;
              transition: all 0.3s ease;
            }
            .option-card:hover {
              border-color: #ffc107;
              background: rgba(255, 193, 7, 0.05);
            }
            .option-title {
              font-weight: 600;
              font-size: 18px;
              margin-bottom: 10px;
              color: #ffc107;
              display: flex;
              align-items: center;
            }
            .option-icon {
              font-size: 24px;
              margin-right: 10px;
            }
            .option-description {
              color: #cccccc;
              margin-bottom: 15px;
            }
            .pros-cons {
              font-size: 13px;
              margin-bottom: 15px;
            }
            .pros {
              color: #4caf50;
            }
            .cons {
              color: #ff9800;
            }
            .button {
              background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%);
              color: #000000;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              margin: 5px 10px 5px 0;
              font-weight: 600;
              transition: all 0.2s ease;
              width: 100%;
              text-align: center;
            }
            .button:hover {
              background: linear-gradient(135deg, #ffca28 0%, #ff9800 100%);
              transform: translateY(-1px);
            }
            .button-secondary {
              background: rgba(255, 255, 255, 0.1);
              color: #ffffff;
              border: 1px solid #333333;
            }
            .button-secondary:hover {
              background: rgba(255, 255, 255, 0.15);
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #333333;
            }
            .recommended {
              position: absolute;
              top: -8px;
              right: 15px;
              background: #ffc107;
              color: #000000;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            }
            .option-card {
              position: relative;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="dog-emoji">🐕</div>
            <h1>Connect Google Calendar</h1>
            
            <p style="text-align: center; color: #cccccc; margin-bottom: 30px;">
              Choose how you'd like to connect your Google Calendar:
            </p>
            
            <div class="option-card">
              <div class="recommended">Recommended</div>
              <div class="option-title">
                <span class="option-icon">⚡</span>
                Quick Setup (Use Developer Credentials)
              </div>
              <div class="option-description">
                Use the app developer's Google API credentials for instant setup. Perfect for most users.
              </div>
              <div class="pros-cons">
                <div class="pros">✅ Works immediately</div>
                <div class="pros">✅ No technical setup required</div>
                <div class="cons">⚠️ Shared API quota with other users</div>
              </div>
              <button class="button" onclick="useDeveloperCredentials()">
                🚀 Quick Setup
              </button>
            </div>
            
            <div class="option-card">
              <div class="option-title">
                <span class="option-icon">🔧</span>
                Advanced Setup (Your Own Credentials)
              </div>
              <div class="option-description">
                Create your own Google Cloud project and API credentials. Recommended for power users.
              </div>
              <div class="pros-cons">
                <div class="pros">✅ Your own private API quota</div>
                <div class="pros">✅ Full control over permissions</div>
                <div class="cons">⚠️ Requires technical setup</div>
              </div>
              <button class="button button-secondary" onclick="setupOwnCredentials()">
                ⚙️ Advanced Setup
              </button>
            </div>
            
            <div class="footer">
              <button class="button button-secondary" onclick="window.close()" style="width: auto;">
                I'll Set This Up Later
              </button>
            </div>
          </div>

          <script>
            const { ipcRenderer } = require('electron');
            
            function useDeveloperCredentials() {
              ipcRenderer.send('credentials-choice', 'use-developer');
            }
            
            function setupOwnCredentials() {
              ipcRenderer.send('credentials-choice', 'setup-own');
            }
          </script>
        </body>
        </html>
      `;

      this.window.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
      );

      // Set up IPC listener for user choice
      const choiceHandler = (event: any, choice: string) => {
        ipcMain.off("credentials-choice", choiceHandler);
        this.close();
        resolve(choice as "use-developer" | "setup-own" | "cancel");
      };

      ipcMain.on("credentials-choice", choiceHandler);

      this.window.on("closed", () => {
        this.window = null;
        ipcMain.off("credentials-choice", choiceHandler);
        resolve("cancel");
      });
    });
  }

  close(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}

export class EventsDialog {
  private window: BrowserWindow | null = null;

  show(events: any[]): void {
    if (this.window) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 600,
      height: 400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      title: "Upcoming Events",
      resizable: true,
      autoHideMenuBar: true,
    });

    const eventsHtml =
      events.length > 0
        ? events
            .map(
              (event) => `
          <div class="event">
            <div class="event-title">${event.summary}</div>
            <div class="event-time">${new Date(
              event.start
            ).toLocaleString()}</div>
            ${
              event.location
                ? `<div class="event-location">📍 ${event.location}</div>`
                : ""
            }
          </div>
        `
            )
            .join("")
        : '<div class="no-events">No upcoming events in the next 24 hours 🐕</div>';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Upcoming Events</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 30px;
            background: #1a1a1a;
            color: #ffffff;
            min-height: 100vh;
            background-image: 
              radial-gradient(circle at 20% 50%, rgba(255, 193, 7, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 193, 7, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(255, 193, 7, 0.08) 0%, transparent 50%);
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 28px;
            font-weight: 700;
            color: #ffc107;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }
          .dog-emoji {
            text-align: center;
            font-size: 48px;
            margin-bottom: 25px;
            filter: drop-shadow(0 4px 8px rgba(255, 193, 7, 0.3));
            animation: float 3s ease-in-out infinite;
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-5px);
            }
          }
          
          .event {
            background: rgba(26, 26, 26, 0.95);
            margin-bottom: 16px;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #333333;
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
          }
          
          .event:hover {
            border-color: #ffc107;
            box-shadow: 
              0 12px 40px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 193, 7, 0.3);
            transform: translateY(-2px);
          }
          
          .event-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #ffffff;
            line-height: 1.4;
          }
          .event-time {
            font-size: 14px;
            color: #ffc107;
            margin-bottom: 8px;
            font-weight: 500;
            background: rgba(255, 193, 7, 0.1);
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
          }
          .event-location {
            font-size: 13px;
            color: #cccccc;
            background: rgba(255, 255, 255, 0.05);
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
          }
          .no-events {
            text-align: center;
            font-size: 18px;
            padding: 40px;
            background: rgba(26, 26, 26, 0.95);
            border: 1px solid #333333;
            border-radius: 12px;
            color: #cccccc;
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="dog-emoji">🐕</div>
          <h1>Upcoming Events</h1>
          ${eventsHtml}
        </div>
      </body>
      </html>
    `;

    this.window.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    );

    this.window.on("closed", () => {
      this.window = null;
    });
  }

  close(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}

export class TrayPopup {
  private window: BrowserWindow | null = null;
  private tray: Tray;

  constructor(tray: Tray) {
    this.tray = tray;
  }

  showReminder(
    eventName: string,
    minutesUntil: number,
    location?: string
  ): void {
    // Close existing popup if open
    if (this.window) {
      this.window.close();
    }

    const timeText =
      minutesUntil === 1 ? "1 minute" : `${minutesUntil} minutes`;
    const locationHtml = location
      ? `<div class="location">📍 ${location}</div>`
      : "";

    this.window = new BrowserWindow({
      width: 320,
      height: 200,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      show: false,
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Meeting Reminder</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 15px;
            background: #1a1a1a;
            color: #ffffff;
            border-radius: 12px;
            border: 1px solid #333333;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
            animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            backdrop-filter: blur(20px);
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-15px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #333333;
          }
          
          .dog-emoji {
            font-size: 24px;
            margin-right: 10px;
            animation: bounce 2s infinite;
            filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.3));
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-6px);
            }
            60% {
              transform: translateY(-3px);
            }
          }
          
          .title {
            font-size: 16px;
            font-weight: 600;
            color: #ffc107;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }
          
          .event-name {
            font-size: 15px;
            margin-bottom: 8px;
            font-weight: 500;
            color: #ffffff;
            line-height: 1.3;
          }
          
          .time-remaining {
            font-size: 13px;
            color: #ffc107;
            margin-bottom: 8px;
            font-weight: 500;
            background: rgba(255, 193, 7, 0.1);
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
          }
          
          .location {
            font-size: 11px;
            color: #cccccc;
            margin-bottom: 12px;
            background: rgba(255, 255, 255, 0.05);
            padding: 3px 6px;
            border-radius: 4px;
            display: inline-block;
          }
          
          .close-button {
            background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%);
            border: none;
            color: #000000;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            float: right;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
          }
          
          .close-button:hover {
            background: linear-gradient(135deg, #ffca28 0%, #ff9800 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 193, 7, 0.4);
          }
          
          .close-button:active {
            transform: translateY(0);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="dog-emoji">🚨🐕</div>
          <div class="title">Meeting Reminder</div>
        </div>
        <div class="event-name">${eventName}</div>
        <div class="time-remaining">Starts in ${timeText}</div>
        ${locationHtml}
        <button class="close-button" onclick="window.close()">Got it!</button>
      </body>
      </html>
    `;

    this.window.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    );

    // Position the popup near the tray icon
    this.window.once("ready-to-show", () => {
      this.positionNearTray();
      this.window?.show();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      this.close();
    }, 10000);

    this.window.on("closed", () => {
      this.window = null;
    });

    // Close when clicking outside (lose focus)
    this.window.on("blur", () => {
      setTimeout(() => {
        this.close();
      }, 100);
    });
  }

  private positionNearTray(): void {
    if (!this.window) return;

    try {
      const trayBounds = this.tray.getBounds();
      const windowBounds = this.window.getBounds();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } =
        primaryDisplay.workAreaSize;

      // Calculate position - center horizontally on tray icon, position below it
      let x = Math.round(
        trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
      );
      let y = trayBounds.y + trayBounds.height + 5; // 5px gap below tray

      // Ensure window stays on screen
      if (x < 0) x = 10;
      if (x + windowBounds.width > screenWidth)
        x = screenWidth - windowBounds.width - 10;
      if (y + windowBounds.height > screenHeight)
        y = trayBounds.y - windowBounds.height - 5;

      this.window.setPosition(x, y);
    } catch (error) {
      // Fallback to top-right corner if tray bounds are not available
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      this.window.setPosition(width - 340, 20);
    }
  }

  close(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}
