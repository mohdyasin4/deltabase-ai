//app/dashboard/_components/VisualizationRenderer.tsx
import React, { useEffect } from 'react';
import { DataTable } from '@/app/dashboard/_components/data-table';
import { NumberWidget } from '@/app/dashboard/_components/NumberWidget';
import { ChartWidget } from '@/app/dashboard/_components/ChartWidget';
import { FilterRow } from './FilterDialog';

type VisualizationRendererProps = {
  selectedVisualization: string;
  rows: any[]; // You can define a more specific type for your rows based on your data
  filteredRows: any[];
  columns: string[];
  xAxis: string;
  yAxis: string[];
  limit: number;
  chartData: any; // Type this based on your chart data structure
  chartConfig: any; // Type this based on your chart config structure
  colors?: string[];
  selectedColumn: string; // Currently selected column for table visualization
  searchTerm: string;
  tablePagination: boolean; // Flag to control pagination in the data table
  stacked?: boolean; // Prop to toggle stacked bar chart
  gridWidth: number;
  filters: FilterRow[];
  primaryKeys: string;
  loading: boolean;
  setSearchTerm: (term: string) => void;
  setLimit: (value: number) => void;
  setXAxis: (value:string) => void;
  setYAxis: (value:string) => void;
  fetchDbData: (aggregate?: string, column?: string, limit?:string) => void;
  applyFilters: (newFilters?: FilterRow[]) => Promise<void>; 
  setFilters: (filter: FilterRow[]) => void;
};
const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({
  selectedVisualization,
  rows,
  filteredRows,
  columns,
  xAxis,
  yAxis,
  limit,
  chartData,
  chartConfig,
  loading,
  colors,
  selectedColumn,
  primaryKeys,
  searchTerm,
  tablePagination,
  stacked,
  gridWidth,
  setSearchTerm,
  setLimit,
  setXAxis,
  setYAxis,
  setFilters,
  filters,
  fetchDbData,
  applyFilters
}) => {
  const renderVisualization = () => {
    console.log('selectedVisualization', selectedVisualization);
    console.log('Smart X:', xAxis, 'Smart Y:', yAxis);
    
    console.log("ChaDt", chartData);
    switch (selectedVisualization) {      case 'table':
        return (
          <div className="h-full w-full flex flex-col overflow-hidden">
            <DataTable
              rows={filteredRows}
              setSearchTerm={setSearchTerm}
              searchTerm={searchTerm}
              filters={filters}
              setFilters={setFilters}
              loading={loading}
              applyFilters={applyFilters}
              fetchDbData={fetchDbData}
              primaryKeys={primaryKeys}
              pagination={tablePagination}
            />
          </div>
        );
      
      case 'number':
        const numberValue = filteredRows.length
          ? filteredRows[0][selectedColumn || Object.keys(filteredRows[0])[0]]
          : (rows.length ? rows[0][selectedColumn || Object.keys(rows[0])[0]] : "No data");
        return <NumberWidget numberValue={numberValue} />;
      
      case 'bar':
      case 'line':
      case 'area':
        return (
          <ChartWidget
            chartType={selectedVisualization}
            chartData={chartData}
            xAxis={xAxis}
            yAxis={yAxis}
            chartConfig={chartConfig}
            stacked={stacked}
          />
        );
      case 'pie':
        
        const pieData = filteredRows.map((row, index) => ({
          name: row[xAxis],
          value: row[yAxis[0]], // Pie chart only takes one Y-axis
          color: colors ? colors[index % colors.length] : undefined,
        }));
        return (
          <ChartWidget
            chartType="pie"
            chartConfig={chartConfig}
            pieData={pieData}
          />
        );

      default:
        return null;
    }
  };

  return <div className="relative h-full w-full bg-background transition-opacity duration-300 ease-in-out opacity-100" id="chart-widget">{renderVisualization()}</div>;
};

export default VisualizationRenderer;
