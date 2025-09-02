import * as fs from "fs";
import * as path from "path";

interface CalendarEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  organizer: string;
  attendees: string[];
  status: string;
  created: string;
  lastModified: string;
}

class ICStoCSVConverter {
  private parseDateTime(dateTimeStr: string): {
    date: string;
    time: string;
    allDay: boolean;
  } {
    if (!dateTimeStr) return { date: "", time: "", allDay: false };

    // Check if it's a date-only event (VALUE=DATE format)
    if (dateTimeStr.length === 8) {
      const year = dateTimeStr.substring(0, 4);
      const month = dateTimeStr.substring(4, 6);
      const day = dateTimeStr.substring(6, 8);
      return {
        date: `${year}-${month}-${day}`,
        time: "",
        allDay: true,
      };
    }

    // Parse full datetime (YYYYMMDDTHHMMSSZ format)
    if (dateTimeStr.includes("T")) {
      const [datePart, timePart] = dateTimeStr.split("T");
      const year = datePart.substring(0, 4);
      const month = datePart.substring(4, 6);
      const day = datePart.substring(6, 8);

      const hour = timePart.substring(0, 2);
      const minute = timePart.substring(2, 4);

      return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}`,
        allDay: false,
      };
    }

    return { date: dateTimeStr, time: "", allDay: false };
  }

  private cleanText(text: string): string {
    if (!text) return "";

    // Remove line breaks and extra whitespace
    return text
      .replace(/\\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/\r/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractEmail(organizerStr: string): string {
    if (!organizerStr) return "";

    const emailMatch = organizerStr.match(/mailto:([^;]+)/);
    return emailMatch ? emailMatch[1] : "";
  }

  private parseAttendees(lines: string[]): string[] {
    const attendees: string[] = [];

    for (const line of lines) {
      if (line.startsWith("ATTENDEE")) {
        const emailMatch = line.match(/mailto:([^;]+)/);
        if (emailMatch) {
          attendees.push(emailMatch[1]);
        }
      }
    }

    return attendees;
  }

  public parseICS(icsContent: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const lines = icsContent.split(/\r?\n/);

    let currentEvent: Partial<CalendarEvent> = {};
    let inEvent = false;
    let currentProperty = "";
    let currentValue = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "BEGIN:VEVENT") {
        inEvent = true;
        currentEvent = {
          uid: "",
          summary: "",
          description: "",
          location: "",
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          allDay: false,
          organizer: "",
          attendees: [],
          status: "",
          created: "",
          lastModified: "",
        };
        continue;
      }

      if (line === "END:VEVENT" && inEvent) {
        // Finalize current event
        if (currentProperty && currentValue) {
          this.setEventProperty(currentEvent, currentProperty, currentValue);
        }

        events.push(currentEvent as CalendarEvent);
        inEvent = false;
        currentProperty = "";
        currentValue = "";
        continue;
      }

      if (!inEvent) continue;

      // Handle line continuation (lines starting with space or tab)
      if (line.startsWith(" ") || line.startsWith("\t")) {
        currentValue += line.substring(1);
        continue;
      }

      // Process previous property if we have one
      if (currentProperty && currentValue) {
        this.setEventProperty(currentEvent, currentProperty, currentValue);
      }

      // Parse new property
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      currentProperty = line.substring(0, colonIndex);
      currentValue = line.substring(colonIndex + 1);

      // Handle properties with parameters (e.g., DTSTART;VALUE=DATE:20260306)
      const semicolonIndex = currentProperty.indexOf(";");
      if (semicolonIndex !== -1) {
        currentProperty = currentProperty.substring(0, semicolonIndex);
      }
    }

    return events;
  }

  private setEventProperty(
    event: Partial<CalendarEvent>,
    property: string,
    value: string
  ): void {
    switch (property) {
      case "UID":
        event.uid = value;
        break;
      case "SUMMARY":
        event.summary = this.cleanText(value);
        break;
      case "DESCRIPTION":
        event.description = this.cleanText(value);
        break;
      case "LOCATION":
        event.location = this.cleanText(value);
        break;
      case "DTSTART":
        const startParsed = this.parseDateTime(value);
        event.startDate = startParsed.date;
        event.startTime = startParsed.time;
        event.allDay = startParsed.allDay;
        break;
      case "DTEND":
        const endParsed = this.parseDateTime(value);
        event.endDate = endParsed.date;
        event.endTime = endParsed.time;
        break;
      case "ORGANIZER":
        event.organizer = this.extractEmail(value);
        break;
      case "STATUS":
        event.status = value;
        break;
      case "CREATED":
        event.created = this.parseDateTime(value).date;
        break;
      case "LAST-MODIFIED":
        event.lastModified = this.parseDateTime(value).date;
        break;
    }
  }

  public convertToCSV(events: CalendarEvent[]): string {
    const headers = [
      "UID",
      "Summary",
      "Description",
      "Location",
      "Start Date",
      "End Date",
      "Start Time",
      "End Time",
      "All Day",
      "Organizer",
      "Attendees",
      "Status",
      "Created",
      "Last Modified",
    ];

    const csvLines: string[] = [headers.join(",")];

    for (const event of events) {
      const row = [
        this.escapeCsvField(event.uid),
        this.escapeCsvField(event.summary),
        this.escapeCsvField(event.description),
        this.escapeCsvField(event.location),
        this.escapeCsvField(event.startDate),
        this.escapeCsvField(event.endDate),
        this.escapeCsvField(event.startTime),
        this.escapeCsvField(event.endTime),
        event.allDay ? "Yes" : "No",
        this.escapeCsvField(event.organizer),
        this.escapeCsvField(event.attendees?.join("; ") || ""),
        this.escapeCsvField(event.status),
        this.escapeCsvField(event.created),
        this.escapeCsvField(event.lastModified),
      ];

      csvLines.push(row.join(","));
    }

    return csvLines.join("\n");
  }

  private escapeCsvField(field: string): string {
    if (!field) return '""';

    // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (field.includes(",") || field.includes("\n") || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }

    return `"${field}"`;
  }

  public convertFile(inputPath: string, outputPath?: string): void {
    try {
      // Read ICS file
      const icsContent = fs.readFileSync(inputPath, "utf-8");

      // Parse events
      const events = this.parseICS(icsContent);
      console.log(`Parsed ${events.length} events from ICS file`);

      // Convert to CSV
      const csvContent = this.convertToCSV(events);

      // Determine output path
      const output = outputPath || inputPath.replace(/\.ics$/i, ".csv");

      // Write CSV file
      fs.writeFileSync(output, csvContent, "utf-8");
      console.log(`CSV file created: ${output}`);

      // Print summary
      console.log("\nEvent Summary:");
      events.forEach((event, index) => {
        console.log(
          `${index + 1}. ${event.summary} - ${event.startDate} ${
            event.startTime || "(All Day)"
          }`
        );
      });
    } catch (error) {
      console.error("Error converting file:", error);
    }
  }
}

// CLI usage
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      "Usage: ts-node ics-to-csv-converter.ts <input.ics> [output.csv]"
    );
    console.log(
      "Example: ts-node ics-to-csv-converter.ts calendar.ics events.csv"
    );
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const converter = new ICStoCSVConverter();
  converter.convertFile(inputFile, outputFile);
}

// Export for library usage
export { ICStoCSVConverter, CalendarEvent };

// Run if called directly
if (require.main === module) {
  main();
}
