// Split a CSV line by comma but ignore commas inside quoted fields
// e.g. the column "2.6_Did the trainer establish good rapport..." contains a comma in its name
// a naive line.split(',') would break that into two columns — this handles it correctly
function splitLine(line) {
  const cols = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cols.push(current.trim().replace(/\xa0/g, " "));
      current = "";
    } else {
      current += char;
    }
  }
  cols.push(current.trim().replace(/\xa0/g, " "));
  return cols;
}

module.exports = splitLine;
