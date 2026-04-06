const caseStudyAngle = require("../utils/caseStudyAngle");
const { parseCSV, findCol } = require("../utils/cleanData");
const prepareRows = require("../utils/cleanScore");
const getQuotes = require("../utils/getQuotes");
const calculateMean = require("../utils/meanScore");
const isEligible = require("../utils/isEligible");
const isValidQuote = require("../utils/isValidQuote");
const truncate = require("../utils/shortenQuote");
const splitLine = require("../utils/splitLine");
const improvementScore = require("../utils/improvementScore");
const groupByTrainer = require("../utils/trainerLookupObj");

describe("caseStudyAngle", () => {
  describe("threshold boundaries", () => {
    test("returns sharp jump message when improvement is exactly 1.5", () => {
      const result = caseStudyAngle("Hayden Scott", 1.5);
      expect(result).toContain("sharpest score jump");
      expect(result).toContain("+1.5 pts");
    });

    test("returns sharp jump message when improvement is above 1.5", () => {
      const result = caseStudyAngle("Hayden Scott", 2.3);
      expect(result).toContain("sharpest score jump");
    });

    test("returns consistent improvement message when improvement is exactly 0.5", () => {
      const result = caseStudyAngle("Jamie Kim", 0.5);
      expect(result).toContain("improved consistently");
      expect(result).toContain("+0.5 pts");
    });

    test("returns consistent improvement message when improvement is between 0.5 and 1.5", () => {
      const result = caseStudyAngle("Jamie Kim", 0.94);
      expect(result).toContain("improved consistently");
    });

    test("returns positive trend message when improvement is exactly 0", () => {
      const result = caseStudyAngle("Jordan Patel", 0);
      expect(result).toContain("positive trend");
    });

    test("returns positive trend message when improvement is between 0 and 0.5", () => {
      const result = caseStudyAngle("Jordan Patel", 0.3);
      expect(result).toContain("positive trend");
    });

    test("returns fallback message when improvement is negative", () => {
      const result = caseStudyAngle("Avery Davis", -0.4);
      expect(result).toContain("started strong");
    });
  });

  describe("name interpolation", () => {
    test("includes the trainer name in the output", () => {
      const result = caseStudyAngle("Charlie Clark", 1.0);
      expect(result).toContain("Charlie Clark");
    });

    test("includes the trainer name in the fallback message", () => {
      const result = caseStudyAngle("Avery Davis", -1.0);
      expect(result).toContain("Avery Davis");
    });
  });

  describe("return type", () => {
    test("always returns a string", () => {
      expect(typeof caseStudyAngle("Anyone", 2.0)).toBe("string");
      expect(typeof caseStudyAngle("Anyone", 0.7)).toBe("string");
      expect(typeof caseStudyAngle("Anyone", 0.1)).toBe("string");
      expect(typeof caseStudyAngle("Anyone", -0.5)).toBe("string");
    });
  });
});

describe("parseCSV", () => {
  describe("error handling", () => {
    test("throws if input is null", () => {
      expect(() => parseCSV(null)).toThrow("CSV input is empty or undefined.");
    });

    test("throws if input is undefined", () => {
      expect(() => parseCSV(undefined)).toThrow(
        "CSV input is empty or undefined.",
      );
    });

    test("throws if input is an empty string", () => {
      expect(() => parseCSV("")).toThrow("CSV input is empty or undefined.");
    });
  });

  describe("row shape", () => {
    test("returns one row object per data line", () => {
      const csv = `name,score\nhayden,9\njamie,8`;
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
    });

    test("assigns row_id starting at 1", () => {
      const csv = `name,score\nhayden,9\njamie,8`;
      const result = parseCSV(csv);
      expect(result[0].row_id).toBe(1);
      expect(result[1].row_id).toBe(2);
    });

    test("maps header names to values correctly", () => {
      const csv = `name,score\nhayden,9`;
      const result = parseCSV(csv);
      expect(result[0].name).toBe("hayden");
      expect(result[0].score).toBe("9");
    });
  });

  describe("edge cases", () => {
    test("filters out empty lines", () => {
      const csv = `name,score\nhayden,9\n\njamie,8\n`;
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
    });

    test("sets missing column values to null", () => {
      const csv = `name,score,extra\nhayden,9`;
      const result = parseCSV(csv);
      expect(result[0].extra).toBeNull();
    });

    test("handles quoted fields containing commas", () => {
      const csv = `"name, title",score\n"hayden, trainer",9`;
      const result = parseCSV(csv);
      expect(result[0]["name, title"]).toBe("hayden, trainer");
    });

    test("handles a single data row", () => {
      const csv = `name,score\nhayden,9`;
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].row_id).toBe(1);
    });
  });
});

