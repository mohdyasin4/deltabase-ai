import React from "react";
import {
  BarChart,
  LineChart,
  PieChart,
  AreaChart, // Import AreaChart
  Area,      // Import Area for rendering area charts
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
  Label,
  defs,
  linearGradient, // Required for gradient
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Modify yAxis to be an array of strings
interface ChartWidgetProps {
  chartType: "bar" | "line" | "pie" | "area"; // Added "area" to chartType
  chartData?: any[]; // Data for the chart
  pieData?: any[]; // Data for the pie chart
  xAxis?: string; // X-axis key
  yAxis?: string | string[]; // Y-axis, can be an array of strings
  chartConfig?: any; // Optional chartConfig if needed for customization
  stacked?: boolean; // Optional stacked prop for bar/area chart
}

export const ChartWidget = ({
  chartType,
  chartData,
  pieData,
  xAxis,
  yAxis,
  chartConfig,
  stacked,
}: ChartWidgetProps) => {

  console.log("yAxis", yAxis);
  // yAxis is already an array of strings
  const yAxisArray = Array.isArray(yAxis) ? yAxis : [yAxis];
  console.log("yAxisArray", yAxisArray);
  return (
    <div className="h-full">
      <div className="h-full bg-background-100 p-4">
        <ChartContainer config={chartConfig} className="h-full w-full">
          {chartType === "bar" ? (
            <BarChart accessibilityLayer data={chartData}>
              <XAxis dataKey={xAxis} />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {/* Render multiple bars for each yAxis key */}
              {yAxisArray.map((key, index) => (
                <Bar
                  key={index}
                  dataKey={key}
                  fill={getColor(index)}
                  stackId={stacked ? "a" : undefined} // If stacked, use the same stackId
                />
              ))}
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={chartData}>
              <XAxis dataKey={xAxis} />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {/* Render multiple lines for each yAxis key */}
              {yAxisArray.map((key, index) => (
                <Line key={index} type="monotone" dataKey={key} stroke={getColor(index)} />
              ))}
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={chartData}>
              <defs>
                {yAxisArray.map((_, index) => (
                  <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getColor(index)} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={getColor(index)} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey={xAxis} />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {/* Render multiple areas for each yAxis key */}
              {yAxisArray.map((key, index) => (
                <Area
                  key={index}
                  type="monotone"
                  dataKey={key}
                  stroke={getColor(index)}
                  fillOpacity={1}
                  fill={`url(#gradient-${index})`}
                  stackId={stacked ? "a" : undefined} // Stack areas if stacked is true
                />
              ))}
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={pieData} // Accessing the filteredRows here
                dataKey="value" // The key for values in your filteredRows
                nameKey="name" // The key for names in your filteredRows
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={100}
                strokeWidth={1}
                label
              >
                {pieData &&
                  pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} /> // Use the color defined in each entry
                  ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const totalValue = (pieData ?? []).reduce(
                        (acc, curr) => acc + curr.value,
                        0
                      );
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {totalValue.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 35}
                            className="fill-muted-foreground"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          )}
        </ChartContainer>
      </div>
    </div>
  );
};

// Utility function to return different colors for each bar/line/area
const getColor = (index: number) => {
  const colors = ["#ffbe19", "#8884d8", "#82ca9d", "#ffc658", "#a4de6c"];
  return colors[index % colors.length];
};
