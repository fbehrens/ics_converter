import { Effect, Stream, pipe, Chunk } from "effect";

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

const getHeaders = (obj: Record<string, any>): string => {
  return Object.keys(obj).join(",");
};

// Create CSV stream from array of objects
const createCsvStream = <T extends Record<string, any>>(
  data: T[]
): Stream.Stream<string> => {
  const headerStream = Stream.succeed(getHeaders(data[0]));
  const dataStream = Stream.fromIterable(data).pipe(Stream.map(objectToCsvRow));
  return Stream.concat(headerStream, dataStream);
};

interface Person {
  id: number;
  name: string;
  email: string;
  age: number;
}

const main = () => {
  const exampleData: Person[] = [
    { id: 1, name: "John Doe", email: "john@example.com", age: 30 },
    { id: 2, name: "Jane Smith", email: "jane@example.com", age: 25 },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 35 },
  ];
  const programCollectAll = pipe(
    createCsvStream(exampleData),
    Stream.runCollect,
    Effect.map((chunk) => Chunk.toReadonlyArray(chunk).join("\n"))
  );

  const programToSink = pipe(
    createCsvStream(exampleData),
    Stream.run(Stream.toReadableStream(new ReadableStreamDefaultController()))
  );

  console.log(Effect.runSync(programCollectAll));
};
if (require.main === module) main();
