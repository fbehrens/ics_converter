import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

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
  calendar: string; // Added calendar field
}

const parseDateTime = (
  dateTimeStr: string
): {
  date: string;
  time: string;
  allDay: boolean;
} => {
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
};

const cleanText = (text: string): string => {
  if (!text) return "";

  // Remove line breaks and extra whitespace
  return text
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const extractEmail = (organizerStr: string): string => {
  if (!organizerStr) return "";

  const emailMatch = organizerStr.match(/mailto:([^;]+)/);
  return emailMatch ? emailMatch[1] : "";
};

const parseAttendees = (lines: string[]): string[] => {
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
};

// nameUntil_
const extractCalendarName = (filename: string): string => {
  const baseName = path.basename(filename, path.extname(filename));
  const underscoreIndex = baseName.indexOf("_");
  if (underscoreIndex === -1) {
    return baseName; // No underscore found, return full name
  }
  return baseName.substring(0, underscoreIndex);
};

const parseICS = (
  icsContent: string,
  calendarName: string = ""
): CalendarEvent[] => {
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
        calendar: calendarName,
      };
      continue;
    }

    if (line === "END:VEVENT" && inEvent) {
      // Finalize current event
      if (currentProperty && currentValue) {
        setEventProperty(currentEvent, currentProperty, currentValue);
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
      setEventProperty(currentEvent, currentProperty, currentValue);
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
};

const setEventProperty = (
  event: Partial<CalendarEvent>,
  property: string,
  value: string
): void => {
  switch (property) {
    case "UID":
      event.uid = value;
      break;
    case "SUMMARY":
      event.summary = cleanText(value);
      break;
    case "DESCRIPTION":
      event.description = cleanText(value);
      break;
    case "LOCATION":
      event.location = cleanText(value);
      break;
    case "DTSTART":
      const startParsed = parseDateTime(value);
      event.startDate = startParsed.date;
      event.startTime = startParsed.time;
      event.allDay = startParsed.allDay;
      break;
    case "DTEND":
      const endParsed = parseDateTime(value);
      event.endDate = endParsed.date;
      event.endTime = endParsed.time;
      break;
    case "ORGANIZER":
      event.organizer = extractEmail(value);
      break;
    case "STATUS":
      event.status = value;
      break;
    case "CREATED":
      event.created = parseDateTime(value).date;
      break;
    case "LAST-MODIFIED":
      event.lastModified = parseDateTime(value).date;
      break;
  }
};

const convertToCSV = (events: CalendarEvent[], outputFile: string): void => {
  const headers = [
    "Calendar",
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
      escapeCsvField(event.calendar),
      escapeCsvField(event.uid),
      escapeCsvField(event.summary),
      escapeCsvField(event.description),
      escapeCsvField(event.location),
      escapeCsvField(event.startDate),
      escapeCsvField(event.endDate),
      escapeCsvField(event.startTime),
      escapeCsvField(event.endTime),
      event.allDay ? "Yes" : "No",
      escapeCsvField(event.organizer),
      escapeCsvField(event.attendees?.join("; ") || ""),
      escapeCsvField(event.status),
      escapeCsvField(event.created),
      escapeCsvField(event.lastModified),
    ];
    csvLines.push(row.join(","));
  }
  fs.writeFileSync(outputFile, csvLines.join("\n"), "utf-8");
};

// If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
const escapeCsvField = (field: string): string => {
  if (!field) return '""';
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return `"${field}"`;
};

const convertFolder = (folderPath: string): CalendarEvent[] => {
  const stats = fs.statSync(folderPath);
  let icsFiles: string[] = [];
  if (stats.isDirectory()) {
    const icsPattern = path.join(folderPath, "*.ics");
    icsFiles = glob.sync(icsPattern);
  } else if (stats.isFile()) {
    icsFiles = [folderPath];
  }
  let allEvents: CalendarEvent[] = [];
  for (const icsFile of icsFiles) {
    const icsContent = fs.readFileSync(icsFile, "utf-8");
    const calendarName = extractCalendarName(icsFile);
    const events = parseICS(icsContent, calendarName);

    allEvents = allEvents.concat(events);
  }

  allEvents.sort((a, b) => {
    const dateA = new Date(a.startDate + "T" + (a.startTime || "00:00"));
    const dateB = new Date(b.startDate + "T" + (b.startTime || "00:00"));
    return dateA.getTime() - dateB.getTime();
  });
  return allEvents;
};

// CLI usage
function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("ICS to CSV Converter");
    console.log("");
    console.log("Usage:");
    console.log(
      "  Single file: ts-node ics-to-csv-converter.ts <input.ics> [output.csv]"
    );
    console.log(
      "  Folder:      ts-node ics-to-csv-converter.ts <folder> [output.csv]"
    );
    console.log("");
    console.log("Examples:");
    console.log("  ts-node ics-to-csv-converter.ts calendar.ics events.csv");
    console.log("  ts-node ics-to-csv-converter.ts ./calendars/ combined.csv");
    console.log("  ts-node ics-to-csv-converter.ts ./calendars/");
    process.exit(1);
  }

  const inputPath = args[0];
  const outputFile = args[1];
  const events = convertFolder(inputPath);
  const calendarCounts = events.reduce((acc, event) => {
    acc[event.calendar] = (acc[event.calendar] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(calendarCounts).forEach(([calendar, count]) => {
    console.log(`  ${calendar}: ${count} events`);
  });

  convertToCSV(events, outputFile);
}

if (require.main === module) {
  main();
}