describe("findCol", () => {
  test("returns the full column name when prefix matches", () => {
    const headers = ["1.3_Teaching style", "1.4_Participation", "2.8_Theory"];
    expect(findCol(headers, "1.3_")).toBe("1.3_Teaching style");
  });

  test("returns undefined when no column matches the prefix", () => {
    const headers = ["1.3_Teaching style", "1.4_Participation"];
    expect(findCol(headers, "v2_1.1")).toBeUndefined();
  });

  test("returns the first match when multiple columns share a prefix", () => {
    const headers = ["v1_1.2_focused", "v1_1.2_other", "1.3_Teaching"];
    expect(findCol(headers, "v1_1.2")).toBe("v1_1.2_focused");
  });

  test("is case sensitive", () => {
    const headers = ["1.3_Teaching style"];
    expect(findCol(headers, "1.3_teaching")).toBeUndefined();
  });

  test("handles an empty headers array", () => {
    expect(findCol([], "1.3_")).toBeUndefined();
  });
});

describe("prepareRows", () => {
  const makeRow = (overrides = {}) => ({
    row_id: 1,
    Trainer: "hayden.scott@org2.example.com",
    "Creation Date": "2025-03-01",
    "Surveys-Charity-Session": "session-001",
    "1.3_Teaching style": "9",
    "1.4_Participation": "8",
    "2.8_Theory": "9",
    "v1_1.2_focused": "8",
    "v2_1.1_motivated": "9",
    "v2_1.2_clear": "10",
    "3.12_liked": "Very engaging session",
    "1.5_context": "Good overall experience",
    ...overrides,
  });

  describe("output shape", () => {
    test("returns the expected keys on each row", () => {
      const result = prepareRows([makeRow()]);
      expect(result[0]).toHaveProperty("row_id");
      expect(result[0]).toHaveProperty("trainer");
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("session_id");
      expect(result[0]).toHaveProperty("q_liked");
      expect(result[0]).toHaveProperty("q_context");
      expect(result[0]).toHaveProperty("composite");
    });

    test("date field is a Date object", () => {
      const result = prepareRows([makeRow()]);
      expect(result[0].date).toBeInstanceOf(Date);
    });

    test("preserves row_id from input", () => {
      const result = prepareRows([makeRow({ row_id: 42 })]);
      expect(result[0].row_id).toBe(42);
    });
  });

  describe("composite score", () => {
    test("averages all 6 scores correctly", () => {
      const result = prepareRows([
        makeRow({
          "1.3_Teaching style": "8",
          "1.4_Participation": "8",
          "2.8_Theory": "8",
          "v1_1.2_focused": "8",
          "v2_1.1_motivated": "8",
          "v2_1.2_clear": "8",
        }),
      ]);
      expect(result[0].composite).toBe(8);
    });

    test("ignores null scores and averages over remaining valid scores", () => {
      const result = prepareRows([
        makeRow({
          "2.8_Theory": null,
          "v2_1.2_clear": null,
          "1.3_Teaching style": "10",
          "1.4_Participation": "10",
          "v1_1.2_focused": "10",
          "v2_1.1_motivated": "10",
        }),
      ]);
      expect(result[0].composite).toBe(10);
    });

    test("ignores non-numeric score values", () => {
      const result = prepareRows([
        makeRow({
          "1.3_Teaching style": "n/a",
          "1.4_Participation": "10",
          "2.8_Theory": "10",
          "v1_1.2_focused": "10",
          "v2_1.1_motivated": "10",
          "v2_1.2_clear": "10",
        }),
      ]);
      expect(result[0].composite).toBe(10);
    });
  });

  describe("filtering", () => {
    test("drops rows with no valid scores", () => {
      const result = prepareRows([
        makeRow({
          "1.3_Teaching style": null,
          "1.4_Participation": null,
          "2.8_Theory": null,
          "v1_1.2_focused": null,
          "v2_1.1_motivated": null,
          "v2_1.2_clear": null,
        }),
      ]);
      expect(result).toHaveLength(0);
    });

    test("drops rows with no trainer", () => {
      const result = prepareRows([makeRow({ Trainer: "" })]);
      expect(result).toHaveLength(0);
    });

    test("trims whitespace from trainer name", () => {
      const result = prepareRows([
        makeRow({ Trainer: "  hayden.scott@org2.example.com  " }),
      ]);
      expect(result[0].trainer).toBe("hayden.scott@org2.example.com");
    });

    test("keeps rows that have at least one valid score", () => {
      const result = prepareRows([
        makeRow({
          "1.3_Teaching style": "9",
          "1.4_Participation": null,
          "2.8_Theory": null,
          "v1_1.2_focused": null,
          "v2_1.1_motivated": null,
          "v2_1.2_clear": null,
        }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].composite).toBe(9);
    });
  });

  describe("quote fields", () => {
    test("maps q_liked from the 3.12_ column", () => {
      const result = prepareRows([makeRow({ "3.12_liked": "Great session!" })]);
      expect(result[0].q_liked).toBe("Great session!");
    });

    test("maps q_context from the 1.5_ column", () => {
      const result = prepareRows([
        makeRow({ "1.5_context": "Really helpful." }),
      ]);
      expect(result[0].q_context).toBe("Really helpful.");
    });

    test("q_liked is undefined when column is missing", () => {
      const row = makeRow();
      delete row["3.12_liked"];
      const result = prepareRows([row]);
      expect(result[0].q_liked).toBeUndefined();
    });
  });
});

describe("getQuotes", () => {
  const makeSession = (overrides = {}) => ({
    row_id: 1,
    composite: 8,
    q_liked: "Really enjoyed the session",
    q_context: "Good overall experience",
    ...overrides,
  });

  describe("output shape", () => {
    test("returns an array", () => {
      const result = getQuotes([makeSession()]);
      expect(Array.isArray(result)).toBe(true);
    });

    test("each quote has row_id and quote fields", () => {
      const result = getQuotes([makeSession({ row_id: 7 })]);
      expect(result[0]).toHaveProperty("row_id", 7);
      expect(result[0]).toHaveProperty("quote");
    });

    test("quote field is a string", () => {
      const result = getQuotes([makeSession()]);
      expect(typeof result[0].quote).toBe("string");
    });
  });

  describe("quote count", () => {
    test("returns 2 quotes by default when enough sessions exist", () => {
      const sessions = [
        makeSession({ row_id: 1, composite: 9 }),
        makeSession({ row_id: 2, composite: 8 }),
        makeSession({ row_id: 3, composite: 7 }),
      ];
      expect(getQuotes(sessions)).toHaveLength(2);
    });

    test("returns fewer than 2 if not enough valid quotes exist", () => {
      const sessions = [
        makeSession({ row_id: 1, q_liked: null, q_context: null }),
        makeSession({ row_id: 2, q_liked: null, q_context: null }),
      ];
      expect(getQuotes(sessions)).toHaveLength(0);
    });

    test("respects a custom n value", () => {
      const sessions = [
        makeSession({ row_id: 1, composite: 9 }),
        makeSession({ row_id: 2, composite: 8 }),
        makeSession({ row_id: 3, composite: 7 }),
        makeSession({ row_id: 4, composite: 6 }),
      ];
      expect(getQuotes(sessions, 3)).toHaveLength(3);
    });

    test("returns 1 quote if only 1 valid quote exists", () => {
      const sessions = [
        makeSession({ row_id: 1, q_liked: "Great!", q_context: null }),
        makeSession({ row_id: 2, q_liked: null, q_context: null }),
      ];
      expect(getQuotes(sessions, 2)).toHaveLength(1);
    });
  });

  describe("ranking", () => {
    test("picks quotes from highest scoring sessions first", () => {
      const sessions = [
        makeSession({ row_id: 1, composite: 6, q_liked: "Low scorer" }),
        makeSession({ row_id: 2, composite: 10, q_liked: "Top scorer" }),
      ];
      const result = getQuotes(sessions, 1);
      expect(result[0].quote).toBe("Top scorer");
    });

    test("row_id matches the session the quote came from", () => {
      const sessions = [
        makeSession({ row_id: 99, composite: 10, q_liked: "Best session" }),
        makeSession({ row_id: 50, composite: 5, q_liked: "Okay session" }),
      ];
      const result = getQuotes(sessions, 1);
      expect(result[0].row_id).toBe(99);
    });
  });

  describe("fallback logic", () => {
    test("uses q_liked when available", () => {
      const result = getQuotes([
        makeSession({ q_liked: "Liked this", q_context: "Context text" }),
      ]);
      expect(result[0].quote).toBe("Liked this");
    });

    test("falls back to q_context when q_liked is null", () => {
      const result = getQuotes([
        makeSession({ q_liked: null, q_context: "Context text" }),
      ]);
      expect(result[0].quote).toBe("Context text");
    });

    test("falls back to q_context when q_liked is a dash placeholder", () => {
      const result = getQuotes([
        makeSession({ q_liked: "-", q_context: "Context text" }),
      ]);
      expect(result[0].quote).toBe("Context text");
    });

    test("falls back to q_context when q_liked is the string nan", () => {
      const result = getQuotes([
        makeSession({ q_liked: "nan", q_context: "Context text" }),
      ]);
      expect(result[0].quote).toBe("Context text");
    });

    test("skips session entirely when both q_liked and q_context are invalid", () => {
      const sessions = [
        makeSession({
          row_id: 1,
          composite: 10,
          q_liked: null,
          q_context: "-",
        }),
        makeSession({
          row_id: 2,
          composite: 8,
          q_liked: "Good session",
          q_context: null,
        }),
      ];
      const result = getQuotes(sessions, 1);
      expect(result[0].row_id).toBe(2);
    });
  });
});

describe("calculateMean", () => {
  describe("correct calculation", () => {
    test("returns the mean of a simple array", () => {
      expect(calculateMean([2, 4, 6])).toBe(4);
    });

    test("returns the value itself for a single-element array", () => {
      expect(calculateMean([7])).toBe(7);
    });

    test("handles decimal results correctly", () => {
      expect(calculateMean([1, 2])).toBe(1.5);
    });

    test("handles an array of identical values", () => {
      expect(calculateMean([5, 5, 5, 5])).toBe(5);
    });

    test("handles negative numbers", () => {
      expect(calculateMean([-3, -1, -2])).toBe(-2);
    });

    test("handles a mix of positive and negative numbers", () => {
      expect(calculateMean([-5, 5])).toBe(0);
    });
  });

  describe("edge cases", () => {
    test("returns NaN for an empty array", () => {
      expect(calculateMean([])).toBeNaN();
    });
  });
});

describe("improvementScore", () => {
  const makeSession = (date, composite) => ({
    date: new Date(date),
    composite,
  });

  describe("correct calculation", () => {
    test("returns positive improvement when late sessions score higher", () => {
      const sessions = [
        makeSession("2025-01-01", 7),
        makeSession("2025-01-02", 7),
        makeSession("2025-02-01", 9),
        makeSession("2025-02-02", 9),
      ];
      const result = improvementScore(sessions);
      expect(result.improvement).toBe(2);
    });

    test("returns negative improvement when late sessions score lower", () => {
      const sessions = [
        makeSession("2025-01-01", 9),
        makeSession("2025-01-02", 9),
        makeSession("2025-02-01", 7),
        makeSession("2025-02-02", 7),
      ];
      const result = improvementScore(sessions);
      expect(result.improvement).toBe(-2);
    });

    test("returns zero improvement when early and late averages are equal", () => {
      const sessions = [
        makeSession("2025-01-01", 8),
        makeSession("2025-01-02", 8),
        makeSession("2025-02-01", 8),
        makeSession("2025-02-02", 8),
      ];
      const result = improvementScore(sessions);
      expect(result.improvement).toBe(0);
    });

    test("rounds earlyAvg, lateAvg and improvement to 2 decimal places", () => {
      const sessions = [
        makeSession("2025-01-01", 7),
        makeSession("2025-01-02", 8),
        makeSession("2025-02-01", 9),
        makeSession("2025-02-02", 10),
      ];
      const result = improvementScore(sessions);
      expect(result.earlyAvg).toBe(7.5);
      expect(result.lateAvg).toBe(9.5);
      expect(result.improvement).toBe(2);
    });
  });

  describe("chronological sorting", () => {
    test("sorts sessions by date before splitting, regardless of input order", () => {
      // Sessions passed in reverse order — result should be the same as forward order
      const sessions = [
        makeSession("2025-02-02", 9),
        makeSession("2025-02-01", 9),
        makeSession("2025-01-02", 7),
        makeSession("2025-01-01", 7),
      ];
      const result = improvementScore(sessions);
      expect(result.improvement).toBe(2);
    });

    test("does not mutate the original sessions array", () => {
      const sessions = [
        makeSession("2025-02-01", 9),
        makeSession("2025-01-01", 7),
        makeSession("2025-02-02", 9),
        makeSession("2025-01-02", 7),
      ];
      const original = [...sessions];
      improvementScore(sessions);
      expect(sessions.map((s) => s.date)).toEqual(original.map((s) => s.date));
    });
  });

  describe("output shape", () => {
    test("returns earlyAvg, lateAvg and improvement", () => {
      const sessions = [
        makeSession("2025-01-01", 7),
        makeSession("2025-01-02", 7),
        makeSession("2025-02-01", 9),
        makeSession("2025-02-02", 9),
      ];
      const result = improvementScore(sessions);
      expect(result).toHaveProperty("earlyAvg");
      expect(result).toHaveProperty("lateAvg");
      expect(result).toHaveProperty("improvement");
    });

    test("all returned values are numbers", () => {
      const sessions = [
        makeSession("2025-01-01", 8),
        makeSession("2025-01-02", 8),
        makeSession("2025-02-01", 9),
        makeSession("2025-02-02", 9),
      ];
      const result = improvementScore(sessions);
      expect(typeof result.earlyAvg).toBe("number");
      expect(typeof result.lateAvg).toBe("number");
      expect(typeof result.improvement).toBe("number");
    });
  });

  describe("odd number of sessions", () => {
    test("with 5 sessions the late half gets the extra session", () => {
      const sessions = [
        makeSession("2025-01-01", 6),
        makeSession("2025-01-02", 6),
        makeSession("2025-02-01", 9),
        makeSession("2025-02-02", 9),
        makeSession("2025-03-01", 9),
      ];
      const result = improvementScore(sessions);
      expect(result.earlyAvg).toBe(6);
      expect(result.lateAvg).toBe(9);
    });
  });
});

describe("isEligible", () => {
  const makeSession = (date) => ({ date: new Date(date) });

  describe("session count cliff", () => {
    test("returns false with fewer than 5 sessions", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-01-10"),
        makeSession("2025-01-20"),
        makeSession("2025-01-30"),
      ];
      expect(isEligible(sessions)).toBe(false);
    });

    test("returns false with exactly 4 sessions regardless of span", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-02-01"),
        makeSession("2025-03-01"),
        makeSession("2025-04-01"),
      ];
      expect(isEligible(sessions)).toBe(false);
    });

    test("does not return false on session count alone when count is 5 or more", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-01-10"),
        makeSession("2025-01-20"),
        makeSession("2025-01-30"),
        makeSession("2025-02-10"),
      ];
      expect(isEligible(sessions)).toBe(true);
    });
  });

  describe("day span cliff", () => {
    test("returns false when span is less than 7 days", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-01-02"),
        makeSession("2025-01-03"),
        makeSession("2025-01-04"),
        makeSession("2025-01-05"),
      ];
      expect(isEligible(sessions)).toBe(false);
    });

    test("returns false when span is exactly 6 days", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-01-02"),
        makeSession("2025-01-03"),
        makeSession("2025-01-04"),
        makeSession("2025-01-05"),
        makeSession("2025-01-07"),
      ];
      expect(isEligible(sessions)).toBe(false);
    });

    test("returns true when span is exactly 7 days", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-01-02"),
        makeSession("2025-01-03"),
        makeSession("2025-01-04"),
        makeSession("2025-01-05"),
        makeSession("2025-01-08"),
      ];
      expect(isEligible(sessions)).toBe(true);
    });

    test("returns true when span is well above 7 days", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-02-01"),
        makeSession("2025-03-01"),
        makeSession("2025-04-01"),
        makeSession("2025-05-01"),
      ];
      expect(isEligible(sessions)).toBe(true);
    });
  });

  describe("both cliffs must pass", () => {
    test("returns false when count is met but span is not", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-01-02"),
        makeSession("2025-01-03"),
        makeSession("2025-01-04"),
        makeSession("2025-01-05"),
      ];
      expect(isEligible(sessions)).toBe(false);
    });

    test("returns false when span is met but count is not", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-01-10"),
        makeSession("2025-01-20"),
        makeSession("2025-01-30"),
      ];
      expect(isEligible(sessions)).toBe(false);
    });

    test("returns true when both count and span are met", () => {
      const sessions = [
        makeSession("2025-01-01"),
        makeSession("2025-01-05"),
        makeSession("2025-01-10"),
        makeSession("2025-01-15"),
        makeSession("2025-01-20"),
      ];
      expect(isEligible(sessions)).toBe(true);
    });
  });

  describe("date ordering", () => {
    test("calculates span correctly when sessions are passed in unsorted order", () => {
      const sessions = [
        makeSession("2025-01-20"),
        makeSession("2025-01-01"),
        makeSession("2025-01-10"),
        makeSession("2025-01-15"),
        makeSession("2025-01-05"),
      ];
      expect(isEligible(sessions)).toBe(true);
    });
  });
});

