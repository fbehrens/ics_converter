import * as i from "./ical.ts";
import { pipe } from "effect";
import { saveCsv } from "./helper.ts";

const [_0, _1, account] = process.argv;
if (account === undefined) {
  console.log(`node index.ts <account>`);
  process.exit(1);
}
let es = pipe(
  i.parseFiles(`ical/${account}`),
  i.eventFilter,
  i.eventSort,
  saveCsv(`out/${account}/cal.csv`),
  i.eventMap,
  saveCsv(`out/${account}/pos.csv`)
);
