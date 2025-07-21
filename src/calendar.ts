import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import * as notifier from "node-notifier";

interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

interface CalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class CalendarService {
  private oAuth2Client: OAuth2Client | null = null;
  private calendar: calendar_v3.Calendar | null = null;
  private config: CalendarConfig | null = null;
  private tokenPath: string;
  private credentialsPath: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private notifiedEvents: Set<string> = new Set();

  constructor() {
    this.tokenPath = path.join(__dirname, "..", "token.json");
    this.credentialsPath = path.join(__dirname, "..", "credentials.json");
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if credentials file exists
      if (!fs.existsSync(this.credentialsPath)) {
        console.log(
          "Google Calendar credentials not found. Please add credentials.json file."
        );
        return false;
      }

      // Load credentials
      const credentials = JSON.parse(
        fs.readFileSync(this.credentialsPath, "utf8")
      );

      if (!credentials.installed && !credentials.web) {
        console.log(
          "Invalid credentials format. Please use OAuth2 credentials."
        );
        return false;
      }

      const clientInfo = credentials.installed || credentials.web;
      this.config = {
        clientId: clientInfo.client_id,
        clientSecret: clientInfo.client_secret,
        redirectUri:
          clientInfo.redirect_uris?.[0] || "urn:ietf:wg:oauth:2.0:oob",
      };

      // Initialize OAuth2 client
      this.oAuth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        this.config.redirectUri
      );

      // Try to load existing token
      if (fs.existsSync(this.tokenPath)) {
        const token = JSON.parse(fs.readFileSync(this.tokenPath, "utf8"));
        this.oAuth2Client.setCredentials(token);

        // Verify token is still valid
        try {
          await this.oAuth2Client.getAccessToken();
          this.calendar = google.calendar({
            version: "v3",
            auth: this.oAuth2Client,
          });
          this.startEventChecking();
          return true;
        } catch (error) {
          console.log("Stored token is invalid, need to re-authenticate");
          fs.unlinkSync(this.tokenPath);
        }
      }

      return false;
    } catch (error) {
      console.error("Failed to initialize calendar service:", error);
      return false;
    }
  }

  getAuthUrl(): string | null {
    if (!this.oAuth2Client) return null;

    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    return authUrl;
  }

  async authenticateWithCode(code: string): Promise<boolean> {
    if (!this.oAuth2Client) return false;

    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);

      // Save token for future use
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));

      this.calendar = google.calendar({
        version: "v3",
        auth: this.oAuth2Client,
      });
      this.startEventChecking();

      return true;
    } catch (error) {
      console.error("Authentication failed:", error);
      return false;
    }
  }

  async getUpcomingEvents(maxResults: number = 10): Promise<CalendarEvent[]> {
    if (!this.calendar) return [];

    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

      const response = await this.calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: endTime.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];

      return events
        .filter((event) => event.start?.dateTime || event.start?.date)
        .map((event) => ({
          id: event.id!,
          summary: event.summary || "No title",
          start: new Date(event.start!.dateTime || event.start!.date!),
          end: new Date(event.end!.dateTime || event.end!.date!),
          description: event.description || undefined,
          location: event.location || undefined,
        }));
    } catch (error) {
      console.error("Failed to fetch events:", error);
      return [];
    }
  }

  private startEventChecking(): void {
    // Check for upcoming events every 5 minutes
    this.checkInterval = setInterval(async () => {
      await this.checkForUpcomingEvents();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkForUpcomingEvents();
  }

  private async checkForUpcomingEvents(): Promise<void> {
    const events = await this.getUpcomingEvents();
    const now = new Date();

    for (const event of events) {
      const timeUntilEvent = event.start.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeUntilEvent / (1000 * 60));

      // Notify for events starting in 15 minutes or less (but not past events)
      if (
        minutesUntil <= 15 &&
        minutesUntil > 0 &&
        !this.notifiedEvents.has(event.id)
      ) {
        this.sendEventNotification(event, minutesUntil);
        this.notifiedEvents.add(event.id);

        // Clean up old notifications after 1 hour
        setTimeout(() => {
          this.notifiedEvents.delete(event.id);
        }, 60 * 60 * 1000);
      }
    }
  }

  private sendEventNotification(
    event: CalendarEvent,
    minutesUntil: number
  ): void {
    const title = "🐕 Calendar Reminder";
    const message = `${event.summary} starts in ${minutesUntil} minute${
      minutesUntil !== 1 ? "s" : ""
    }`;

    notifier.notify({
      title,
      message,
      sound: true,
      wait: false,
      timeout: 10,
    });

    console.log(`Notification sent: ${message}`);
  }

  isAuthenticated(): boolean {
    return this.calendar !== null;
  }

  disconnect(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }

    this.oAuth2Client = null;
    this.calendar = null;
    this.notifiedEvents.clear();
  }

  async getNextEvent(): Promise<CalendarEvent | null> {
    const events = await this.getUpcomingEvents(1);
    return events.length > 0 ? events[0] : null;
  }
}
