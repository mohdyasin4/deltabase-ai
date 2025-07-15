// Helper: split SELECT columns by commas ignoring commas inside parentheses
function splitColumns(selectClause: string): string[] {
  const columns: string[] = [];
  let parenCount = 0;
  let current = "";
  for (const char of selectClause) {
    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (char === "," && parenCount === 0) {
      columns.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current) columns.push(current.trim());
  return columns;
}

// Helper: escape a string for use in a RegExp
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function manipulateRawQueryWithGroupBy(
  rawQuery: string,
  dateBy: string,
  additionalGroupBy?: string
): string {
  // Remove trailing semicolon for consistency
  const cleanedQuery = rawQuery.trim().replace(/;$/, "");

  // Define regex patterns for different date expressions.
  const patterns: { [key: string]: RegExp } = {
    // Pattern for year: MAKEDATE(YEAR(`table`.`column`), 1)
    year: /MAKEDATE\(YEAR\((`?[\w]+`?\.`?([\w]+)`?)\),\s*1\)/gi,
    // Pattern for month: STR_TO_DATE(CONCAT(DATE_FORMAT(`table`.`column`, '%Y-%m'), '-01'), '%Y-%m-%d')
    month: /STR_TO_DATE\(CONCAT\(DATE_FORMAT\((`?[\w]+`?\.`?([\w]+)`?), '%Y-%m'\),\s*'-01'\), '%Y-%m-%d'\)/gi,
    // Pattern for day: DATE(`table`.`column`)
    day: /DATE\((`?[\w]+`?\.`?([\w]+)`?)\)/gi,
    // Pattern for minute: STR_TO_DATE(DATE_FORMAT(`table`.`column`, '%Y-%m-%d %H:%i'), '%Y-%m-%d %H:%i')
    minute: /STR_TO_DATE\(DATE_FORMAT\((`?[\w]+`?\.`?([\w]+)`?), '%Y-%m-%d %H:%i'\), '%Y-%m-%d %H:%i'\)/gi,
    // Pattern for hour: STR_TO_DATE(DATE_FORMAT(`table`.`column`, '%Y-%m-%d %H'), '%Y-%m-%d %H')
    hour: /STR_TO_DATE\(DATE_FORMAT\((`?[\w]+`?\.`?([\w]+)`?), '%Y-%m-%d %H'\), '%Y-%m-%d %H'\)/gi,
    // For week, we reuse DATE() for now (could be enhanced for week ranges)
    week: /DATE\((`?[\w]+`?\.`?([\w]+)`?)\)/gi,
    // Pattern for quarter: allow optional backticks
    quarter: /STR_TO_DATE\(CONCAT\(YEAR\((`?[\w]+`?\.`?([\w]+)`?)\),\s*'-',\s*\(QUARTER\((`?[\w]+`?\.`?([\w]+)`?)\)\s*\*\s*3\)\s*-\s*2,\s*'-01'\),\s*'%Y-%m-%d'\)/gi,
    // Pattern for DATE_FORMAT expressions, e.g. DATE_FORMAT(p.payment_date, '%Y')
    dateFormat: /DATE_FORMAT\(([a-zA-Z0-9_.]+)\s*,\s*'([^']+)'\)/gi,
  };

  // Function to build the new date expression for a given base column and desired granularity.
  const buildNewDateExpression = (tableAndCol: string): string => {
    switch (dateBy.toLowerCase()) {
      case "minute":
        return `STR_TO_DATE(DATE_FORMAT(${tableAndCol}, '%Y-%m-%d %H:%i'), '%Y-%m-%d %H:%i')`;
      case "hour":
        return `STR_TO_DATE(DATE_FORMAT(${tableAndCol}, '%Y-%m-%d %H'), '%Y-%m-%d %H')`;
      case "day":
        return `DATE(${tableAndCol})`;
      case "week":
        return `DATE(${tableAndCol})`; // You might want to adjust for week ranges
      case "month":
        return `STR_TO_DATE(CONCAT(DATE_FORMAT(${tableAndCol}, '%Y-%m'), '-01'), '%Y-%m-%d')`;
      case "quarter":
        return `STR_TO_DATE(CONCAT(YEAR(${tableAndCol}), '-', (QUARTER(${tableAndCol}) * 3) - 2, '-01'), '%Y-%m-%d')`;
      case "year":
        return `MAKEDATE(YEAR(${tableAndCol}), 1)`;
      default:
        return `DATE(${tableAndCol})`;
    }
  };

  // Loop over the defined patterns to find a matching date expression.
  let detectedPatternKey: string | null = null;
  let match: RegExpExecArray | null = null;
  let tableAndCol = "";
  let dateColumn = "";

  for (const key in patterns) {
    const regex = patterns[key];
    match = regex.exec(cleanedQuery);
    if (match) {
      detectedPatternKey = key;
      // Assume match[1] is the full table & column reference and match[2] is the column name.
      tableAndCol = match[1];
      dateColumn = match[2];
      break;
    }
  }

  if (!match || !detectedPatternKey) {
    return cleanedQuery; // No date expression found, return original query.
  }

  // Build the new date expression based on the desired dateBy value.
  const newDateExpression = buildNewDateExpression(tableAndCol);

  // Replace every occurrence of the detected date expression with the new expression.
  // Use the regex of the detected pattern.
  let manipulatedQuery = cleanedQuery.replace(
    patterns[detectedPatternKey],
    newDateExpression
  );

  // Append additional GROUP BY columns if provided.
  if (additionalGroupBy) {
    // Update GROUP BY clause
    manipulatedQuery = manipulatedQuery.replace(
      /GROUP BY\s+([\s\S]+?)\s+(ORDER BY|LIMIT)/i,
      (matchStr, groupContent, nextClause) => {
        let groupCols = groupContent.split(",").map((s) => s.trim());
        if (!groupCols.includes(newDateExpression)) {
          groupCols.unshift(newDateExpression);
        }
        additionalGroupBy.split(",").forEach((col) => {
          const trimmed = col.trim();
          const colExpr = `\`${trimmed}\``;
          if (!groupCols.includes(colExpr)) {
            groupCols.push(colExpr);
          }
        });
        return `GROUP BY ${groupCols.join(", ")} ${nextClause}`;
      }
    );
    // Update ORDER BY clause similarly.
    manipulatedQuery = manipulatedQuery.replace(
      /ORDER BY\s+([\s\S]+?)\s+(LIMIT)/i,
      (matchStr, orderContent, nextClause) => {
        let orderCols = orderContent.split(",").map((s) => s.trim());
        if (!orderCols.includes(newDateExpression)) {
          orderCols.unshift(newDateExpression);
        }
        additionalGroupBy.split(",").forEach((col) => {
          const trimmed = col.trim();
          const colExpr = `\`${trimmed}\``;
          if (!orderCols.includes(colExpr)) {
            orderCols.push(colExpr);
          }
        });
        return `ORDER BY ${orderCols.join(", ")} ${nextClause}`;
      }
    );
  }

  return manipulatedQuery;
}

