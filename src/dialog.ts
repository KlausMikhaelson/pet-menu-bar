import { BrowserWindow, shell, ipcMain } from "electron";
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              background: rgba(255, 255, 255, 0.1);
              padding: 30px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
            }
            h1 {
              margin-bottom: 20px;
              font-size: 24px;
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
              background: #4285f4;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              margin-bottom: 20px;
            }
            .auth-button:hover {
              background: #3367d6;
            }
            .code-input {
              width: 100%;
              padding: 12px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              margin-bottom: 10px;
              box-sizing: border-box;
            }
            .submit-button {
              background: #34a853;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              width: 100%;
            }
            .submit-button:hover {
              background: #2d7d32;
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
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 28px;
          }
          .dog-emoji {
            text-align: center;
            font-size: 48px;
            margin-bottom: 20px;
          }
          .event {
            background: rgba(255, 255, 255, 0.15);
            margin-bottom: 15px;
            padding: 20px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }
          .event-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .event-time {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 5px;
          }
          .event-location {
            font-size: 14px;
            opacity: 0.8;
          }
          .no-events {
            text-align: center;
            font-size: 18px;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
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
