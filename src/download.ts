import * as fs from "fs";
import { my } from "./secret";
function lastModifiedAgoSeconds(folder: string): number {
  const stat = fs.statSync(folder);
  return (Date.now() - stat.mtime.getTime()) / 1000;
}

async function fetchCalendar({
  calendars,
  folder,
}: {
  calendars: Record<string, string>;
  folder: string;
}) {
  const lastModified = lastModifiedAgoSeconds(folder);
  console.log({ lastModified });
  if (lastModified < 3600) return;
  for (const [calendar, url] of Object.entries(calendars)) {
    const res = await fetch(url);
    const ics = await res.text();
    console.log(calendar, ics);
    fs.writeFileSync(`${folder}/${calendar}.ics`, ics, "utf-8");
  }
}

fetchCalendar(my);