export function buildQuery(
  tableName: string,
  params: { [key: string]: any }
): string {
  const {
    aggregate,
    column,
    where,
    orderDirection,
    limit,
    filters,
    groupBy,
    dateView,
    dateBy,
    binColumn,
    binSize,
  } = params;

  // Helper function to apply binning to a column
  const applyBin = (col: string) => {
    if (binColumn && binSize && col === binColumn) {
      return `FLOOR(\`${col}\` / ${binSize}) * ${binSize}`;
    }
    return `${tableNameSQL}.\`${col}\``;
  };

  // Split incoming column string into an array (if provided)
  const columnsArr = column
    ? column.split(",").map((c: string) => c.trim())
    : [];

  const datetimeCandidate =
    dateBy && columnsArr.length
      ? columnsArr.find((c: string) => c.toLowerCase().includes("date"))
      : null;

  const datetimeColumn = datetimeCandidate || "";
  const nonDatetimeColumns = columnsArr.filter((c) => c !== datetimeColumn);
  const tableNameSQL = `\`${tableName}\``;

  let query = "";

  if (dateBy && datetimeColumn) {
    const datetimeColSQL = `${tableNameSQL}.\`${datetimeColumn}\``;

    let dateExpression = "";
    switch (dateBy) {
      case "minute":
        dateExpression = `STR_TO_DATE(DATE_FORMAT(${datetimeColSQL}, '%Y-%m-%d %H:%i'), '%Y-%m-%d %H:%i')`;
        break;
      case "hour":
        dateExpression = `STR_TO_DATE(DATE_FORMAT(${datetimeColSQL}, '%Y-%m-%d %H'), '%Y-%m-%d %H')`;
        break;
      case "day":
        dateExpression = `DATE(${datetimeColSQL})`;
        break;
      case "week":
        dateExpression = `DATE(${datetimeColSQL})`;
        break;
      case "month":
        dateExpression = `STR_TO_DATE(CONCAT(DATE_FORMAT(${datetimeColSQL}, '%Y-%m'), '-01'), '%Y-%m-%d')`;
        break;
      case "quarter":
        dateExpression = `STR_TO_DATE(CONCAT(YEAR(${datetimeColSQL}), '-', (QUARTER(${datetimeColSQL}) * 3) - 2, '-01'), '%Y-%m-%d')`;
        break;
      case "year":
        dateExpression = `MAKEDATE(YEAR(${datetimeColSQL}), 1)`;
        break;
      default:
        dateExpression = datetimeColSQL;
    }

    const dateSelect = `${dateExpression} AS \`${datetimeColumn}\``;
    const normalSelect = nonDatetimeColumns
      .map((col: string) => `${applyBin(col)} AS \`${col}\``)
      .join(", ");

    let selectClause = "";
    if (aggregate === "count") {
      selectClause = normalSelect
        ? `${dateSelect}, ${normalSelect}, COUNT(*) AS \`count\``
        : `${dateSelect}, COUNT(*) AS \`count\``;
    } else if (aggregate && datetimeColumn) {
      const aggSelect = `${aggregate.toUpperCase()}(${datetimeColumn}) AS \`${datetimeColumn}_${aggregate}\``;
      selectClause = normalSelect
        ? `${dateSelect}, ${normalSelect}, ${aggSelect}`
        : `${dateSelect}, ${aggSelect}`;
    } else {
      selectClause = "*";
    }

    query = `SELECT ${selectClause} FROM ${tableNameSQL}`;

    // Build the WHERE clause
    if (filters && Array.isArray(filters) && filters.length > 0) {
      const conditions = filters
        .map(
          (filter: any) =>
            `\`${filter.column}\` ${filter.operation} '${filter.value}'`
        )
        .join(" AND ");
      query += ` WHERE ${conditions}`;
    } else if (where) {
      query += ` WHERE ${where}`;
    }

    // Build the GROUP BY clause (with bin support)
    let groupByClause = "";
    if (groupBy) {
      const groupByCols = groupBy.split(",").map((c: string) => c.trim());
      groupByCols.sort((a, b) => {
        if (a.toLowerCase() === datetimeColumn.toLowerCase()) return -1;
        if (b.toLowerCase() === datetimeColumn.toLowerCase()) return 1;
        return 0;
      });
      groupByClause = groupByCols
        .map((col: string) =>
          col.toLowerCase() === datetimeColumn.toLowerCase()
            ? dateExpression
            : applyBin(col)
        )
        .join(", ");
    } else {
      const normalGroup = nonDatetimeColumns
        .map((col: string) => applyBin(col))
        .join(", ");
      groupByClause = normalGroup
        ? `${dateExpression}, ${normalGroup}`
        : dateExpression;
    }
    query += ` GROUP BY ${groupByClause}`;

    // Build the ORDER BY clause (with bin support)
    const orderByClause = `ORDER BY ${groupByClause} ${
      orderDirection || "ASC"
    }`;
    query += ` ${orderByClause}`;

    if (limit) {
      query += ` LIMIT ${Math.min(limit, 2000)}`;
    }
  } else {
    let selectClause = "";
    if (groupBy) {
      selectClause =
        groupBy
          .split(",")
          .map((c: string) => `${applyBin(c.trim())}`)
          .join(", ") + ", ";
    }
    if (aggregate === "count") {
      selectClause += "COUNT(*) AS `count`";
    } else if (aggregate && column) {
      const cols = column.split(",").map((c: string) => c.trim());
      selectClause += `${aggregate.toUpperCase()}(${cols.join(
        ", "
      )}) AS ${cols.join("_")}_${aggregate}`;
    } else {
      selectClause = "*";
    }

    query = `SELECT ${selectClause} FROM ${tableNameSQL}`;

    if (filters && Array.isArray(filters) && filters.length > 0) {
      const conditions = filters
        .map(
          (filter: any) =>
            `\`${filter.column}\` ${filter.operation} '${filter.value}'`
        )
        .join(" AND ");
      query += ` WHERE ${conditions}`;
    } else if (where) {
      query += ` WHERE ${where}`;
    }

    if (groupBy) {
      const groupByColumns = groupBy
        .split(",")
        .map((c: string) => applyBin(c.trim()))
        .join(", ");
      query += ` GROUP BY ${groupByColumns}`;
      query += ` ORDER BY ${groupByColumns} ${orderDirection || "ASC"}`;
    }

    if (limit) {
      query += ` LIMIT ${Math.min(limit, 2000)}`;
    }
  }

  return query.trim();
}
