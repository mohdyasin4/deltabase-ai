export const handleApplyAggregate = (func: string, column: string, rows: any[], toast: any) => {
  try {
    if (!rows.length) {
      toast.error("No data available for aggregation");
      return;
    }

    let result;
    const numericData = rows.map(item => ({
      ...item,
      [column]: parseFloat(item[column])
    })).filter(item => !isNaN(item[column]));

    if (!numericData.length) {
      toast.error("No numeric data available for the selected column");
      return;
    }

    switch (func) {
      case "COUNT":
        result = [{
          aggregate_result: rows.length,
          function: "COUNT",
          column: column
        }];
        break;
      case "SUM":
        result = [{
          aggregate_result: numericData.reduce((sum, item) => sum + item[column], 0),
          function: "SUM",
          column: column
        }];
        break;
      // Add other aggregate functions as needed
      default:
        toast.error("Invalid aggregate function");
        return;
    }

    return result;
  } catch (error) {
    toast.error("An error occurred while applying the aggregate function");
  }
};