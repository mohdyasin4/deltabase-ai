//app/dashboard/_components/VisualizationRenderer.tsx
import React, { useEffect } from 'react';
import { DataTable } from '@/app/dashboard/_components/data-table';
import { NumberWidget } from '@/app/dashboard/_components/NumberWidget';
import { ChartWidget } from '@/app/dashboard/_components/ChartWidget';

type VisualizationRendererProps = {
  selectedVisualization: string;
  rows: any[]; // You can define a more specific type for your rows based on your data
  filteredRows: any[];
  columns: string[];
  xAxis: string;
  yAxis: string[];
  setXAxis: (value:string) => void;
  setYAxis: (value:string) => void;
  chartData: any; // Type this based on your chart data structure
  chartConfig: any; // Type this based on your chart config structure
  colors?: string[];
  selectedColumn: string; // Currently selected column for table visualization
  setSearchTerm: (term: string) => void;
  searchTerm: string;
  tablePagination: boolean; // Flag to control pagination in the data table
  stacked?: boolean; // Prop to toggle stacked bar chart
  gridWidth: number;
};
const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({
  selectedVisualization,
  rows,
  filteredRows,
  columns,
  xAxis,
  yAxis,
  setXAxis,
  setYAxis,
  chartData,
  chartConfig,
  colors,
  selectedColumn,
  setSearchTerm,
  searchTerm,
  tablePagination,
  stacked,
  gridWidth,
}) => {
  const renderVisualization = () => {
    console.log('selectedVisualization', selectedVisualization);
    console.log('Smart X:', xAxis, 'Smart Y:', yAxis);
    
    
    switch (selectedVisualization) {
      case 'table':
        return (
          <DataTable
            setSearchTerm={setSearchTerm}
            searchTerm={searchTerm}
            rows={filteredRows}
            pagination={tablePagination}
          />
        );
      
      case 'number':
        const numberValue = filteredRows.length
          ? filteredRows[0][selectedColumn || Object.keys(filteredRows[0])[0]]
          : (rows.length ? rows[0][selectedColumn || Object.keys(rows[0])[0]] : "No data");
        return <NumberWidget numberValue={numberValue} gridWidth={gridWidth}/>;
      
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
          value: row[yAxis], // Pie chart only takes one Y-axis
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

  return <div className='h-full w-full'>{renderVisualization()}</div>;
};

export default VisualizationRenderer;
