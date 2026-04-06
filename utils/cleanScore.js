const { findcol } = require("./cleanData");

// Map the 6 numeric scoring columns to short aliases and extract quote fields
// Calculate a composite score per row by averaging all available numeric scores
// (some rows have nulls — mean ignores those rather than returning null)
function prepareRows(rows) {
  const headers = Object.keys(rows[0]);

  const colMap = {
    s1: findCol(headers, "1.3_"), // teaching style kept learner concentrated
    s2: findCol(headers, "1.4_"), // offered opportunity to participate
    s3: findCol(headers, "2.8_"), // helpful explaining theory into practice
    s4: findCol(headers, "v1_1.2"), // trainer perceived as concentrated
    s5: findCol(headers, "v2_1.1"), // trainer perceived as motivated
    s6: findCol(headers, "v2_1.2"), // trainer very clear in explanations
    q_liked: findCol(headers, "3.12_"), // primary quote source: what learner liked most
    q_context: findCol(headers, "1.5_"), // fallback quote source: context for scores
    trainer: "Trainer",
    date: "Creation Date",
    session: "Surveys-Charity-Session",
  };

  return rows
    .map((row) => {
      const scores = ["s1", "s2", "s3", "s4", "s5", "s6"]
        .map((k) => parseFloat(row[colMap[k]]))
        .filter((v) => !isNaN(v));

      const composite =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;

      return {
        row_id: row.row_id,
        trainer: (row[colMap.trainer] || "").trim(),
        date: new Date(row[colMap.date]),
        session_id: row[colMap.session],
        q_liked: row[colMap.q_liked],
        q_context: row[colMap.q_context],
        composite,
      };
    })
    .filter((r) => r.trainer && r.composite !== null);
}

module.exports = prepareRows;
