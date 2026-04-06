// Collect all rows for each trainer into a dictionary keyed by trainer email
function groupByTrainer(rows) {
  return rows.reduce((acc, row) => {
    if (!acc[row.trainer]) acc[row.trainer] = [];
    acc[row.trainer].push(row);
    return acc;
  }, {});
}

module.exports = groupByTrainer;
