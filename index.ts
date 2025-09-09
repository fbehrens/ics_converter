import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

interface Event {
  calendar: string;
  summary: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  description: string;
  location: string;
  organizer: string;
  attendees: string;
  status: string;
  created: string;
  lastModified: string;
  uid: string;
}

const Event = [
  "calendar",
  "summary",
  "allDay",
  "startDate",
  "startTime",
  "endDate",
  "endTime",
  "description",
  "location",
  "organizer",
  "attendees",
  "status",
  "created",
  "lastModified",
  "uid",
];

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

const parseAttendees = (lines: string[]): string => {
  const attendees: string[] = [];
  for (const line of lines) {
    if (line.startsWith("ATTENDEE")) {
      const emailMatch = line.match(/mailto:([^;]+)/);
      if (emailMatch) {
        attendees.push(emailMatch[1]);
      }
    }
  }
  return attendees.join(",");
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

const parseFile = (path: string): Event[] => {
  const icsContent = fs.readFileSync(path, "utf-8");
  const calendar = extractCalendarName(path);
  const events: Event[] = [];
  const lines = icsContent.split(/\r?\n/);

  let currentEvent: Partial<Event> = {};
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
        attendees: "",
        status: "",
        created: "",
        lastModified: "",
        calendar,
      };
      continue;
    }

    if (line === "END:VEVENT" && inEvent) {
      // Finalize current event
      if (currentProperty && currentValue) {
        setEventProperty(currentEvent, currentProperty, currentValue);
      }

      events.push(currentEvent as Event);
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
  event: Partial<Event>,
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

const writeCSV = (events: Event[], outputFile: string): void => {
  const csvLines: string[] = [Event.join(",")];
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
      escapeCsvField(event.allDay),
      escapeCsvField(event.organizer),
      escapeCsvField(event.attendees),
      escapeCsvField(event.status),
      escapeCsvField(event.created),
      escapeCsvField(event.lastModified),
    ];
    csvLines.push(row.join(","));
  }
  fs.writeFileSync(outputFile, csvLines.join("\n"), "utf-8");
};

// If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
const escapeCsvField = (field: string | boolean): string => {
  if (typeof field === "boolean") {
    return field ? "x" : "";
  }
  if (!field) return '""';
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return `"${field}"`;
};

const parseFiles = (folderPath: string): Event[] => {
  const stats = fs.statSync(folderPath);
  let icsFiles: string[] = [];
  if (stats.isDirectory()) {
    const icsPattern = path.join(folderPath, "*.ics");
    icsFiles = glob.sync(icsPattern);
  } else if (stats.isFile()) {
    icsFiles = [folderPath];
  }
  let allEvents: Event[] = [];
  for (const path of icsFiles) {
    const events = parseFile(path);

    allEvents = allEvents.concat(events);
  }
  return allEvents;
};

const eventFilter = (e: Event) => e.summary.includes("IFS");

const eventOrder = (a: Event, b: Event): number => {
  const dateA = new Date(a.startDate + "T" + (a.startTime || "00:00"));
  const dateB = new Date(b.startDate + "T" + (b.startTime || "00:00"));
  return dateA.getTime() - dateB.getTime();
};

const eventSummary = (es: Event[]) => {
  const calendarCounts = es.reduce((acc, event) => {
    acc[event.calendar] = (acc[event.calendar] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(calendarCounts).forEach(([calendar, count]) => {
    console.log(`${calendar}:  ${count}`);
  });
};

function main(): void {
  const [_0, _1, path, csvPath] = process.argv;
  if (path === undefined) {
    console.log(`node index.ts <file_or_folderpath> <csv?>`);
    process.exit(1);
  }

  let es = parseFiles(path);
  es = es.filter(eventFilter);
  es = es.sort(eventOrder);
  //   eventSummary(es);
  if (csvPath === undefined) {
    console.table(eventSimple(es));
  } else {
    writeCSV(es, csvPath);
  }
}

if (require.main === module) {
  main();
}
