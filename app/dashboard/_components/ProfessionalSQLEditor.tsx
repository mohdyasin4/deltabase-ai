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
  Sparkles,
  HelpCircle,
  Zap,
  Database,
  Wand2,
  Bot,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfessionalSQLEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onExecute?: (query: string) => void;
  loading?: boolean;
  className?: string;
  height?: string;
  readOnly?: boolean;
  tables?: string[];
  columns?: string[];
  theme?: "light" | "dark";
  connectionId?: string; // Add connection ID for AI context
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
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);  const [dbSchema, setDbSchema] = useState<DatabaseSchema>({ tables: [], columns: {}, columnTypes: {} });
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<string>("");
  const [showExplanation, setShowExplanation] = useState(false);
  const editorRef = useRef<any>(null);
  const inlineSuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);  useEffect(() => {
    if (value && value !== editorValue) {
      // Auto-format when new SQL is loaded
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
    };

    fetchDatabaseSchema();
  }, [connectionId, tables]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (inlineSuggestTimeoutRef.current) {
        clearTimeout(inlineSuggestTimeoutRef.current);
      }
      if (aiDebounceTimeoutRef.current) {
        clearTimeout(aiDebounceTimeoutRef.current);
      }
    };
  }, []);// Enhanced AI-powered SQL completion using Gemini API
  const getAICompletion = async (
    currentQuery: string, 
    cursorPosition: number,
    linePrefix: string,
    context: { tables: string[], columns: string[], connectionId?: string }
  ): Promise<string> => {
    if (!connectionId) {
      console.log("❌ No connectionId provided for AI completion");
      return "";
    }
    
    // Allow AI calls for any meaningful input
    if (currentQuery.trim().length === 0 && linePrefix.trim().length === 0) {
      console.log("❌ Both currentQuery and linePrefix are empty");
      return "";
    }
    
    try {
      setIsAiThinking(true);
      console.log("🚀 Making AI completion request:", {
        currentQuery: currentQuery.substring(0, 100) + (currentQuery.length > 100 ? "..." : ""),
        linePrefix,
        tables: context.tables?.slice(0, 3),
        columns: context.columns?.slice(0, 5),
        connectionId
      });
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inlineCompletion: true,          connection_id: connectionId,
          currentQuery: currentQuery,
          linePrefix: linePrefix,
          cursorPosition: cursorPosition,
          tables: dbSchema.tables.length > 0 ? dbSchema.tables : context.tables,
          columns: Object.values(dbSchema.columns).flat().length > 0 ? Object.values(dbSchema.columns).flat() : context.columns,
          schemas: dbSchema.columnTypes, // Provide full schema information
        }),
      });

      if (!response.ok) {
        console.warn('AI completion API failed:', response.status, response.statusText);
        return "";
      }
      
      const data = await response.json();
      const completion = data.completion || "";
      
      if (completion && completion.length > 0 && completion.length < 200) {
        console.log("✅ AI completion received:", completion);
        return completion;
      }
      
      console.log("⚠️ AI completion empty or too long:", completion?.length || 0);
      return "";
    } catch (error) {
      console.error('❌ AI completion error:', error);
      return "";
    } finally {
      setIsAiThinking(false);
    }
  };

  // Manual AI completion trigger function
  const triggerAICompletion = async () => {
    if (!editorRef.current || !connectionId) return;
    
    const position = editorRef.current.getPosition();
    const model = editorRef.current.getModel();
    
    if (!position || !model) return;
    
    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });
    
    const currentLine = model.getLineContent(position.lineNumber);
    const linePrefix = currentLine.substring(0, position.column - 1);
      try {
      const completion = await getAICompletion(
        textUntilPosition,
        position.column,
        linePrefix,
        { tables: dbSchema.tables.length > 0 ? dbSchema.tables : tables, 
          columns: Object.values(dbSchema.columns).flat().length > 0 ? Object.values(dbSchema.columns).flat() : columns, 
          connectionId }
      );
      
      if (completion && completion.trim()) {
        // Insert the completion at current cursor position
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };
        
        const op = { range, text: completion };
        model.pushEditOperations([], [op], () => null);
        
        // Update editor value
        const newValue = model.getValue();
        setEditorValue(newValue);
        onChange?.(newValue);
      }
    } catch (error) {
      console.error("Error triggering manual AI completion:", error);
    }
  };
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
  // AI query optimization
  const optimizeQueryWithAI = async (query: string): Promise<string> => {
    if (!connectionId || !query.trim()) return query;
    
    try {
      setIsAiThinking(true);
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optimizeQuery: true,
          connection_id: connectionId,
          sqlQuery: query,
        }),
      });

      if (!response.ok) throw new Error('AI optimization failed');
      
      const data = await response.json();
      return data.sqlQuery || query;
    } catch (error) {
      console.error('AI optimization error:', error);
      return query;
    } finally {
      setIsAiThinking(false);
    }
  };
  // AI query explanation with UI display
  const explainQueryWithAI = async (query: string): Promise<string> => {
    if (!connectionId || !query.trim()) return "";
    
    try {
      setIsAiThinking(true);
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          explainQuery: true,
          connection_id: connectionId,
          sqlQuery: query,
        }),
      });

      if (!response.ok) throw new Error('AI explanation failed');
      
      const data = await response.json();
      const explanation = data.explanation || "";
        // Store explanation for display
      setLastExplanation(explanation);
      setShowExplanation(true); // Show the explanation modal
      return explanation;
    } catch (error) {
      console.error('AI explanation error:', error);      const fallbackExplanation = "Unable to explain this query at the moment.";
      setLastExplanation(fallbackExplanation);
      setShowExplanation(true); // Show the explanation modal even for errors
      return fallbackExplanation;
    } finally {
      setIsAiThinking(false);
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

    // Set theme
    monaco.editor.setTheme("professional-dark");    // Log available tables and columns for debugging
    const availableTables = dbSchema.tables.length > 0 ? dbSchema.tables : tables;
    const availableColumns = Object.values(dbSchema.columns).flat().length > 0 ? Object.values(dbSchema.columns).flat() : columns;
    
    console.log("Available tables:", availableTables);
    console.log("Available columns:", availableColumns);
    console.log("Database schema:", dbSchema);    // Enhanced SQL completions with intelligent context awareness and better table suggestions
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

        // More precise context detection
        const afterFrom = /\bfrom\s*$/i.test(linePrefix) || /\bfrom\s+\w*$/i.test(linePrefix);
        const afterJoin = /\b(join|inner\s+join|left\s+join|right\s+join|full\s+outer\s+join)\s*$/i.test(linePrefix) || 
                         /\b(join|inner\s+join|left\s+join|right\s+join|full\s+outer\s+join)\s+\w*$/i.test(linePrefix);
        const afterSelect = /\bselect\s*$/i.test(linePrefix) || /\bselect\s+[^,]+,\s*$/i.test(linePrefix);
        const afterWhere = /\bwhere\s*$/i.test(linePrefix) || /\b(and|or)\s*$/i.test(linePrefix);

        console.log("Enhanced completion context:", { 
          afterFrom, afterJoin, afterSelect, afterWhere, 
          word, linePrefix, 
          tables: availableTables.length, 
          columns: availableColumns.length 
        });

        // ENHANCED TABLE SUGGESTIONS - High priority for database tables
        if (availableTables && availableTables.length > 0) {
          availableTables.forEach(table => {
            const tableMatch = table.toLowerCase().includes(word.toLowerCase()) || 
                             word === '' || 
                             table.toLowerCase().startsWith(word.toLowerCase());
            
            if (tableMatch) {
              // Much higher priority for FROM and JOIN contexts
              let priority = 3;
              let preselect = false;
              let detail = `📊 Table`;
              
              if (afterFrom) {
                priority = 0; // Highest priority
                preselect = true;
                detail = `📊 Database Table (FROM clause)`;
              } else if (afterJoin) {
                priority = 0; // Highest priority
                preselect = true;
                detail = `📊 Database Table (JOIN clause)`;
              }
              
              suggestions.push({
                label: table,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: table,
                detail: detail,
                documentation: {
                  value: `**${table}** (Database Table)\n\n📊 Available in your database\n📋 Columns: ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}\n\n💡 Use in FROM or JOIN clauses`
                },
                sortText: priority.toString().padStart(2, '0') + table,
                preselect: preselect,
                filterText: table,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: wordInfo.startColumn,
                  endColumn: wordInfo.endColumn,
                },
                // Add command to trigger suggestions after insertion
                command: afterFrom || afterJoin ? {
                  id: 'editor.action.triggerSuggest',
                  title: 'Trigger Suggest'
                } : undefined
              });
            }
          });
        }        // ENHANCED COLUMN SUGGESTIONS with table context
        if (dbSchema.columns && Object.keys(dbSchema.columns).length > 0) {
          // Get table context from query
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
                
                let sortText = "2";
                let detail = `Column • ${tableName}.${column} (${columnType})`;
                let insertText = column;
                
                // Context-aware prioritization
                if (afterSelect) {
                  sortText = "10"; // High priority after SELECT
                  if (currentTables.includes(tableName)) {
                    sortText = "05"; // Even higher if table is in use
                  }
                } else if (afterWhere) {
                  sortText = "11"; // High priority after WHERE
                  if (currentTables.includes(tableName)) {
                    sortText = "06"; // Even higher if table is in use
                    insertText = `${column} = `; // Add equals for WHERE clause
                  }
                }
                
                // If multiple tables, suggest with table prefix
                if (currentTables.length > 1) {
                  insertText = `${tableName}.${column}`;
                  detail = `Column • ${tableName}.${column} (${columnType})`;
                }
                
                suggestions.push({
                  label: `${tableName}.${column}`,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText,
                  detail,
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
          });
        }

        // Fallback to prop columns if schema not available
        else if (availableColumns && availableColumns.length > 0) {
          availableColumns.forEach(column => {
            const columnMatch = column.toLowerCase().includes(word.toLowerCase()) || 
                              word === '' || 
                              column.toLowerCase().startsWith(word.toLowerCase());
            
            if (columnMatch) {
              let sortText = "2";
              let insertText = column;
              
              if (afterSelect) {
                sortText = "10";
              } else if (afterWhere) {
                sortText = "11";
                insertText = `${column} = `;
              }
              
              suggestions.push({
                label: column,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText,
                detail: `Column • ${column}`,
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

        // SQL Keywords with enhanced priority based on context
        const keywords = [
          { word: "SELECT", priority: afterFrom ? 10 : 8, description: "Select data from tables" },
          { word: "FROM", priority: afterSelect ? 1 : 5, description: "Specify source table" },
          { word: "WHERE", priority: afterFrom ? 2 : 5, description: "Filter rows with conditions" },
          { word: "JOIN", priority: afterFrom ? 3 : 4, description: "Join tables together" },
          { word: "INNER JOIN", priority: afterFrom ? 3 : 4, description: "Inner join tables" },
          { word: "LEFT JOIN", priority: afterFrom ? 3 : 4, description: "Left outer join" },
          { word: "RIGHT JOIN", priority: afterFrom ? 3 : 4, description: "Right outer join" },
          { word: "GROUP BY", priority: 6, description: "Group rows by column values" },
          { word: "ORDER BY", priority: 6, description: "Sort results" },
          { word: "HAVING", priority: 4, description: "Filter grouped results" },
          { word: "UNION", priority: 3, description: "Combine result sets" },
          { word: "DISTINCT", priority: afterSelect ? 2 : 4, description: "Return unique values" },
          { word: "COUNT", priority: afterSelect ? 3 : 5, description: "Count rows" },
          { word: "SUM", priority: afterSelect ? 3 : 5, description: "Sum values" },
          { word: "AVG", priority: afterSelect ? 3 : 5, description: "Average values" },
          { word: "MIN", priority: afterSelect ? 3 : 5, description: "Minimum value" },
          { word: "MAX", priority: afterSelect ? 3 : 5, description: "Maximum value" },
          { word: "AS", priority: 7, description: "Create alias" },
          { word: "AND", priority: afterWhere ? 1 : 4, description: "Logical AND" },
          { word: "OR", priority: afterWhere ? 1 : 4, description: "Logical OR" },
          { word: "NOT", priority: afterWhere ? 2 : 4, description: "Logical NOT" },
          { word: "IN", priority: afterWhere ? 2 : 4, description: "Match any value in list" },
          { word: "BETWEEN", priority: afterWhere ? 2 : 4, description: "Range condition" },
          { word: "LIKE", priority: afterWhere ? 2 : 4, description: "Pattern matching" },
          { word: "IS NULL", priority: afterWhere ? 2 : 4, description: "Check for null values" },
          { word: "IS NOT NULL", priority: afterWhere ? 2 : 4, description: "Check for non-null values" },
          { word: "LIMIT", priority: 5, description: "Limit number of results" },
          { word: "OFFSET", priority: 4, description: "Skip rows" },
        ];

        keywords.forEach(({ word: keyword, priority, description }) => {
          if (keyword.toLowerCase().includes(word) || word === '') {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              detail: "SQL Keyword",
              documentation: description,
              sortText: priority.toString().padStart(2, '0'),
            });
          }
        });

        console.log("Generated suggestions:", suggestions, "Context:", { afterFrom, afterJoin, afterSelect, afterWhere });
        return { suggestions };
      },
      triggerCharacters: [' ', '.', '(', ',', '\n', '\t']
    });// Enhanced Real-time Inline suggestions provider (GitHub Copilot-like with AI)
    monaco.languages.registerInlineCompletionsProvider("sql", {
      provideInlineCompletions: async (model, position, context) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const currentLine = model.getLineContent(position.lineNumber);
        const linePrefix = currentLine.substring(0, position.column - 1).trim().toLowerCase();
        const lastWords = linePrefix.split(/\s+/).slice(-3);
        const lastWord = lastWords[lastWords.length - 1] || "";
        
        console.log("Inline completion context:", { linePrefix, lastWord, lastWords, tables: tables.length, columns: columns.length });

        let inlineCompletion = "";        // Enhanced AI completion using the getAICompletion function
        // More aggressive trigger conditions for AI completion
        if (connectionId && (
          textUntilPosition.length > 0 || // Trigger after any character
          linePrefix.length > 0 || // Always trigger when line has content
          lastWord.length > 0 // Trigger when typing any word
        )) {
          try {
            console.log("Requesting AI completion for:", linePrefix, "LastWord:", lastWord, "ConnectionId:", connectionId);
            
            const aiCompletion = await getAICompletion(
              textUntilPosition,
              position.column,
              linePrefix,
              { tables, columns, connectionId }
            );
            
            if (aiCompletion && aiCompletion.length > 0 && aiCompletion.length < 200) {
              console.log("AI provided intelligent completion:", aiCompletion);
              return {
                items: [{
                  insertText: aiCompletion,
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                  },
                }]
              };
            }
          } catch (error) {
            console.log("AI completion failed, falling back to rules:", error);
          }
        }// Fallback to rule-based completions
        // Basic SQL structure completions with enhanced table suggestions
        if (linePrefix === "sel" || linePrefix === "sele" || linePrefix === "selec") {
          inlineCompletion = "SELECT * FROM " + (tables[0] || "table_name");
        }
        else if (linePrefix === "select" && tables.length > 0) {
          const table = tables[0];
          const commonColumns = columns.slice(0, 3).join(", ") || "*";
          inlineCompletion = ` ${commonColumns}\nFROM ${table}`;
        } 
        else if (linePrefix === "select *" && tables.length > 0) {
          inlineCompletion = `\nFROM ${tables[0]}`;
        }
        else if (linePrefix.startsWith("select") && !linePrefix.includes("from") && columns.length > 0) {
          const smartColumns = columns.slice(0, 4).join(", ");
          inlineCompletion = ` ${smartColumns}`;
        }
        
        // Enhanced FROM clause completions - This is the key fix
        else if (linePrefix === "from" && tables.length > 0) {
          inlineCompletion = ` ${tables[0]}`;
        }
        else if (linePrefix === "fro") {
          inlineCompletion = "FROM " + (tables[0] || "table_name");
        }
        else if (linePrefix.endsWith(" from") && tables.length > 0) {
          inlineCompletion = ` ${tables[0]}`;
        }
        else if (linePrefix.endsWith("from") && tables.length > 0) {
          const usedTables = textUntilPosition.toLowerCase().match(/(?:from|join)\s+(\w+)/g) || [];
          const availableTables = tables.filter(table => 
            !usedTables.some(used => used.includes(table.toLowerCase()))
          );
          if (availableTables.length > 0) {
            inlineCompletion = ` ${availableTables[0]}`;
            
            // Add smart WHERE clause suggestion
            const whereColumn = columns.find(col => 
              col.toLowerCase().includes('id') || 
              col.toLowerCase().includes('name') ||
              col.toLowerCase().includes('status')
            ) || columns[0];
            if (whereColumn) {
              inlineCompletion += `\nWHERE ${whereColumn} = `;
            }
          }
        }
        
        // Enhanced WHERE clause completions
        else if (linePrefix === "wher" || linePrefix === "whe") {
          inlineCompletion = "WHERE " + (columns[0] || "column") + " = ";
        }
        else if (linePrefix === "where" && columns.length > 0) {
          const filterableColumns = columns.filter(col => 
            col.toLowerCase().includes('id') || 
            col.toLowerCase().includes('name') || 
            col.toLowerCase().includes('status') ||
            col.toLowerCase().includes('email') ||
            col.toLowerCase().includes('type')
          );
          const column = filterableColumns[0] || columns[0];
          inlineCompletion = ` ${column} = `;
        }
        else if (linePrefix.endsWith(" where") && columns.length > 0) {
          const column = columns.find(col => col.toLowerCase().includes('id')) || columns[0];
          inlineCompletion = ` ${column} = `;
        }
        
        // Enhanced JOIN completions
        else if (linePrefix === "joi" || linePrefix === "join") {
          const unusedTables = tables.filter(table => 
            !textUntilPosition.toLowerCase().includes(table.toLowerCase())
          );
          if (unusedTables.length > 0) {
            const joinTable = unusedTables[0];
            const joinColumn = columns.find(col => col.toLowerCase().includes('id')) || 'id';
            inlineCompletion = ` ${joinTable}\n    ON ${joinTable}.${joinColumn} = `;
          }
        }
        else if ((linePrefix.endsWith("join") || linePrefix.endsWith("inner join") || linePrefix.endsWith("left join")) && tables.length > 1) {
          const usedTables = textUntilPosition.toLowerCase().match(/(?:from|join)\s+(\w+)/g) || [];
          const availableTables = tables.filter(table => 
            !usedTables.some(used => used.includes(table.toLowerCase()))
          );
          
          if (availableTables.length > 0) {
            const table = availableTables[0];
            const joinColumns = columns.filter(col => 
              col.toLowerCase().includes('id') || 
              col.toLowerCase().endsWith('_id')
            );
            const joinColumn = joinColumns[0] || 'id';
            inlineCompletion = ` ${table}\n    ON ${table}.${joinColumn} = `;
          }
        }
        
        // Smart table name completion when typing partial table names
        else if (lastWord.length >= 2 && tables.length > 0) {
          const matchingTable = tables.find(table => 
            table.toLowerCase().startsWith(lastWord.toLowerCase()) && 
            table.toLowerCase() !== lastWord.toLowerCase()
          );
          if (matchingTable) {
            inlineCompletion = matchingTable.substring(lastWord.length);
            
            // Add smart continuation based on context
            if (linePrefix.includes('from') && !linePrefix.includes('where')) {
              const whereColumn = columns.find(col => col.toLowerCase().includes('id')) || columns[0];
              if (whereColumn) {
                inlineCompletion += `\nWHERE ${whereColumn} = `;
              }
            } else if (linePrefix.includes('join')) {
              const joinColumn = columns.find(col => col.toLowerCase().includes('id')) || 'id';
              inlineCompletion += `\n    ON ${matchingTable}.${joinColumn} = `;
            }
          }
        }
        
        // Smart column name completion when typing partial column names
        else if (lastWord.length >= 2 && columns.length > 0) {
          const matchingColumn = columns.find(column => 
            column.toLowerCase().startsWith(lastWord.toLowerCase()) && 
            column.toLowerCase() !== lastWord.toLowerCase()
          );
          if (matchingColumn) {
            inlineCompletion = matchingColumn.substring(lastWord.length);
            
            // Add smart operators based on column type/name
            if (matchingColumn.toLowerCase().includes('date') || matchingColumn.toLowerCase().includes('time')) {
              inlineCompletion += " >= '2024-01-01'";
            } else if (matchingColumn.toLowerCase().includes('id')) {
              inlineCompletion += " = ";
            } else if (matchingColumn.toLowerCase().includes('name') || matchingColumn.toLowerCase().includes('email')) {
              inlineCompletion += " LIKE '%'";
            } else {
              inlineCompletion += " = ";
            }
          }
        }

        if (inlineCompletion) {
          console.log("Providing inline completion:", inlineCompletion);
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
    });    // Auto-format on paste
    editor.onDidPaste(() => {
      setTimeout(() => {
        formatSQL();
      }, 100);
    });    // Trigger suggestions on specific key presses and more aggressively
    editor.onDidType((text: string) => {
      const currentValue = editor.getValue();
      const lowerText = text.toLowerCase();
      
      // Trigger on space, newline, tab
      if (text === ' ' || text === '\n' || text === '\t') {
        setTimeout(() => {
          editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
          editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
        }, 10);
      }
      
      // Trigger on specific SQL keywords completion
      const triggers = [
        { key: 'm', check: () => currentValue.toLowerCase().endsWith('from') },
        { key: 't', check: () => currentValue.toLowerCase().endsWith('select') },
        { key: 'e', check: () => currentValue.toLowerCase().endsWith('where') },
        { key: 'n', check: () => currentValue.toLowerCase().endsWith('join') },
        { key: 'y', check: () => currentValue.toLowerCase().endsWith('by') },
      ];
      
      const trigger = triggers.find(t => t.key === lowerText && t.check());
      if (trigger) {
        setTimeout(() => {
          editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
        }, 50);
      }
      
      // More aggressive AI completion triggering
      if (connectionId) {
        // Trigger AI after every character if we have connection
        setTimeout(() => {
          editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
        }, 200);
      }
    });

    // Enhanced cursor position change handler for better suggestions
    editor.onDidChangeCursorPosition(() => {
      setTimeout(() => {
        editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
      }, 50);
    });

    // Focus editor
    editor.focus();
  };  const handleEditorChange = (newValue: string | undefined) => {
    const currentValue = newValue || "";
    setEditorValue(currentValue);
    onChange?.(currentValue);
    
    // Trigger inline suggestions more aggressively
    if (editorRef.current) {
      // Clear any existing timeout
      if (inlineSuggestTimeoutRef.current) {
        clearTimeout(inlineSuggestTimeoutRef.current);
      }
      
      // Set a new timeout for inline suggestions
      inlineSuggestTimeoutRef.current = setTimeout(() => {
        try {
          editorRef.current?.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
          // Also trigger quick suggestions
          editorRef.current?.trigger('keyboard', 'editor.action.triggerSuggest', {});
        } catch (error) {
          console.log("Error triggering inline suggestions:", error);
        }
      }, 50); // Faster response time
    }

    // Add debounced AI suggestion trigger
    if (connectionId && currentValue.length > 3) {
      // Clear existing AI timeout
      if (aiDebounceTimeoutRef.current) {
        clearTimeout(aiDebounceTimeoutRef.current);
      }
      
      // Set new AI timeout - trigger AI suggestions when user stops typing
      aiDebounceTimeoutRef.current = setTimeout(() => {
        if (editorRef.current) {
          try {
            console.log("Triggering AI suggestions after typing pause...");
            editorRef.current.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
          } catch (error) {
            console.log("Error triggering AI suggestions:", error);
          }
        }
      }, 500); // Wait 500ms after user stops typing
    }
  };

  const handleExecute = () => {
    if (onExecute && !loading) {
      onExecute(editorValue);
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
      if (!sql) return;

      // Enhanced SQL formatting with proper indentation and structure
      let formatted = sql
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        
        // Main clauses on new lines
        .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|FULL\s+OUTER\s+JOIN|GROUP\s+BY|ORDER\s+BY|HAVING|UNION|UNION\s+ALL|LIMIT|OFFSET)\b/gi, '\n$1')
        
        // Subqueries and complex expressions
        .replace(/\(\s*SELECT\b/gi, '(\n    SELECT')
        .replace(/\bCASE\b/gi, '\n    CASE')
        .replace(/\bWHEN\b/gi, '\n        WHEN')
        .replace(/\bTHEN\b/gi, ' THEN')
        .replace(/\bELSE\b/gi, '\n        ELSE')
        .replace(/\bEND\b/gi, '\n    END')
        
        // Operators and conditions
        .replace(/\b(AND|OR)\b/gi, '\n    $1')
        .replace(/\bON\b/gi, '\n    ON')
        
        // Column lists with proper indentation
        .replace(/,\s*(?![^()]*\))/g, ',\n    ')
        
        // Clean up excessive newlines
        .replace(/\n\s*\n/g, '\n')
        .replace(/^\n+/, '')
        
        // Proper indentation for nested structures
        .split('\n')
        .map((line) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return '';
          
          let indent = 0;
          
          // Main clauses at base level
          if (/^(SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|UNION|LIMIT|OFFSET)/i.test(trimmedLine)) {
            indent = 0;
          }
          // JOIN clauses slightly indented
          else if (/^(JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|FULL\s+OUTER\s+JOIN)/i.test(trimmedLine)) {
            indent = 0;
          }
          // AND/OR conditions indented
          else if (/^(AND|OR|ON)/i.test(trimmedLine)) {
            indent = 1;
          }
          // Column lists and other content
          else if (/^[A-Za-z0-9_]/.test(trimmedLine) || trimmedLine.startsWith(',')) {
            indent = 1;
          }
          // CASE/WHEN structures
          else if (/^(CASE|WHEN|THEN|ELSE|END)/i.test(trimmedLine)) {
            if (/^CASE/i.test(trimmedLine)) indent = 1;
            else if (/^(WHEN|ELSE)/i.test(trimmedLine)) indent = 2;
            else if (/^END/i.test(trimmedLine)) indent = 1;
            else indent = 1;
          }
          // Default indentation
          else {
            indent = 1;
          }
          
          return '    '.repeat(indent) + trimmedLine;
        })
        .join('\n')
        
        // Final cleanup
        .trim();

      // Capitalize SQL keywords consistently
      const keywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 
        'FULL OUTER JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 
        'LIKE', 'IS', 'NULL', 'GROUP BY', 'ORDER BY', 'HAVING', 'DISTINCT', 
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'UNION', 'UNION ALL', 'LIMIT', 
        'OFFSET', 'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'AS'
      ];
      
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        formatted = formatted.replace(regex, keyword);
      });

      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          // Get current cursor position
          const position = editorRef.current.getPosition();
          
          // Update the value
          model.setValue(formatted);
          
          // Restore cursor position approximately
          if (position) {
            editorRef.current.setPosition(position);
          }
          
          // Trigger onChange
          setEditorValue(formatted);
          onChange?.(formatted);
        }
      }
    } catch (error) {
      console.error("Error formatting SQL:", error);
    } finally {
      setIsFormatting(false);
    }
  };  const editorOptions = {
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
      maxVisibleSuggestions: 12,
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
    },    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    quickSuggestionsDelay: 5, // Even faster response for real-time AI suggestions
    parameterHints: { 
      enabled: true,
      cycle: true
    },
    inlineSuggest: { 
      enabled: true,
      mode: "prefix" as const,
      showToolbar: "always" as const, // Always show for better visibility
      suppressSuggestions: false
    },
    codeLens: false, // Disable to avoid conflicts
    accessibilitySupport: "auto" as const,
    wordBasedSuggestions: "allDocuments" as const, // Improved suggestions
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnCommitCharacter: true,
    snippetSuggestions: "top" as const,
    tabFocusMode: false,
    useTabStops: true,
    wordSeparators: "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
    // Enhanced inline suggestion settings
    inlineCompletionsAccessibilityVerbose: false,
    // Enable ghost text for inline suggestions
    ghostTextSupport: true,
    // Improved suggestion behavior
    suggestSelection: "first" as const,
    // Better keyboard interaction
    multiCursorModifier: "ctrlCmd" as const,
    // Enhanced editing experience
    autoIndent: "full" as const,
    formatOnPaste: true,
    formatOnType: true,
  };

  return (
    <div className={cn("relative w-full h-full flex flex-col bg-background", className)}>      {/* Floating Toolbar with AI features */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-lg"
        >
          {/* AI Features */}
          {connectionId && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (editorValue.trim()) {
                    const optimized = await optimizeQueryWithAI(editorValue);
                    if (optimized && optimized !== editorValue) {
                      setEditorValue(optimized);
                      onChange?.(optimized);
                      if (editorRef.current) {
                        editorRef.current.setValue(optimized);
                      }
                    }
                  }
                }}
                disabled={isAiThinking || !editorValue.trim()}
                className="h-8 px-2 text-xs text-foreground hover:bg-muted hover:text-primary transition-colors"
                title="AI Optimize Query"
              >
                {isAiThinking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
              </Button>              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (editorValue.trim()) {
                    await explainQueryWithAI(editorValue);
                  }
                }}
                disabled={isAiThinking || !editorValue.trim()}
                className="h-8 px-2 text-xs text-foreground hover:bg-muted hover:text-primary transition-colors"
                title="AI Explain Query"
              >
                <HelpCircle className="w-3 h-3" />
              </Button>

              <div className="w-px h-4 bg-border/50" />
            </>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={formatSQL}
            disabled={isFormatting}
            className="h-8 px-2 text-xs text-foreground hover:bg-muted hover:text-primary transition-colors"
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
          
          <div className="w-px h-4 bg-border/50" />
          
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={loading}
            className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium"
            title="Execute Query (Ctrl+Enter)"
          >
            {loading ? (
              <div className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Running</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                <span>Run</span>
              </div>
            )}
          </Button>
        </motion.div>

        {/* AI Status Indicator */}
        <AnimatePresence>
          {isAiThinking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg backdrop-blur-sm"
            >
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">AI thinking...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <MonacoEditor
          height="100%"
          language="sql"
          value={editorValue}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="professional-dark"
          options={editorOptions}
          loading={
            <div className="flex items-center justify-center h-full bg-background">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-primary rounded-full animate-spin border-t-transparent" />
                  <div className="absolute inset-0 w-5 h-5 border-2 border-primary/20 rounded-full animate-pulse" />
                </div>
                <span className="text-sm font-medium">Loading SQL Editor...</span>
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
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="flex items-center gap-3 px-6 py-3 bg-background border border-border rounded-lg shadow-lg">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-primary rounded-full animate-spin border-t-transparent" />
                  <div className="absolute inset-0 w-5 h-5 border-2 border-primary/20 rounded-full animate-pulse" />
                </div>
                <span className="text-sm font-medium text-foreground">Executing query...</span>
              </div>
            </motion.div>
          )}        </AnimatePresence>
      </div>

      {/* Query Explanation Modal */}
      <AnimatePresence>
        {showExplanation && lastExplanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowExplanation(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Query Explanation</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowExplanation(false)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="bg-muted/30 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Query:</h4>
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-mono bg-background/50 p-3 rounded border">
                    {editorValue.trim()}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Explanation:</h4>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {lastExplanation}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/20">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(lastExplanation);
                  }}
                  className="text-xs"
                >
                  Copy Explanation
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowExplanation(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfessionalSQLEditor;
