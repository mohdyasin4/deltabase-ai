import { create } from "zustand";

interface StoreState {
  apiDetails: any;
  allColumns: string[];
  columns: string[];
  rows: any[];
  loading: boolean;
  searchTerm: string;
  isOpen: boolean;
  sqlQuery: string;
  sqlAiQuery: string;
  queryLoading: boolean;
  apiUrl: string;
  tables: string[];
  isSaveOpen: boolean;
  isFilterOpen: boolean;
  newDatasetName: string;
  datasetDescription: string;
  selectedVisualization: string;
  xAxis: string;
  yAxis: string[];
  limit?: number;
  limitOption: "default" | "custom";
  customLimit?: number;
  widgetTitle: string;
  description: string;
  activeTab: string;
  selectedColumn: string | null;
  executionTime: number;
  isStacked: boolean;
  apiUrlLoading: boolean;
  data: any[];
  effectiveTableName: string;
  originalQuery: string;
  primaryKeys: string;
  filters: any[];
  columnTypes: any[];
  selectedDateBy?: any;
  columnMetadata: { name: string; type: string }[];
  selectedDateView?: any;
  datetimeColumns: string[];
  selectedAggregate: string | null;
  selectedValues: string[];
  groupByValue: string[];
  rawRows: any[];
  connection_id: string | null;
  schemaScope: string;
  dataset_id: string | null;
  apiId: string | null;
  csvId: string | null;
  tableName: string;
  setConnectionId: (id: string | null) => void;
  setExecutionTime: (time: number) => void;
  setDatasetId: (id: string | null) => void;
  setApiId: (id: string | null) => void;
  setCsvId: (id: string | null) => void;
  setTableNamee: (name: string) => void;
  setApiDetails: (details: any) => void;
  setAllColumns: (columns: string[]) => void;
  setColumns: (columns: string[]) => void;
  setRows: (rows: any[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchTerm: (term: string) => void;
  setIsOpen: (open: boolean) => void;
  setSqlQuery: (query: string) => void;
  setSqlAiQuery: (query: string) => void;
  setQueryLoading: (loading: boolean) => void;
  setApiUrl: (url: string) => void;
  setTables: (tables: string[]) => void;
  setIsSaveOpen: (open: boolean) => void;
  setIsFilterOpen: (open: boolean) => void;
  setNewDatasetName: (name: string) => void;
  setDatasetDescription: (desc: string) => void;
  setSelectedVisualization: (viz: string) => void;
  setXAxis: (axis: string) => void;
  setYAxis: (axis: string[]) => void;
  setLimit: (limit: number | undefined) => void;
  setLimitOption: (option: "default" | "custom") => void;
  setCustomLimit: (limit: number | undefined) => void;
  setWidgetTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setActiveTab: (tab: string) => void;
  setSelectedColumn: (col: string | null) => void;
  setIsStacked: (stacked: boolean) => void;
  setApiUrlLoading: (loading: boolean) => void;
  setData: (data: any[]) => void;
  setTableName: (name: string) => void;
  setEffectiveTableName: (name: string) => void;
  setOriginalQuery: (query: string) => void;
  setPrimaryKeys: (keys: string) => void;
  setFilters: (filters: any[]) => void;
  setColumnTypes: (types: any[]) => void;
  setColumnMetadata: (metadata: { name: string; type: string }[]) => void;
  setSelectedDateBy: (dateBy: any) => void;
  setSelectedDateView: (dateView: any) => void;
  setDatetimeColumns: (columns: string[]) => void;
  setSelectedAggregate: (aggregate: string | null) => void;
  setSchemaScope: (scope: string) => void;
  setSelectedValues: (values: string[]) => void;
  setGroupByValue: (values: string[]) => void;
  setRawRows: (rows: any[]) => void;
}

export const useStore = create<StoreState>((set) => ({
  apiDetails: null,
  allColumns: [],
  columns: [],
  rows: [],
  loading: true,
  searchTerm: "",
  isOpen: false,
  sqlQuery: "",
  sqlAiQuery: "",
  queryLoading: false,
  apiUrl: "",
  tables: [],
  isSaveOpen: false,
  isFilterOpen: false,
  newDatasetName: "",
  executionTime: 0,
  datasetDescription: "",
  selectedVisualization: "table",
  xAxis: "",
  yAxis: [],
  limit: undefined,
  limitOption: "default",
  customLimit: undefined,
  widgetTitle: "",
  description: "",
  activeTab: "visualization",
  selectedColumn: null,
  isStacked: false,
  apiUrlLoading: false,
  data: [],
  effectiveTableName: "",
  originalQuery: "",
  primaryKeys: "",
  filters: [],
  columnTypes: [],
  columnMetadata: [],
  selectedDateBy: undefined,
  selectedDateView: undefined,
  datetimeColumns: [],
  selectedAggregate: null,
  selectedValues: [],
  groupByValue: [],
  rawRows: [],
  connection_id: "",
  dataset_id: "",
  schemaScope: "",
  apiId: "",
  csvId: "",
  tableName: "",
  setConnectionId: (id) => set({ connection_id: id }),
  setDatasetId: (id) => set({ dataset_id: id }),
  setApiId: (id) => set({ apiId: id }),
  setCsvId: (id) => set({ csvId: id }),
  setTableNamee: (name) => set({ tableNamee: name }),
  setApiDetails: (details) => set({ apiDetails: details }),
  setAllColumns: (columns) => set({ allColumns: columns }),
  setColumns: (columns) => set({ columns }),
  setRows: (rows) => set({ rows }),
  setLoading: (loading) => set({ loading }),
  setExecutionTime: (time) => set({ executionTime: time }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setIsOpen: (open) => set({ isOpen: open }),
  setSqlQuery: (query) => set({ sqlQuery: query }),
  setSqlAiQuery: (query) => set({ sqlAiQuery: query }),
  setQueryLoading: (loading) => set({ queryLoading: loading }),
  setApiUrl: (url) => set({ apiUrl: url }),
  setTables: (tables) => set({ tables }),
  setIsSaveOpen: (open) => set({ isSaveOpen: open }),
  setIsFilterOpen: (open) => set({ isFilterOpen: open }),
  setNewDatasetName: (name) => set({ newDatasetName: name }),
  setDatasetDescription: (desc) => set({ datasetDescription: desc }),
  setSelectedVisualization: (viz) => set({ selectedVisualization: viz }),
  setXAxis: (axis) => set({ xAxis: axis }),
  setYAxis: (axis) => set({ yAxis: axis }),
  setLimit: (limit) => set({ limit }),
  setLimitOption: (option) => set({ limitOption: option }),
  setCustomLimit: (limit) => set({ customLimit: limit }),
  setWidgetTitle: (title) => set({ widgetTitle: title }),
  setDescription: (desc) => set({ description: desc }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedColumn: (col) => set({ selectedColumn: col }),
  setIsStacked: (stacked) => set({ isStacked: stacked }),
  setApiUrlLoading: (loading) => set({ apiUrlLoading: loading }),
  setData: (data) => set({ data }),
  setTableName: (name) => set({ tableName: name }),
  setEffectiveTableName: (name) => set({ effectiveTableName: name }),
  setOriginalQuery: (query) => set({ originalQuery: query }),
  setPrimaryKeys: (keys) => set({ primaryKeys: keys }),
  setFilters: (filters) => set({ filters }),
  setColumnTypes: (types) => set({ columnTypes: types }),
  setColumnMetadata: (metadata) => set({ columnMetadata: metadata }),
  setSelectedDateBy: (dateBy) => set({ selectedDateBy: dateBy }),
  setSelectedDateView: (dateView) => set({ selectedDateView: dateView }),
  setDatetimeColumns: (columns) => set({ datetimeColumns: columns }),
  setSelectedAggregate: (aggregate) => set({ selectedAggregate: aggregate }),
  setSchemaScope: (scope) => set({ schemaScope: scope }),
  setSelectedValues: (values) => set({ selectedValues: values }),
  setGroupByValue: (values) => set({ groupByValue: values }),
  setRawRows: (rows) => set({ rawRows: rows }),
}));
