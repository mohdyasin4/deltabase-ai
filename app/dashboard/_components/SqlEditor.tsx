// SqlEditor.tsx
import React from "react";
import MonacoEditor from "@monaco-editor/react";
import * as monaco2 from "monaco-editor"; // Adjust import based on your monaco setup
import twilight from "./themes/Twilight.json";

interface SqlEditorProps {
  sqlQuery: string;
  onSqlChange: (value: string | undefined) => void;
  tables?: string[];
  columns?: string[];
  height?: string;
}

const SqlEditor: React.FC<SqlEditorProps> = ({ sqlQuery, onSqlChange, tables = [], columns = [], height }) => {
  const handleEditorDidMount = (
    editor: monaco2.editor.IStandaloneCodeEditor,
    monaco: typeof monaco2
  ) => {
    
    const modifiedtwilightTheme: monaco2.editor.IStandaloneThemeData = {
      base: twilight.base as monaco2.editor.BuiltinTheme,
      inherit: twilight.inherit,
      rules: twilight.rules,
      colors: {
        ...twilight.colors, 
        "editor.background": "#111111",
        "editor.textColor": "#FFFFFF",
      },
    };
    monaco.editor.defineTheme("twilight", modifiedtwilightTheme);
    monaco.editor.setTheme("twilight");
    // Define IntelliSense items
    const suggestions = [
      {
        label: "SELECT",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "SELECT ",
      },
      {
        label: "FROM",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "FROM ",
      },
      {
        label: "WHERE",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "WHERE ",
      },
      // Add more SQL keywords here
      ...tables.map((table) => ({
        label: table,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: table,
      })),
      ...columns.map((column) => ({
        label: column,
        kind: monaco.languages.CompletionItemKind.Field,
        insertText: column,
      })),
    ];

    // Register the completion item provider
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            range: range,
          })),
        };
      },
    });
  };

  return (
    <MonacoEditor
      height={height || "680px" }
      defaultLanguage="sql"
      value={sqlQuery}
      onChange={onSqlChange}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        wordWrap: "on",
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        wrappingIndent: "indent",
        wrappingStrategy: "advanced",
      }}
    />
  );
};

export default SqlEditor;
