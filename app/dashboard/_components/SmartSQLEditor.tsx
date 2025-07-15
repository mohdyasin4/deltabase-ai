"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MonacoEditor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Copy, 
  Code2,
  Loader2,
  Database,
  Eye,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface ProfessionalSQLEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onExecute?: (query: string) => void;
  onExplain?: (query: string) => void;
  onOptimize?: (query: string) => void;
  loading?: boolean;
  className?: string;
  height?: string;
  readOnly?: boolean;
  tables?: string[];
  columns?: string[];
  connectionId?: string;
}

interface DatabaseSchema {
  tables: string[];
  columns: { [tableName: string]: string[] };
  columnTypes: { [tableName: string]: { columnName: string; dataType: string }[] };
}

const ProfessionalSQLEditor: React.FC<ProfessionalSQLEditorProps> = ({
  value = "",
  onChange,
  onExecute,
  onExplain,
  onOptimize,
  loading = false,
  className = "",
  height = "100%",
  readOnly = false,
  tables = [],
  columns = [],
  theme = "dark",
  connectionId,
}) => {  const [editorValue, setEditorValue] = useState(value);
  const [isFormatting, setIsFormatting] = useState(false);
  const [dbSchema, setDbSchema] = useState<DatabaseSchema>({ tables: [], columns: {}, columnTypes: {} });
  const [schemaLoading, setSchemaLoading] = useState(false);
  const { theme: systemTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');
  const editorRef = useRef<any>(null);
  const inlineSuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Detect system theme preference
  useEffect(() => {
    const detectTheme = () => {
      // Check if user has selected a specific theme
      if (systemTheme && systemTheme !== 'system') {
        setCurrentTheme(systemTheme as 'light' | 'dark');
        return;
      }

      // Fall back to system preference or HTML class
      const htmlElement = document.documentElement;
      const isDark = htmlElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      setCurrentTheme(isDark ? 'dark' : 'light');
    };

    detectTheme();

    // Listen for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', detectTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', detectTheme);
    };
  }, [systemTheme]);

  useEffect(() => {
    if (value && value !== editorValue) {
      const formatted = autoFormatSQL(value);
      setEditorValue(formatted);
    }
  }, [value, editorValue]);

  // Fetch database schema when connectionId changes
  useEffect(() => {
    const fetchDatabaseSchema = async () => {
      if (!connectionId) {
        console.log("❌ No connectionId, skipping schema fetch");
        return;
      }
      
      setSchemaLoading(true);
      try {
        console.log("🔍 Fetching database schema for connection:", connectionId);
        const response = await fetch(`/api/database/${connectionId}/schema`);
        
        if (!response.ok) {
          throw new Error(`Schema fetch failed: ${response.status}`);
        }
        
        const schema: DatabaseSchema = await response.json();
        console.log("✅ Database schema loaded:", {
          tables: schema.tables.length,
          totalColumns: Object.values(schema.columns).flat().length
        });
        
        setDbSchema(schema);
      } catch (error) {
        console.error("❌ Error fetching database schema:", error);
        // Fallback to props if schema fetch fails
        setDbSchema({
          tables: tables || [],
          columns: {},
          columnTypes: {}
        });
      } finally {
        setSchemaLoading(false);
      }
    };    fetchDatabaseSchema();
  }, [connectionId, tables]);

  // Update Monaco Editor theme when currentTheme changes
  useEffect(() => {
    if (editorRef.current) {
      // Import monaco dynamically to avoid SSR issues
      import('monaco-editor').then((monaco) => {
        monaco.editor.setTheme(currentTheme === "dark" ? "professional-dark" : "professional-light");
      });
    }
  }, [currentTheme]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (inlineSuggestTimeoutRef.current) {
        clearTimeout(inlineSuggestTimeoutRef.current);
      }
    };
  }, []);

  // Smart table suggestion function
  const suggestTable = () => {
    if (!editorRef.current) return;
    
    const availableTables = dbSchema.tables.length > 0 ? dbSchema.tables : tables;
    if (!availableTables.length) return;
    
    const position = editorRef.current.getPosition();
    const model = editorRef.current.getModel();
    
    if (!position || !model) return;
    
    const currentLine = model.getLineContent(position.lineNumber);
    const linePrefix = currentLine.substring(0, position.column - 1).toLowerCase();
    
    let tableToInsert = "";
    
    // Smart table insertion based on context
    if (linePrefix.endsWith("from") || linePrefix.endsWith("from ")) {
      tableToInsert = linePrefix.endsWith(" ") ? availableTables[0] : ` ${availableTables[0]}`;
    } else if (linePrefix.endsWith("join") || linePrefix.endsWith("join ")) {      // Find unused tables
      const usedTables = model.getValue().toLowerCase().match(/(?:from|join)\s+(\w+)/g) || [];
      const unusedTables = availableTables.filter(table => 
        !usedTables.some((used: string) => used.includes(table.toLowerCase()))
      );
      if (unusedTables.length > 0) {
        tableToInsert = linePrefix.endsWith(" ") ? unusedTables[0] : ` ${unusedTables[0]}`;
      }
    } else {
      // Just insert the first table
      tableToInsert = ` ${availableTables[0]}`;
    }
    
    if (tableToInsert) {
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };
      
      const op = { range, text: tableToInsert };
      model.pushEditOperations([], [op], () => null);
      
      // Update editor value
      const newValue = model.getValue();
      setEditorValue(newValue);
      onChange?.(newValue);
      
      // Trigger completion suggestions after table insertion
      setTimeout(() => {
        editorRef.current?.trigger('keyboard', 'editor.action.triggerSuggest', {});
      }, 100);
    }
  };

  // Auto-format function for quick formatting
  const autoFormatSQL = (sql: string): string => {
    if (!sql || sql.trim().length === 0) return sql;
      try {
      return sql
        .replace(/\s+/g, ' ')
        .replace(/\bSELECT\b/gi, 'SELECT')
        .replace(/\bFROM\b/gi, '\nFROM')
        .replace(/\bWHERE\b/gi, '\nWHERE')
        .replace(/\bAND\b/gi, '\n  AND')
        .replace(/\bOR\b/gi, '\n  OR')
        .replace(/\bJOIN\b/gi, '\nJOIN')
        .replace(/\bLEFT\s+JOIN\b/gi, '\nLEFT JOIN')
        .replace(/\bRIGHT\s+JOIN\b/gi, '\nRIGHT JOIN')
        .replace(/\bINNER\s+JOIN\b/gi, '\nINNER JOIN')
        .replace(/\bGROUP\s+BY\b/gi, '\nGROUP BY')
        .replace(/\bORDER\s+BY\b/gi, '\nORDER BY')
        .replace(/\bHAVING\b/gi, '\nHAVING')
        .replace(/\bLIMIT\b/gi, '\nLIMIT')
        .replace(/,\s*(?=\w)/g, ',\n  ')
        .trim();
    } catch (error) {
      console.error('Auto-format error:', error);
      return sql;
    }
  };
  const handleEditorMount = (editor: any, monaco: typeof import("monaco-editor")) => {
    editorRef.current = editor;
    
    // Define professional dark theme with brand colors
    monaco.editor.defineTheme("professional-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword.sql", foreground: "#ffcc19", fontStyle: "bold" },
        { token: "string.sql", foreground: "#ce9178" },
        { token: "comment", foreground: "#6a9955", fontStyle: "italic" },
        { token: "number", foreground: "#b5cea8" },
        { token: "operator.sql", foreground: "#d4d4d4" },
        { token: "identifier", foreground: "#9cdcfe" },
        { token: "type", foreground: "#4ec9b0" },
        { token: "function", foreground: "#dcdcaa" },
      ],
      colors: {
        "editor.background": "#1a1a1a",
        "editor.foreground": "#f0f0f0",
        "editorLineNumber.foreground": "#666666",
        "editorLineNumber.activeForeground": "#ffcc19",
        "editor.selectionBackground": "#ffcc19/20",
        "editorCursor.foreground": "#ffcc19",
        "editor.lineHighlightBackground": "#2a2a2a",
        "editorGutter.background": "#1a1a1a",
        "editorWidget.background": "#2a2a2a",
        "editorWidget.border": "#ffcc19/30",
        "editorSuggestWidget.background": "#2a2a2a",
        "editorSuggestWidget.border": "#ffcc19/30",
        "editorSuggestWidget.selectedBackground": "#ffcc19/20",
        "editorInlineHint.foreground": "#ffcc19/70",
        "editorInlineHint.background": "#2a2a2a/80",
      },
    });

    // Define professional light theme with optimized colors
    monaco.editor.defineTheme("professional-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword.sql", foreground: "#d97706", fontStyle: "bold" },
        { token: "string.sql", foreground: "#059669" },
        { token: "comment", foreground: "#6b7280", fontStyle: "italic" },
        { token: "number", foreground: "#dc2626" },
        { token: "operator.sql", foreground: "#374151" },
        { token: "identifier", foreground: "#1e40af" },
        { token: "type", foreground: "#7c3aed" },
        { token: "function", foreground: "#ea580c" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#1f2937",
        "editorLineNumber.foreground": "#9ca3af",
        "editorLineNumber.activeForeground": "#d97706",
        "editor.selectionBackground": "#fef3c7",
        "editorCursor.foreground": "#d97706",
        "editor.lineHighlightBackground": "#f9fafb",
        "editorGutter.background": "#ffffff",
        "editorWidget.background": "#f9fafb",
        "editorWidget.border": "#e5e7eb",
        "editorSuggestWidget.background": "#ffffff",
        "editorSuggestWidget.border": "#e5e7eb",
        "editorSuggestWidget.selectedBackground": "#fef3c7",
        "editorInlineHint.foreground": "#6b7280",
        "editorInlineHint.background": "#f3f4f6",
        "editor.findMatchBackground": "#fbbf24",
        "editor.findMatchHighlightBackground": "#fde68a",
        "editorBracketMatch.background": "#fef3c7",
        "editorBracketMatch.border": "#d97706",
      },
    });

    // Set theme based on current theme
    monaco.editor.setTheme(currentTheme === "dark" ? "professional-dark" : "professional-light");

    // Get available tables and columns
    const availableTables = dbSchema.tables.length > 0 ? dbSchema.tables : tables;
    const availableColumns = Object.values(dbSchema.columns).flat().length > 0 ? Object.values(dbSchema.columns).flat() : columns;
    
    console.log("🗃️  Available tables:", availableTables);
    console.log("📋 Available columns:", availableColumns);
    console.log("📊 Database schema:", dbSchema);

    // SUPER SMART SQL completion provider with database-aware suggestions
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (model, position) => {
        const suggestions: any[] = [];
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
          const currentLine = model.getLineContent(position.lineNumber);
        const wordInfo = model.getWordUntilPosition(position);
        const word = wordInfo.word.toLowerCase();
        const linePrefix = currentLine.substring(0, position.column - 1).trim().toLowerCase();
        
        // 🎯 BACKTICK SUPPORT FOR TABLE NAMES
        const textBeforeCursor = currentLine.substring(0, position.column - 1);
        const isAfterBacktick = textBeforeCursor.endsWith('`');
        const backtickCount = (textBeforeCursor.match(/`/g) || []).length;
        const isInsideBackticks = backtickCount % 2 === 1;
        
        // Enhanced context detection
        const afterFrom = /\bfrom\s*$/i.test(linePrefix) || /\bfrom\s+\w*$/i.test(linePrefix);
        const afterJoin = /\b(join|inner\s+join|left\s+join|right\s+join|full\s+outer\s+join)\s*$/i.test(linePrefix) || 
                         /\b(join|inner\s+join|left\s+join|right\s+join|full\s+outer\s+join)\s+\w*$/i.test(linePrefix);
        const afterSelect = /\bselect\s*$/i.test(linePrefix) || /\bselect\s+[^,]+,\s*$/i.test(linePrefix) || /,\s*$/i.test(linePrefix);
        const afterWhere = /\bwhere\s*$/i.test(linePrefix) || /\b(and|or)\s*$/i.test(linePrefix);
        const afterOn = /\bon\s*$/i.test(linePrefix);
        const afterOrderBy = /\border\s+by\s*$/i.test(linePrefix);
        const afterGroupBy = /\bgroup\s+by\s*$/i.test(linePrefix);

        // 🎯 SMART TABLE DETECTION FROM QUERY
        // Extract table names from current query to provide context-aware column suggestions
        const tablesInQuery = textUntilPosition.match(/(?:from|join)\s+`?(\w+)`?/gi) || [];
        const currentTablesInUse = tablesInQuery.map(match => 
          match.replace(/^(from|join)\s+`?(\w+)`?/i, '$2')
        );

        console.log("🔍 Context:", { 
          afterFrom, afterJoin, afterSelect, afterWhere, afterOn, afterOrderBy, afterGroupBy,
          word, linePrefix, isAfterBacktick, isInsideBackticks,
          tablesCount: availableTables.length, 
          columnsCount: availableColumns.length,
          currentTablesInUse 
        });// 🗃️ ENHANCED TABLE SUGGESTIONS - Ultra high priority for database tables
        if (availableTables && availableTables.length > 0) {
          availableTables.forEach(table => {
            const tableMatch = table.toLowerCase().includes(word.toLowerCase()) || 
                             word === '' || 
                             table.toLowerCase().startsWith(word.toLowerCase());
            
            if (tableMatch) {
              let priority = 5;
              let preselect = false;
              let detail = `Database Table`;
              let insertText = table;
              
              // 🎯 BACKTICK CONTEXT HANDLING
              if (isAfterBacktick) {
                insertText = `${table}\``;
                priority = 0; // Highest priority when user typed backtick
                preselect = true;
                detail = `Database Table (quoted)`;
              } else if (isInsideBackticks) {
                insertText = table; // Just the table name, user already started backticks
                priority = 0;
                preselect = true;
                detail = `📊 Database Table (quoted)`;
              } else {
                // Regular table suggestions with backticks for safety
                insertText = `\`${table}\``;
                
                if (afterFrom) {
                  priority = 0; // HIGHEST priority
                  preselect = true;
                  detail = `Database Table (FROM clause)`;
                } else if (afterJoin) {
                  priority = 0; // HIGHEST priority
                  preselect = true;
                  detail = `Database Table (JOIN clause)`;
                }
              }

              // Add table columns info to documentation
              const tableColumns = dbSchema.columns[table] || [];
              const columnPreview = tableColumns.slice(0, 8).join(', ') + (tableColumns.length > 8 ? '...' : '');
              
              suggestions.push({
                label: table,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText,
                detail,
                documentation: {
                  value: `**${table}** (Database Table)\\n\\n📊 Table from your database\\n📋 Columns (${tableColumns.length}): ${columnPreview}\\n\\n💡 Use in FROM or JOIN clauses`
                },
                sortText: priority.toString().padStart(2, '0') + table,
                preselect,
                filterText: table,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: wordInfo.startColumn,
                  endColumn: wordInfo.endColumn,
                },
                command: afterFrom || afterJoin ? {
                  id: 'editor.action.triggerSuggest',
                  title: 'Trigger Suggest'
                } : undefined
              });
            }
          });
        }

        // 📋 SUPER SMART COLUMN SUGGESTIONS with table-aware context
        if (dbSchema.columns && Object.keys(dbSchema.columns).length > 0) {          // Get tables currently in use in the query
          const queryTables = textUntilPosition.match(/(?:from|join)\s+(\w+)/gi) || [];
          const currentTables = queryTables.map(match => match.replace(/^(from|join)\s+/i, ''));
          
          Object.entries(dbSchema.columns).forEach(([tableName, tableColumns]) => {
            tableColumns.forEach(column => {
              const columnMatch = column.toLowerCase().includes(word.toLowerCase()) || 
                                word === '' || 
                                column.toLowerCase().startsWith(word.toLowerCase());
              
              if (columnMatch) {
                // Get column type information
                const columnType = dbSchema.columnTypes[tableName]?.find(
                  ct => ct.columnName === column
                )?.dataType || 'unknown';
                
                let sortText = "3";
                let detail = `📋 ${tableName}.${column} (${columnType})`;
                let insertText = column;
                let priority = 3;
                
                // CONTEXT-AWARE PRIORITIZATION
                if (afterSelect || afterOrderBy || afterGroupBy) {
                  priority = 1; // High priority for SELECT, ORDER BY, GROUP BY
                  if (currentTables.includes(tableName)) {
                    priority = 0; // Even higher if table is in use
                    sortText = "01";
                  }
                } else if (afterWhere || afterOn) {
                  priority = 1; // High priority for WHERE/ON clauses
                  if (currentTables.includes(tableName)) {
                    priority = 0; // Even higher if table is in use
                    sortText = "01";
                    // Smart operator suggestions based on column type
                    if (columnType.includes('int') || columnType.includes('number')) {
                      insertText = `${column} = `;
                    } else if (columnType.includes('date') || columnType.includes('time')) {
                      insertText = `${column} >= '2024-01-01'`;
                    } else if (columnType.includes('varchar') || columnType.includes('text')) {
                      insertText = `${column} LIKE '%'`;
                    } else {
                      insertText = `${column} = `;
                    }
                  }
                }
                
                // If multiple tables are in use, suggest with table prefix for clarity
                if (currentTables.length > 1 && currentTables.includes(tableName)) {
                  insertText = afterWhere || afterOn ? 
                    `${tableName}.${column} = ` : 
                    `${tableName}.${column}`;
                  detail = `📋 ${tableName}.${column} (${columnType}) - Prefixed`;
                }

                // Only show columns from tables that are actually in the query, or all if no tables yet
                if (currentTables.length === 0 || currentTables.includes(tableName)) {
                  suggestions.push({
                    label: currentTables.length > 1 ? `${tableName}.${column}` : column,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText,
                    detail,
                    sortText: sortText + column,
                    documentation: {
                      value: `**${column}** (${columnType})\\n\\nTable: ${tableName}\\nType: ${columnType}\\n\\n💡 Column from your database schema`
                    },
                    range: {
                      startLineNumber: position.lineNumber,
                      endLineNumber: position.lineNumber,
                      startColumn: wordInfo.startColumn,
                      endColumn: wordInfo.endColumn,
                    },
                  });
                }
              }
            });
          });
        }

        // Fallback to prop columns if schema not available
        else if (availableColumns && availableColumns.length > 0) {
          availableColumns.forEach(column => {
            const columnMatch = column.toLowerCase().includes(word.toLowerCase()) || 
                              word === '' || 
                              column.toLowerCase().startsWith(word.toLowerCase());
            
            if (columnMatch) {
              let sortText = "3";
              let insertText = column;
              
              if (afterSelect || afterOrderBy || afterGroupBy) {
                sortText = "1";
              } else if (afterWhere || afterOn) {
                sortText = "1";
                // Smart operator for WHERE clauses
                if (column.toLowerCase().includes('date') || column.toLowerCase().includes('time')) {
                  insertText = `${column} >= '2024-01-01'`;
                } else if (column.toLowerCase().includes('id')) {
                  insertText = `${column} = `;
                } else if (column.toLowerCase().includes('name') || column.toLowerCase().includes('email')) {
                  insertText = `${column} LIKE '%'`;
                } else {
                  insertText = `${column} = `;
                }
              }
              
              suggestions.push({
                label: column,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText,
                detail: `📋 Column`,
                sortText,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: wordInfo.startColumn,
                  endColumn: wordInfo.endColumn,
                },
              });
            }
          });
        }

        // 🔤 ENHANCED SQL KEYWORDS with smart context-based priority
        const sqlKeywords = [
          { word: "SELECT", priority: afterFrom ? 8 : (word === '' ? 1 : 6), description: "Select data from tables", insertText: "SELECT " },
          { word: "FROM", priority: afterSelect ? 0 : 4, description: "Specify source table", insertText: "FROM " },
          { word: "WHERE", priority: afterFrom ? 1 : 4, description: "Filter rows with conditions", insertText: "WHERE " },
          { word: "JOIN", priority: afterFrom ? 2 : 3, description: "Join tables together", insertText: "JOIN " },
          { word: "INNER JOIN", priority: afterFrom ? 2 : 3, description: "Inner join tables", insertText: "INNER JOIN " },
          { word: "LEFT JOIN", priority: afterFrom ? 2 : 3, description: "Left outer join", insertText: "LEFT JOIN " },
          { word: "RIGHT JOIN", priority: afterFrom ? 2 : 3, description: "Right outer join", insertText: "RIGHT JOIN " },
          { word: "ON", priority: afterJoin ? 0 : 5, description: "Join condition", insertText: "ON " },
          { word: "GROUP BY", priority: 5, description: "Group rows by column values", insertText: "GROUP BY " },
          { word: "ORDER BY", priority: 5, description: "Sort results", insertText: "ORDER BY " },
          { word: "HAVING", priority: 4, description: "Filter grouped results", insertText: "HAVING " },
          { word: "UNION", priority: 4, description: "Combine result sets", insertText: "UNION " },
          { word: "UNION ALL", priority: 4, description: "Combine result sets with duplicates", insertText: "UNION ALL " },
          { word: "DISTINCT", priority: afterSelect ? 1 : 4, description: "Return unique values", insertText: "DISTINCT " },
          { word: "COUNT(*)", priority: afterSelect ? 2 : 4, description: "Count all rows", insertText: "COUNT(*)" },
          { word: "COUNT", priority: afterSelect ? 2 : 4, description: "Count rows", insertText: "COUNT(" },
          { word: "SUM", priority: afterSelect ? 2 : 4, description: "Sum values", insertText: "SUM(" },
          { word: "AVG", priority: afterSelect ? 2 : 4, description: "Average values", insertText: "AVG(" },
          { word: "MIN", priority: afterSelect ? 2 : 4, description: "Minimum value", insertText: "MIN(" },
          { word: "MAX", priority: afterSelect ? 2 : 4, description: "Maximum value", insertText: "MAX(" },
          { word: "AS", priority: 6, description: "Create alias", insertText: "AS " },
          { word: "AND", priority: afterWhere ? 0 : 3, description: "Logical AND", insertText: "AND " },
          { word: "OR", priority: afterWhere ? 0 : 3, description: "Logical OR", insertText: "OR " },
          { word: "NOT", priority: afterWhere ? 1 : 3, description: "Logical NOT", insertText: "NOT " },
          { word: "IN", priority: afterWhere ? 1 : 3, description: "Match any value in list", insertText: "IN (" },
          { word: "NOT IN", priority: afterWhere ? 1 : 3, description: "Does not match any value in list", insertText: "NOT IN (" },
          { word: "BETWEEN", priority: afterWhere ? 1 : 3, description: "Range condition", insertText: "BETWEEN " },
          { word: "LIKE", priority: afterWhere ? 1 : 3, description: "Pattern matching", insertText: "LIKE '" },
          { word: "NOT LIKE", priority: afterWhere ? 1 : 3, description: "Pattern not matching", insertText: "NOT LIKE '" },
          { word: "IS NULL", priority: afterWhere ? 1 : 3, description: "Check for null values", insertText: "IS NULL" },
          { word: "IS NOT NULL", priority: afterWhere ? 1 : 3, description: "Check for non-null values", insertText: "IS NOT NULL" },
          { word: "LIMIT", priority: 4, description: "Limit number of results", insertText: "LIMIT " },
          { word: "OFFSET", priority: 4, description: "Skip rows", insertText: "OFFSET " },
          { word: "ASC", priority: afterOrderBy ? 0 : 5, description: "Ascending order", insertText: "ASC" },
          { word: "DESC", priority: afterOrderBy ? 0 : 5, description: "Descending order", insertText: "DESC" },
          { word: "CASE", priority: afterSelect ? 2 : 4, description: "Conditional expression", insertText: "CASE WHEN " },
          { word: "WHEN", priority: 5, description: "Case condition", insertText: "WHEN " },
          { word: "THEN", priority: 5, description: "Case result", insertText: "THEN " },
          { word: "ELSE", priority: 5, description: "Case default", insertText: "ELSE " },
          { word: "END", priority: 5, description: "End case", insertText: "END" },
          { word: "EXISTS", priority: afterWhere ? 1 : 3, description: "Subquery exists", insertText: "EXISTS (" },
          { word: "NOT EXISTS", priority: afterWhere ? 1 : 3, description: "Subquery does not exist", insertText: "NOT EXISTS (" },
        ];

        sqlKeywords.forEach(({ word: keyword, priority, description, insertText }) => {
          if (keyword.toLowerCase().includes(word.toLowerCase()) || word === '') {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: insertText || keyword,
              detail: "🔤 SQL Keyword",
              documentation: {
                value: `**${keyword}**\\n\\n${description}\\n\\n💡 SQL keyword`
              },
              sortText: priority.toString().padStart(2, '0') + keyword,
            });
          }
        });

        console.log(`🎯 Generated ${suggestions.length} suggestions for context:`, { afterFrom, afterJoin, afterSelect, afterWhere });
        return { suggestions };      },
      triggerCharacters: [' ', '.', '(', ',', '\n', '\t', '=', '`']
    });    // 🚀 SUPER SMART INLINE COMPLETIONS (GitHub Copilot-like)
    monaco.languages.registerInlineCompletionsProvider("sql", {
      provideInlineCompletions: async (model: any, position: any) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const currentLine = model.getLineContent(position.lineNumber);
        const linePrefix = currentLine.substring(0, position.column - 1).trim().toLowerCase();
        const words = linePrefix.split(/\s+/);
        const lastWord = words[words.length - 1] || "";
        
        console.log("💡 Inline completion context:", { 
          linePrefix, 
          lastWord, 
          tables: availableTables.length, 
          columns: availableColumns.length 
        });

        let inlineCompletion = "";

        // 🎯 CONTEXT-AWARE SMART COMPLETIONS
        // Start of query suggestions
        if (linePrefix === "" || linePrefix === "sel" || linePrefix === "sele" || linePrefix === "selec") {
          if (availableTables.length > 0) {
            const commonColumns = Object.values(dbSchema.columns)[0]?.slice(0, 3).join(", ") || "*";
            inlineCompletion = linePrefix === "" ? 
              `SELECT ${commonColumns}\nFROM ${availableTables[0]}` :
              `SELECT ${commonColumns}\nFROM ${availableTables[0]}`;
          } else {
            inlineCompletion = "SELECT * FROM table_name";
          }
        }
        
        // SELECT clause completions
        else if (linePrefix === "select" && availableTables.length > 0) {
          const firstTable = availableTables[0];
          const tableColumns = dbSchema.columns[firstTable] || availableColumns;
          const smartColumns = tableColumns.slice(0, 4).join(", ") || "*";
          inlineCompletion = ` ${smartColumns}\nFROM ${firstTable}`;
        }
        else if (linePrefix === "select *" && availableTables.length > 0) {
          inlineCompletion = `\nFROM ${availableTables[0]}`;
        }
        else if (linePrefix.startsWith("select") && !linePrefix.includes("from")) {
          const tablesInQuery = textUntilPosition.match(/(?:from|join)\s+(\w+)/gi) || [];
          if (tablesInQuery.length === 0 && availableTables.length > 0) {
            const firstTable = availableTables[0];
            const tableColumns = dbSchema.columns[firstTable] || availableColumns;
            if (tableColumns.length > 0 && !linePrefix.includes(",")) {
              const smartColumns = tableColumns.slice(1, 4).join(", ");
              inlineCompletion = `, ${smartColumns}`;
            }
          }
        }
        
        // FROM clause completions - ENHANCED
        else if (linePrefix === "from" && availableTables.length > 0) {
          inlineCompletion = ` ${availableTables[0]}`;
        }
        else if (linePrefix === "fro") {
          inlineCompletion = `M ${availableTables[0] || "table_name"}`;
        }
        else if (linePrefix.endsWith(" from") && availableTables.length > 0) {
          inlineCompletion = ` ${availableTables[0]}`;
        }
        else if (linePrefix.endsWith("from") && availableTables.length > 0) {
          const usedTables = textUntilPosition.toLowerCase().match(/(?:from|join)\s+(\w+)/g) || [];
          const availableUnusedTables = availableTables.filter((table: string) => 
            !usedTables.some((used: string) => used.includes(table.toLowerCase()))
          );
          
          if (availableUnusedTables.length > 0) {
            const table = availableUnusedTables[0];
            inlineCompletion = ` ${table}`;
            
            // Add smart WHERE clause based on available columns
            const tableColumns = dbSchema.columns[table] || availableColumns;
            const idColumn = tableColumns.find((col: string) => 
              col.toLowerCase().includes('id') || 
              col.toLowerCase() === 'id'
            );
            const nameColumn = tableColumns.find((col: string) => 
              col.toLowerCase().includes('name')
            );
            const statusColumn = tableColumns.find((col: string) => 
              col.toLowerCase().includes('status') || 
              col.toLowerCase().includes('active')
            );
            
            const whereColumn = idColumn || nameColumn || statusColumn || tableColumns[0];
            if (whereColumn) {
              if (whereColumn.toLowerCase().includes('id')) {
                inlineCompletion += `\nWHERE ${whereColumn} = `;
              } else if (whereColumn.toLowerCase().includes('name')) {
                inlineCompletion += `\nWHERE ${whereColumn} LIKE '%'`;
              } else if (whereColumn.toLowerCase().includes('status')) {
                inlineCompletion += `\nWHERE ${whereColumn} = 'active'`;
              } else {
                inlineCompletion += `\nWHERE ${whereColumn} = `;
              }
            }
          }
        }
        
        // WHERE clause completions - ENHANCED
        else if (linePrefix === "wher" || linePrefix === "whe") {
          const tablesInQuery = textUntilPosition.match(/(?:from|join)\s+(\w+)/gi) || [];
          if (tablesInQuery.length > 0 && tablesInQuery[0]) {
            const mainTable = tablesInQuery[0].replace(/^(from|join)\s+/i, '');
            const tableColumns = dbSchema.columns[mainTable] || availableColumns;
            const filterColumn = tableColumns.find((col: string) => 
              col.toLowerCase().includes('id') || 
              col.toLowerCase().includes('status') ||
              col.toLowerCase().includes('active')
            ) || tableColumns[0];
            inlineCompletion = `E ${filterColumn || "column"} = `;
          } else {
            inlineCompletion = `E ${availableColumns[0] || "column"} = `;
          }
        }
        else if (linePrefix === "where") {
          const tablesInQuery = textUntilPosition.match(/(?:from|join)\s+(\w+)/gi) || [];
          if (tablesInQuery.length > 0) {
            const mainTable = tablesInQuery[0].replace(/^(from|join)\s+/i, '');
            const tableColumns = dbSchema.columns[mainTable] || availableColumns;
            const filterColumns = tableColumns.filter((col: string) => 
              col.toLowerCase().includes('id') || 
              col.toLowerCase().includes('status') ||
              col.toLowerCase().includes('active') ||
              col.toLowerCase().includes('name')
            );
            const column = filterColumns[0] || tableColumns[0];
            if (column) {
              if (column.toLowerCase().includes('id')) {
                inlineCompletion = ` ${column} = `;
              } else if (column.toLowerCase().includes('name')) {
                inlineCompletion = ` ${column} LIKE '%'`;
              } else if (column.toLowerCase().includes('status')) {
                inlineCompletion = ` ${column} = 'active'`;
              } else {
                inlineCompletion = ` ${column} = `;
              }
            }
          }
        }
        else if (linePrefix.endsWith(" where")) {
          const tablesInQuery = textUntilPosition.match(/(?:from|join)\s+(\w+)/gi) || [];
          if (tablesInQuery.length > 0) {
            const mainTable = tablesInQuery[0].replace(/^(from|join)\s+/i, '');
            const tableColumns = dbSchema.columns[mainTable] || availableColumns;
            const column = tableColumns.find((col: string) => col.toLowerCase().includes('id')) || tableColumns[0];
            inlineCompletion = ` ${column} = `;
          }
        }
        
        // JOIN completions - ENHANCED
        else if (linePrefix === "joi" || linePrefix === "join" || linePrefix.endsWith(" join")) {
          const usedTables = textUntilPosition.toLowerCase().match(/(?:from|join)\s+(\w+)/g) || [];
          const unusedTables = availableTables.filter((table: string) => 
            !usedTables.some((used: string) => used.includes(table.toLowerCase()))
          );
          
          if (unusedTables.length > 0) {
            const joinTable = unusedTables[0];
            const joinTableColumns = dbSchema.columns[joinTable] || [];
            const joinColumn = joinTableColumns.find((col: string) => 
              col.toLowerCase().includes('id') || 
              col.toLowerCase().endsWith('_id')
            ) || 'id';
            
            const completion = linePrefix === "joi" ? `N ${joinTable}\n    ON ${joinTable}.${joinColumn} = ` :
                             linePrefix === "join" ? ` ${joinTable}\n    ON ${joinTable}.${joinColumn} = ` :
                             ` ${joinTable}\n    ON ${joinTable}.${joinColumn} = `;
            inlineCompletion = completion;
          }
        }
        else if (linePrefix.endsWith("inner join") || linePrefix.endsWith("left join") || linePrefix.endsWith("right join")) {
          const usedTables = textUntilPosition.toLowerCase().match(/(?:from|join)\s+(\w+)/g) || [];
          const unusedTables = availableTables.filter((table: string) => 
            !usedTables.some((used: string) => used.includes(table.toLowerCase()))
          );
          
          if (unusedTables.length > 0) {
            const table = unusedTables[0];
            const tableColumns = dbSchema.columns[table] || [];
            const joinColumn = tableColumns.find((col: string) => 
              col.toLowerCase().includes('id') || 
              col.toLowerCase().endsWith('_id')
            ) || 'id';
            inlineCompletion = ` ${table}\n    ON ${table}.${joinColumn} = `;
          }
        }
        
        // Smart table name completion when typing partial names
        else if (lastWord.length >= 2 && availableTables.length > 0) {
          const matchingTable = availableTables.find((table: string) => 
            table.toLowerCase().startsWith(lastWord.toLowerCase()) && 
            table.toLowerCase() !== lastWord.toLowerCase()
          );
          
          if (matchingTable) {
            const remainingText = matchingTable.substring(lastWord.length);
            inlineCompletion = remainingText;
            
            // Add context-aware continuation
            if (linePrefix.includes('from') && !linePrefix.includes('where')) {
              const tableColumns = dbSchema.columns[matchingTable] || [];
              const whereColumn = tableColumns.find((col: string) => col.toLowerCase().includes('id')) || tableColumns[0];
              if (whereColumn) {
                inlineCompletion += `\nWHERE ${whereColumn} = `;
              }
            } else if (linePrefix.includes('join')) {
              const tableColumns = dbSchema.columns[matchingTable] || [];
              const joinColumn = tableColumns.find((col: string) => 
                col.toLowerCase().includes('id') || 
                col.toLowerCase().endsWith('_id')
              ) || 'id';
              inlineCompletion += `\n    ON ${matchingTable}.${joinColumn} = `;
            }
          }
        }
        
        // Smart column name completion
        else if (lastWord.length >= 2) {
          const allColumns = Object.values(dbSchema.columns).flat().length > 0 ? 
            Object.values(dbSchema.columns).flat() : availableColumns;
          
          const matchingColumn = allColumns.find((column: string) => 
            column.toLowerCase().startsWith(lastWord.toLowerCase()) && 
            column.toLowerCase() !== lastWord.toLowerCase()
          );
          
          if (matchingColumn) {
            const remainingText = matchingColumn.substring(lastWord.length);
            inlineCompletion = remainingText;
            
            // Add smart operators based on column name/type
            if (linePrefix.includes('where') || linePrefix.includes('on')) {
              if (matchingColumn.toLowerCase().includes('date') || matchingColumn.toLowerCase().includes('time')) {
                inlineCompletion += " >= '2024-01-01'";
              } else if (matchingColumn.toLowerCase().includes('id')) {
                inlineCompletion += " = ";
              } else if (matchingColumn.toLowerCase().includes('name') || matchingColumn.toLowerCase().includes('email')) {
                inlineCompletion += " LIKE '%'";
              } else if (matchingColumn.toLowerCase().includes('status')) {
                inlineCompletion += " = 'active'";
              } else {
                inlineCompletion += " = ";
              }
            }
          }
        }

        if (inlineCompletion) {
          console.log("💡 Providing smart inline completion:", inlineCompletion);
          return {
            items: [{
              insertText: inlineCompletion,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            }]
          };
        }

        return { items: [] };
      },
      freeInlineCompletions: () => {}
    });

    // Add keyboard shortcuts
    editor.addAction({
      id: "execute-query",
      label: "Execute Query",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        if (onExecute && !loading) {
          onExecute(editor.getValue());
        }
      },
    });

    editor.addAction({
      id: "format-sql",
      label: "Format SQL",
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: () => {
        formatSQL();
      },
    });

    editor.addAction({
      id: "suggest-table",
      label: "Suggest Table",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT],
      run: () => {
        suggestTable();
      },
    });

    // Auto-format on paste
    editor.onDidPaste(() => {
      setTimeout(() => {
        formatSQL();
      }, 100);
    });

    // Trigger suggestions intelligently based on context
    editor.onDidType((text: string) => {
      const currentValue = editor.getValue();
      const lowerText = text.toLowerCase();
      
      // Trigger on space, newline, tab, equals
      if ([' ', '\\n', '\\t', '=', '(', ','].includes(text)) {
        setTimeout(() => {
          editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
          editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
        }, 10);
      }
      
      // Trigger on SQL keyword completion
      const triggers = [
        { key: 'm', check: () => currentValue.toLowerCase().endsWith('from') },
        { key: 't', check: () => currentValue.toLowerCase().endsWith('select') },
        { key: 'e', check: () => currentValue.toLowerCase().endsWith('where') },
        { key: 'n', check: () => currentValue.toLowerCase().endsWith('join') || currentValue.toLowerCase().endsWith('on') },
        { key: 'y', check: () => currentValue.toLowerCase().endsWith('by') },
        { key: 'd', check: () => currentValue.toLowerCase().endsWith('and') },
        { key: 'r', check: () => currentValue.toLowerCase().endsWith('or') },
      ];
      
      const trigger = triggers.find(t => t.key === lowerText && t.check());
      if (trigger) {
        setTimeout(() => {
          editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
          editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
        }, 50);
      }
    });

    // Enhanced cursor position change handler
    editor.onDidChangeCursorPosition(() => {
      setTimeout(() => {
        editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
      }, 100);
    });

    // Focus editor
    editor.focus();
  };

  const handleEditorChange = (newValue: string | undefined) => {
    const currentValue = newValue || "";
    setEditorValue(currentValue);
    onChange?.(currentValue);
    
    // Trigger inline suggestions aggressively for better UX
    if (editorRef.current) {
      if (inlineSuggestTimeoutRef.current) {
        clearTimeout(inlineSuggestTimeoutRef.current);
      }
      
      inlineSuggestTimeoutRef.current = setTimeout(() => {
        try {
          editorRef.current?.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
          editorRef.current?.trigger('keyboard', 'editor.action.triggerSuggest', {});
        } catch (error) {
          console.log("Error triggering suggestions:", error);
        }
      }, 100);
    }
  };

  const handleExecute = () => {
    if (onExecute && !loading) {
      onExecute(editorValue);
    }
  };

  const handleExplain = () => {
    if (onExplain && !loading && editorValue.trim()) {
      onExplain(editorValue);
    }
  };

  const handleOptimize = () => {
    if (onOptimize && !loading && editorValue.trim()) {
      onOptimize(editorValue);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorValue);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatSQL = async () => {
    setIsFormatting(true);
    try {
      const sql = editorValue.trim();
      if (!sql) return;      // Enhanced SQL formatting
      let formatted = sql
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|FULL\s+OUTER\s+JOIN|GROUP\s+BY|ORDER\s+BY|HAVING|UNION|UNION\s+ALL|LIMIT|OFFSET)\b/gi, '\n$1')
        .replace(/\(\s*SELECT\b/gi, '(\n    SELECT')
        .replace(/\bCASE\b/gi, '\n    CASE')
        .replace(/\bWHEN\b/gi, '\n        WHEN')
        .replace(/\bTHEN\b/gi, ' THEN')
        .replace(/\bELSE\b/gi, '\n        ELSE')
        .replace(/\bEND\b/gi, '\n    END')
        .replace(/\b(AND|OR)\b/gi, '\n    $1')
        .replace(/\bON\b/gi, '\n    ON')
        .replace(/,\s*(?![^()]*\))/g, ',\n    ')
        .replace(/\n\s*\n/g, '\n')
        .replace(/^\n+/, '')
        .split('\\n')
        .map((line) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return '';
          
          let indent = 0;
          if (/^(SELECT|FROM|WHERE|GROUP\\s+BY|ORDER\\s+BY|HAVING|UNION|LIMIT|OFFSET)/i.test(trimmedLine)) {
            indent = 0;
          } else if (/^(JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|INNER\\s+JOIN|FULL\\s+OUTER\\s+JOIN)/i.test(trimmedLine)) {
            indent = 0;
          } else if (/^(AND|OR|ON)/i.test(trimmedLine)) {
            indent = 1;
          } else if (/^[A-Za-z0-9_]/.test(trimmedLine) || trimmedLine.startsWith(',')) {
            indent = 1;
          } else {
            indent = 1;
          }
          
          return '    '.repeat(indent) + trimmedLine;
        })
        .join('\\n')
        .trim();

      // Capitalize keywords
      const keywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 
        'FULL OUTER JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 
        'LIKE', 'IS', 'NULL', 'GROUP BY', 'ORDER BY', 'HAVING', 'DISTINCT', 
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'UNION', 'UNION ALL', 'LIMIT', 
        'OFFSET', 'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'AS'
      ];
      
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\\\b${keyword.replace(/\\s+/g, '\\\\s+')}\\\\b`, 'gi');
        formatted = formatted.replace(regex, keyword);
      });

      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          const position = editorRef.current.getPosition();
          model.setValue(formatted);
          if (position) {
            editorRef.current.setPosition(position);
          }
          setEditorValue(formatted);
          onChange?.(formatted);
        }
      }
    } catch (error) {
      console.error("Error formatting SQL:", error);
    } finally {
      setIsFormatting(false);
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    wordWrap: "on" as const,
    lineNumbers: "on" as const,
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontLigatures: true,
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth" as const,
    renderLineHighlight: "line" as const,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    folding: true,
    bracketPairColorization: { enabled: true },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showFunctions: true,
      showFields: true,
      showClasses: true,
      showModules: true,
      filterGraceful: true,
      localityBonus: true,
      shareSuggestSelections: true,
      showIcons: true,
      maxVisibleSuggestions: 15,
      insertMode: "replace" as const,
      snippetsPreventQuickSuggestions: false,
    },
    acceptSuggestionOnEnter: "on" as const,
    tabCompletion: "on" as const,
    readOnly: readOnly,
    automaticLayout: true,
    contextmenu: true,
    copyWithSyntaxHighlighting: true,
    cursorSmoothCaretAnimation: "on" as const,
    find: {
      addExtraSpaceOnTop: true,
      autoFindInSelection: "never" as const,
      seedSearchStringFromSelection: "always" as const,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    quickSuggestionsDelay: 10,
    parameterHints: { 
      enabled: true,
      cycle: true
    },
    inlineSuggest: { 
      enabled: true,
      mode: "prefix" as const,
      showToolbar: "always" as const,
      suppressSuggestions: false
    },
    codeLens: false,
    accessibilitySupport: "auto" as const,
    wordBasedSuggestions: "allDocuments" as const,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnCommitCharacter: true,
    snippetSuggestions: "top" as const,
    tabFocusMode: false,
    useTabStops: true,
    wordSeparators: "`~!@#$%^&*()-=+[{]}\\\\|;:'\\\",.<>/?",
    inlineCompletionsAccessibilityVerbose: false,
    ghostTextSupport: true,
    suggestSelection: "first" as const,
    multiCursorModifier: "ctrlCmd" as const,
    autoIndent: "full" as const,
    formatOnPaste: true,
    formatOnType: true,
  };
  return (
    <div className={cn("relative w-full h-full flex flex-col bg-background border border-border rounded-lg overflow-hidden", className)}>
      {/* Floating Toolbar */}      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
        >
          {/* Quick Actions */}
          <Button
            size="sm"
            variant="ghost"
            onClick={formatSQL}
            disabled={isFormatting}
            className="h-8 px-2 text-xs text-foreground hover:bg-muted hover:text-primary transition-all duration-200"
            title="Format SQL (Shift+Alt+F)"
          >
            {isFormatting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Code2 className="w-3 h-3" />
            )}
          </Button>
            <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-8 px-2 text-xs text-foreground hover:bg-muted hover:text-primary transition-colors"
            title="Copy SQL"
          >
            <Copy className="w-3 h-3" />
          </Button>
          
          {/* Explain and Optimize Query Buttons */}          {onExplain && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExplain}
                disabled={loading || !editorValue.trim()}
                className="h-8 px-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 border border-transparent transition-all duration-200 group"
                title="Explain Query (AI-powered)"
              >
                <Eye className="w-3 h-3 group-hover:scale-110 transition-transform duration-200" />
              </Button>
            </motion.div>
          )}
          
          {onOptimize && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              <Button
                size="sm"
                variant="ghost"
                onClick={handleOptimize}
                disabled={loading || !editorValue.trim()}
                className="h-8 px-2 text-xs text-foreground hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-600 hover:border-amber-200 dark:hover:border-amber-800 border border-transparent transition-all duration-200 group"
                title="Optimize Query (AI-powered)"
              >
                <Zap className="w-3 h-3 group-hover:scale-110 transition-transform duration-200" />
              </Button>
            </motion.div>
          )}
          
          <div className="w-px h-4 bg-border/50" />
            <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
          >
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={loading}
              className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              title="Execute Query (Ctrl+Enter)"
            >
              {loading ? (
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-3 h-3" />
                  </motion.div>
                  <span>Running</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Play className="w-3 h-3 group-hover:scale-110 transition-transform duration-200" />
                  <span>Run</span>
                </div>
              )}
            </Button>
          </motion.div>
        </motion.div>        {/* Schema Loading Indicator */}
        <AnimatePresence>
          {schemaLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg backdrop-blur-sm shadow-sm"
            >
              <Database className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">Loading schema...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative">        <MonacoEditor
          height="100%"
          language="sql"
          value={editorValue}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme={currentTheme === "dark" ? "professional-dark" : "professional-light"}
          options={editorOptions}          loading={
            <div className="flex items-center justify-center h-full w-full bg-white dark:bg-amber-900 border border-border rounded-lg">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-primary rounded-full animate-spin border-t-transparent" />
                  <div className="absolute inset-0 w-5 h-5 border-2 border-primary/20 rounded-full animate-pulse" />
                </div>
                <span className="text-sm font-medium">Loading Smart SQL Editor...</span>
              </div>
            </div>
          }
        />
          {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}              className="absolute inset-0 bg-white/90 dark:bg-background/90 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-background border border-border rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-primary rounded-full animate-spin border-t-transparent" />
                  <div className="absolute inset-0 w-5 h-5 border-2 border-primary/20 rounded-full animate-pulse" />
                </div>
                <span className="text-sm font-medium text-foreground">Executing query...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfessionalSQLEditor;