describe("isValidQuote", () => {
  describe("valid input", () => {
    test("returns true for a normal quote string", () => {
      expect(isValidQuote("Really enjoyed the session")).toBe(true);
    });

    test("returns true for a string with leading and trailing whitespace", () => {
      expect(isValidQuote("  Great trainer  ")).toBe(true);
    });

    test("returns true for a single word", () => {
      expect(isValidQuote("Excellent")).toBe(true);
    });
  });

  describe("invalid — falsy values", () => {
    test("returns false for null", () => {
      expect(isValidQuote(null)).toBe(false);
    });

    test("returns false for undefined", () => {
      expect(isValidQuote(undefined)).toBe(false);
    });

    test("returns false for an empty string", () => {
      expect(isValidQuote("")).toBe(false);
    });
  });

  describe("invalid — placeholder values", () => {
    test("returns false for a dash", () => {
      expect(isValidQuote("-")).toBe(false);
    });

    test("returns false for a dash with surrounding whitespace", () => {
      expect(isValidQuote("  -  ")).toBe(false);
    });

    test("returns false for a whitespace-only string", () => {
      expect(isValidQuote("   ")).toBe(false);
    });
  });

  describe("invalid — nan string", () => {
    test('returns false for the string "nan"', () => {
      expect(isValidQuote("nan")).toBe(false);
    });

    test('returns false for "NaN" in uppercase', () => {
      expect(isValidQuote("NaN")).toBe(false);
    });

    test('returns false for "NAN" in all caps', () => {
      expect(isValidQuote("NAN")).toBe(false);
    });

    test('returns false for "nan" with surrounding whitespace', () => {
      expect(isValidQuote("  nan  ")).toBe(false);
    });
  });
});

