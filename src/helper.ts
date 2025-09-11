import * as fs from "fs";

export const germanDate = (dateString) => {
  const parts = dateString.split("-");
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};
export const wochentag = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", { weekday: "long" });
};
export const saveCsv =
  (filename: string) =>
  <T extends Record<string, any>>(data: T[]) => {
    const getHeaders = (obj: Record<string, any>): string => {
      return Object.keys(obj).join(",");
    };
    const objectToCsvRow = (obj: Record<string, any>): string => {
      return Object.values(obj)
        .map((value) => {
          const stringValue = String(value ?? "");
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",");
    };

    if (data.length > 0) {
      const csv = [getHeaders(data[0]), ...data.map(objectToCsvRow)];
      fs.writeFileSync(filename, csv.join("\n"), "utf-8");
    }
    return data;
  };
