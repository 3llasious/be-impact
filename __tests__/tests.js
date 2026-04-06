const caseStudyAngle = require("../utils/caseStudyAngle");
const { parseCSV, findCol } = require("../utils/cleanData");
const prepareRows = require("../utils/cleanScore");
const getQuotes = require("../utils/getQuotes");
const calculateMean = require("../utils/calculateMean");

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
      // mid = floor(5/2) = 2, so early = [0,1], late = [2,3,4]
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
