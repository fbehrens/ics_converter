import { germanDate, wochentag } from ".";

export interface Event {
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
export const filterCalender = (e: Event) => e.summary.includes("IFS");

export interface InvoicePosition {
  raum: string;
  verantstalter: string;
  additional_info: string;
  beginnTag: string;
  beginnWochentag: string;
  endeTag: string;
  endeWochentag: string;
}
export const invoicePosFromEvent = (e: Event): InvoicePosition => ({
  raum: e.calendar,
  verantstalter: e.summary,
  additional_info: "",
  beginnTag: germanDate(e.startDate),
  beginnWochentag: wochentag(e.startDate),
  endeTag: germanDate(e.endDate),
  endeWochentag: wochentag(e.endDate),
});