describe("truncate", () => {
  const SHORT = "Short text.";
  const EXACTLY_180 = "a".repeat(180);
  const LONG_NO_SENTENCE = "a".repeat(250);

  describe("no truncation needed", () => {
    test("returns the string unchanged when it is under 180 chars", () => {
      expect(truncate(SHORT)).toBe(SHORT);
    });

    test("returns the string unchanged when it is exactly 180 chars", () => {
      expect(truncate(EXACTLY_180)).toBe(EXACTLY_180);
    });
  });

  describe("sentence boundary cut", () => {
    test("cuts at a full stop when one exists after position 80", () => {
      // Full stop at position 100 — should cut there
      const text = "a".repeat(100) + ". " + "b".repeat(150);
      const result = truncate(text);
      expect(result.endsWith(".")).toBe(true);
      expect(result.length).toBeLessThanOrEqual(101);
    });

    test("includes the full stop in the result", () => {
      const text = "a".repeat(100) + ". " + "b".repeat(150);
      const result = truncate(text);
      expect(result[result.length - 1]).toBe(".");
    });

    test("does not cut at a full stop that falls before position 80", () => {
      // Full stop at position 50 — too early, should fall back to hard cut at 180
      const text = "a".repeat(50) + ". " + "b".repeat(200);
      const result = truncate(text);
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("hard cut fallback", () => {
    test("cuts at 180 chars and appends ellipsis when no valid sentence boundary exists", () => {
      const result = truncate(LONG_NO_SENTENCE);
      expect(result).toBe("a".repeat(180) + "…");
    });

    test("hard cut result is 181 chars — 180 content plus ellipsis character", () => {
      const result = truncate(LONG_NO_SENTENCE);
      expect(result.length).toBe(181);
    });
  });

  describe("custom max", () => {
    test("respects a custom max value", () => {
      const text = "a".repeat(100);
      const result = truncate(text, 50);
      expect(result).toBe("a".repeat(50) + "…");
    });

    test("returns string unchanged when it is under the custom max", () => {
      expect(truncate(SHORT, 50)).toBe(SHORT);
    });
  });
});

describe("splitLine", () => {
  describe("basic splitting", () => {
    test("splits a simple comma-separated line", () => {
      expect(splitLine("a,b,c")).toEqual(["a", "b", "c"]);
    });

    test("returns a single-element array when there are no commas", () => {
      expect(splitLine("hello")).toEqual(["hello"]);
    });

    test("returns an empty string element for an empty input", () => {
      expect(splitLine("")).toEqual([""]);
    });

    test("handles a line with a trailing comma", () => {
      expect(splitLine("a,b,")).toEqual(["a", "b", ""]);
    });
  });

  describe("quoted fields", () => {
    test("treats a comma inside quotes as part of the field, not a delimiter", () => {
      expect(splitLine('"hello, world",foo')).toEqual(["hello, world", "foo"]);
    });

    test("handles multiple quoted fields with commas", () => {
      expect(splitLine('"a, b","c, d"')).toEqual(["a, b", "c, d"]);
    });

    test("handles a mix of quoted and unquoted fields", () => {
      expect(splitLine('plain,"quoted, value",plain2')).toEqual([
        "plain",
        "quoted, value",
        "plain2",
      ]);
    });

    test("strips the quote characters from the result", () => {
      const result = splitLine('"hello"');
      expect(result[0]).not.toContain('"');
    });
  });

  describe("whitespace trimming", () => {
    test("trims leading and trailing whitespace from each field", () => {
      expect(splitLine("  a  ,  b  ")).toEqual(["a", "b"]);
    });

    test("trims whitespace from quoted fields", () => {
      expect(splitLine('  "hello, world"  ,foo')).toEqual([
        "hello, world",
        "foo",
      ]);
    });
  });

  describe("non-breaking space normalisation", () => {
    test("replaces non-breaking spaces (\\xa0) with regular spaces", () => {
      const nonBreaking = "hello\xa0world";
      const result = splitLine(nonBreaking);
      expect(result[0]).toBe("hello world");
    });

    test("replaces non-breaking spaces inside quoted fields", () => {
      const nonBreaking = '"hello\xa0world",foo';
      const result = splitLine(nonBreaking);
      expect(result[0]).toBe("hello world");
    });
  });
});

describe("groupByTrainer", () => {
  const makeRow = (trainer, overrides = {}) => ({
    trainer,
    row_id: 1,
    composite: 8,
    ...overrides,
  });

  describe("output shape", () => {
    test("returns an object", () => {
      const result = groupByTrainer([makeRow("hayden@example.com")]);
      expect(typeof result).toBe("object");
      expect(Array.isArray(result)).toBe(false);
    });

    test("keys are trainer emails", () => {
      const result = groupByTrainer([makeRow("hayden@example.com")]);
      expect(Object.keys(result)).toContain("hayden@example.com");
    });

    test("values are arrays", () => {
      const result = groupByTrainer([makeRow("hayden@example.com")]);
      expect(Array.isArray(result["hayden@example.com"])).toBe(true);
    });
  });

  describe("grouping behaviour", () => {
    test("groups multiple rows for the same trainer under one key", () => {
      const rows = [
        makeRow("hayden@example.com", { row_id: 1 }),
        makeRow("hayden@example.com", { row_id: 2 }),
        makeRow("hayden@example.com", { row_id: 3 }),
      ];
      const result = groupByTrainer(rows);
      expect(result["hayden@example.com"]).toHaveLength(3);
    });

    test("creates separate keys for different trainers", () => {
      const rows = [
        makeRow("hayden@example.com"),
        makeRow("jamie@example.com"),
      ];
      const result = groupByTrainer(rows);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result["hayden@example.com"]).toHaveLength(1);
      expect(result["jamie@example.com"]).toHaveLength(1);
    });

    test("preserves the full row object under each trainer key", () => {
      const row = makeRow("hayden@example.com", { row_id: 42, composite: 9.5 });
      const result = groupByTrainer([row]);
      expect(result["hayden@example.com"][0]).toEqual(row);
    });

    test("returns an empty object for an empty input array", () => {
      expect(groupByTrainer([])).toEqual({});
    });

    test("handles a single row correctly", () => {
      const result = groupByTrainer([
        makeRow("hayden@example.com", { row_id: 1 }),
      ]);
      expect(result["hayden@example.com"]).toHaveLength(1);
    });
  });

  describe("key accuracy", () => {
    test("treats trainer emails as case sensitive keys", () => {
      const rows = [
        makeRow("Hayden@example.com"),
        makeRow("hayden@example.com"),
      ];
      const result = groupByTrainer(rows);
      expect(Object.keys(result)).toHaveLength(2);
    });

    test("does not merge trainers with similar but different emails", () => {
      const rows = [
        makeRow("hayden.scott@org1.example.com"),
        makeRow("hayden.scott@org2.example.com"),
      ];
      const result = groupByTrainer(rows);
      expect(Object.keys(result)).toHaveLength(2);
    });
  });
});
