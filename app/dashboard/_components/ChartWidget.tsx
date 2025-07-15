"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Label as RechartsLabel,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  Line,
  Area,
  ComposedChart,
  ReferenceArea,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ChartWidgetProps {
  chartType: "bar" | "line" | "pie" | "area";
  chartData?: any[];
  pieData?: any[];
  xAxis?: string;
  yAxis?: string[]; // Now expecting an array of keys for Y-Axis (user-selected)
  chartConfig?: any;
  stacked?: boolean;
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
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  // Use filteredChartData for zooming and rendering
  const [zoomedData, setZoomedData] = useState<any[]>(chartData || []);
  const chartRef = useRef<HTMLDivElement>(null);  const [hover, setHover] = useState<string | undefined>();
  const [focusBar, setFocusBar] = useState<number | null>(null);
  const [mouseLeave, setMouseLeave] = useState(true);

  // Handle mouse leave for clearing hover states
  const handleMouseLeave = () => {
    setFocusBar(null);
    setMouseLeave(true);
    setHover(undefined);
  };

  // Handle pie chart mouse leave with delay to prevent flickering
  const handlePieMouseLeave = () => {
    setTimeout(() => {
      setFocusBar(null);
      setMouseLeave(true);
    }, 50);
  };

  // Create a filtered version of chartData using only the xAxis and user‑selected yAxis keys.
  const filteredChartData = useMemo(() => {
    if (!chartData || !xAxis) return [];
    if (yAxis && yAxis.length > 0) {
      return chartData.map((item) => {
        const filteredItem: any = { [xAxis]: item[xAxis] };
        yAxis.forEach((key) => {
          if (key in item) {
            filteredItem[key] = item[key];
          }
        });
        return filteredItem;
      });
    }
    // Fallback: if no user selection, return the original data.
    return chartData;
  }, [chartData, xAxis, yAxis]);

  // Use user-selected yAxis if provided; otherwise, derive from filteredChartData.
  const yAxisKeys = useMemo(() => {
    if (yAxis && yAxis.length > 0) {
      return yAxis;
    }
    if (!filteredChartData || filteredChartData.length === 0) return [];
    return Object.keys(filteredChartData[0]).filter((key) => key !== xAxis);
  }, [filteredChartData, xAxis, yAxis]);

  // Update zoomedData when filteredChartData changes
  useEffect(() => {
    if (filteredChartData) {
      setZoomedData(filteredChartData);
    }
  }, [filteredChartData, chartType]);
  // Zoom logic remains as before – using xAxis from props.
  useEffect(() => {
    if (filteredChartData && startTime && endTime && xAxis) {
      const leftIndex = filteredChartData.findIndex((d) => d[xAxis] === startTime);
      const rightIndex = filteredChartData.findIndex((d) => d[xAxis] === endTime);
      const filtered = filteredChartData.slice(leftIndex, rightIndex + 1);
      setZoomedData(filtered);
    }
  }, [filteredChartData, startTime, endTime, xAxis]);

  // Utility: format X-axis if it’s a date
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  console.log("Filtered Chart Data:", filteredChartData);
  console.log("Computed Y-Axis Keys:", yAxisKeys);
  // Zoom handlers (mouse and touch events) remain unchanged.
  const handleMouseDown = (data: any) => {
    if (xAxis && data?.activePayload?.[0]?.payload && data.activePayload[0].payload[xAxis] !== undefined) {
      setRefAreaLeft(data.activePayload[0].payload[xAxis]);
      setRefAreaRight(null);
    }  };
  
  const handleMouseMove = (data: any) => {
    if (
      refAreaLeft &&
      xAxis &&
      data?.activePayload?.[0]?.payload &&
      data.activePayload[0].payload[xAxis] !== undefined
    ) {
      setRefAreaRight(data.activePayload[0].payload[xAxis]);
    }

    if (data?.isTooltipActive) {
      setFocusBar(data.activeTooltipIndex);
      setMouseLeave(false);
    } else {
      setFocusBar(null);
      setMouseLeave(true);
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft !== null && refAreaRight !== null) {
      const [left, right] =
        refAreaLeft < refAreaRight
          ? [refAreaLeft, refAreaRight]
          : [refAreaRight, refAreaLeft];
      setStartTime(left);
      setEndTime(right);
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };
  const handleZoom = (
    e: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    if (!filteredChartData || !chartRef.current) return;
    // ... your existing zoom logic ...
  };

  const resetZoom = () => {
    setZoomedData(filteredChartData);
    setStartTime(null);
    setEndTime(null);
  };
  
  // Render pie chart if chartType is "pie"
  if (chartType === "pie" && pieData) {
    console.log("pieData:", pieData);
    const measureKey = (Array.isArray(yAxis) ? yAxis[0] : yAxis) || "value";
    const total = pieData.reduce((acc, cur) => acc + (cur[measureKey] || 0), 0);    return (
      <div 
        onMouseLeave={handlePieMouseLeave}
        className="h-full w-full"
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
            className="transition-all duration-400 ease-in-out"
            >
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              dataKey="value"
              cy="50%"
              innerRadius="40%" // instead of 140
              outerRadius="80%" // instead of 240
              paddingAngle={3}
              fill={chartConfig?.color || "#8884d8"}
              className="transition-all duration-300 ease-in-out cursor-pointer"
              label
              style={{ transition: "all 600ms ease-in-out cursor-pointer" }}
            >
              {pieData.map((entry, cellIndex) => {
                return (
                  <Cell
                    key={`cell-${cellIndex}`}
                    fill={getColor(cellIndex)}
                    style={{ fill: getColor(cellIndex) }}                    fillOpacity={
                      focusBar === null || focusBar === cellIndex ? 1 : 0.4
                    }
                    stroke="none"
                    onMouseEnter={() => {
                      setFocusBar(cellIndex);
                      setMouseLeave(false);
                    }}
                    onMouseLeave={() => {
                      // Don't clear immediately to prevent flickering
                    }}
                    className="transition-all duration-200 ease-in-out cursor-pointer hover:brightness-110"
                  />
                );
              })}
              <RechartsLabel
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const hoveredValue =
                      focusBar !== null &&
                      pieData[focusBar] &&
                      pieData[focusBar][measureKey] != null
                        ? pieData[focusBar][measureKey]
                        : null;
                    const displayValue =
                      hoveredValue == null ? total : hoveredValue;                    const displayLabel =
                      hoveredValue == null
                        ? "Total"
                        : (focusBar !== null && pieData[focusBar] ? pieData[focusBar].name : "Others") || "Others";
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-foreground"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          style={{
                            fontSize: "30px",
                            fontWeight: "bold",
                            fill: "currentColor",
                          }}
                        >
                          {displayValue.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          style={{
                            fontSize: "16px",
                            fill: "currentColor",
                            opacity: 0.4,
                          }}
                        >
                          {displayLabel}
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
            <ChartLegend
              content={({ payload }) => {
                return (
                  <div className="flex items-center justify-center flex-wrap">
                    {payload?.map((entry, index) => {
                      const isActive = focusBar === index;
                      return (
                        <div
                          key={`legend-${index}`}
                          className={`mr-4 flex items-center transition-all duration-300`}
                          onMouseEnter={() => setFocusBar(index)}
                          onMouseLeave={() => setFocusBar(null)}
                          style={{
                            opacity: focusBar === null ? 1 : isActive ? 1 : 0.5,
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-[2px] transition-all duration-300"
                            style={{
                              backgroundColor: entry.color,
                              opacity: isActive ? 1 : 0.6,
                            }}
                          ></div>
                          <span className="ml-2">
                            {entry.value || "Unknown"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
              verticalAlign="bottom"
              align="center"            />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      </div>
    );
  }  // For bar, line, or area charts, use filteredChartData
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        onWheel={handleZoom}
        onTouchMove={handleZoom}
        onMouseLeave={handleMouseLeave}
        ref={chartRef}
        style={{ touchAction: "none" }}
        className="h-full w-full"
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer 
            width="100%" 
            height="100%" 
            className="h-full w-full"
            minHeight={150}
          >
            <ComposedChart
              data={zoomedData}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              margin={{ top: 15, right: 15, bottom: 30, left: 15 }}
            >
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartConfig?.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chartConfig?.color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" style={{ opacity: "0.4" }} />              <XAxis
                dataKey={xAxis}
                tickFormatter={(value) => `${value}`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
                angle={0}
                textAnchor="middle"
                style={{ fontSize: "11px", userSelect: "none" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                style={{ fontSize: "11px", userSelect: "none" }}
                width={45}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value;
                }}              />
              <ChartTooltip
                cursor={true}
                content={
                  <ChartTooltipContent
                    className="w-[150px] sm:w-[200px] font-mono text-xs sm:text-sm"
                    labelFormatter={(value) => String(value)}
                  />
                }
              />              <ChartLegend
                content={({ payload }) => {
                  return (
                    <div className="mt-4 flex items-center justify-center flex-wrap">
                      {payload?.map((entry, index) => {
                        const isActive = focusBar === index;
                        return (
                          <div
                            key={`legend-${index}`}
                            className={`mr-4 flex items-center transition-all duration-300`}
                            onMouseEnter={() => setFocusBar(index)}
                            onMouseLeave={() => setFocusBar(null)}
                            style={{
                              opacity: focusBar === null ? 1 : isActive ? 1 : 0.5,
                            }}
                          >
                            <div
                              className="w-2 h-2 rounded-[2px] transition-all duration-300"
                              style={{
                                backgroundColor: entry.color,
                                opacity: isActive ? 1 : 0.6,
                              }}
                            ></div>
                            <span className="ml-2">
                              {entry.value || "Unknown"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
                verticalAlign="bottom"
                align="center"
                formatter={(value) => String(value).toUpperCase()}
              />
              {yAxisKeys.map((key, index) =>
                chartType === "bar" ? (
                  <Bar
                    key={index}
                    dataKey={key}
                    fill={getColor(index)}
                    stackId={stacked ? "a" : undefined}
                  >
                    {filteredChartData?.map((entry, barIndex) => (
                      <Cell
                        key={barIndex}
                        fill={
                          focusBar === null || focusBar === barIndex
                            ? getColor(index)
                            : getColor(index) + "20"
                        }
                        onMouseEnter={() => setFocusBar(barIndex)}
                        onMouseLeave={() => setFocusBar(null)}
                        style={{ transition: "fill 200ms ease-in-out" }}
                      />
                    ))}
                  </Bar>
                ) : chartType === "line" ? (
                  <Line key={index} type="linear" dataKey={key} stroke={getColor(index)}>
                    <LabelList
                      dataKey={key}
                      position="top"
                      style={{
                        fill: chartConfig?.[key]?.color || "text-foreground",
                        fontSize: 10,
                      }}
                    />
                  </Line>
                ) : (
                  <Area
                    key={index}
                    type="monotone"
                    dataKey={key}
                    stroke={getColor(index)}
                    fill={getColor(index)}
                    fillOpacity={hover === key ? 0.5 : 0.2}
                    onMouseEnter={() => setHover(key)}
                    onMouseLeave={() => setHover(undefined)}
                    className="transition-all duration-200 ease-in-out cursor-crosshair"
                    isAnimationActive={false}
                    stackId={stacked ? "a" : undefined}
                    style={{ transition: "fill-opacity 200ms ease-in-out" }}
                  >
                    <LabelList
                      dataKey={key}
                      position="top"
                      style={{
                        fill: chartConfig?.[key]?.color || "text-foreground",
                        fontSize: 10,
                      }}
                    />
                  </Area>
                )
              )}
              {refAreaLeft && refAreaRight && (
                <ReferenceArea
                  key={Math.random()}
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  strokeOpacity={0.3}
                  fill="hsl(var(--foreground))"
                  fillOpacity={0.05}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

/** Utility to pick a color from the palette */
const getColor = (index: number) => {
  const colors = ["#FF9800", "#4CAF50", "#2196F3", "#9C27B0", "#FF5733"];
  return colors[index % colors.length];
};
