// Turn the raw CSV string into an array of row objects, one per line
// Each row object has { row_id, column_name: value, ... }
const splitLine = require("./splitLine");

function parseCSV(raw) {
  if (!raw) throw new Error("CSV input is empty or undefined.");
  const lines = raw
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");
  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line, i) => {
    const cols = splitLine(line);
    const row = { row_id: i + 1 };
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? null;
    });
    return row;
  });
}

// Match column names by prefix instead of exact string
// because the CSV has unicode apostrophes that don't match regular quotes
function findCol(headers, prefix) {
  return headers.find((h) => h.startsWith(prefix));
}

module.exports = { parseCSV, findCol };
