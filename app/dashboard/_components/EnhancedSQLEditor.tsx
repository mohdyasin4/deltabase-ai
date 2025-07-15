"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MonacoEditor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Square, 
  Save, 
  Copy, 
  Download, 
  Settings, 
  Maximize2, 
  Minimize2,
  Eye,
  EyeOff,
  Zap,
  Database,
  Clock,
  RotateCcw,
  FileText,
  Code2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedSQLEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onExecute?: (query: string) => void;
  loading?: boolean;
  className?: string;
  height?: string;
  readOnly?: boolean;
  showMinimap?: boolean;
  theme?: "light" | "dark";
  executionTime?: number;
  resultCount?: number;
  error?: string;
}

const EnhancedSQLEditor: React.FC<EnhancedSQLEditorProps> = ({
  value = "",
  onChange,
  onExecute,
  loading = false,
  className = "",
  height = "400px",
  readOnly = false,
  showMinimap = false,
  theme = "dark",
  executionTime,
  resultCount,
  error
}) => {
  const [editorValue, setEditorValue] = useState(value);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  const handleEditorMount = (editor: any, monaco: typeof import("monaco-editor")) => {
    editorRef.current = editor;
    
    // Define custom themes
    monaco.editor.defineTheme("custom-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "#569cd6", fontStyle: "bold" },
        { token: "string", foreground: "#ce9178" },
        { token: "comment", foreground: "#6a9955", fontStyle: "italic" },
        { token: "number", foreground: "#b5cea8" },
        { token: "operator", foreground: "#d4d4d4" },
        { token: "delimiter", foreground: "#d4d4d4" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#f0f6fc",
        "editorLineNumber.foreground": "#7d8590",
        "editorLineNumber.activeForeground": "#f0f6fc",
        "editor.selectionBackground": "#264f78",
        "editor.selectionHighlightBackground": "#3a3a3a",
        "editorCursor.foreground": "#f0f6fc",
        "editor.lineHighlightBackground": "#21262d",
        "editorGutter.background": "#0d1117",
        "editorGutter.modifiedBackground": "#f2cc60",
        "editorGutter.addedBackground": "#3fb950",
        "editorGutter.deletedBackground": "#f85149",
        "scrollbarSlider.background": "#484f58",
        "scrollbarSlider.hoverBackground": "#5a6169",
        "scrollbarSlider.activeBackground": "#6e7681",
      },
    });

    monaco.editor.defineTheme("custom-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "#0969da", fontStyle: "bold" },
        { token: "string", foreground: "#0a3069" },
        { token: "comment", foreground: "#6e7781", fontStyle: "italic" },
        { token: "number", foreground: "#0550ae" },
        { token: "operator", foreground: "#24292f" },
        { token: "delimiter", foreground: "#24292f" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#24292f",
        "editorLineNumber.foreground": "#656d76",
        "editorLineNumber.activeForeground": "#24292f",
        "editor.selectionBackground": "#0969da1a",
        "editor.selectionHighlightBackground": "#0969da0d",
        "editorCursor.foreground": "#24292f",
        "editor.lineHighlightBackground": "#f6f8fa",
        "editorGutter.background": "#ffffff",
        "editorGutter.modifiedBackground": "#bf8700",
        "editorGutter.addedBackground": "#1a7f37",
        "editorGutter.deletedBackground": "#cf222e",
      },
    });

    // Set theme
    monaco.editor.setTheme(theme === "dark" ? "custom-dark" : "custom-light");

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
        editor.trigger("", "editor.action.formatDocument", {});
      },
    });
  };

  const handleEditorChange = (newValue: string | undefined) => {
    const currentValue = newValue || "";
    setEditorValue(currentValue);
    onChange?.(currentValue);
  };

  const handleExecute = () => {
    if (onExecute && !loading) {
      onExecute(editorValue);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorValue);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSave = () => {
    const blob = new Blob([editorValue], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const editorOptions = {
    minimap: { enabled: showMinimap },
    wordWrap: wordWrap ? "on" : "off",
    lineNumbers: showLineNumbers ? "on" : "off",
    fontSize,
    lineHeight: 1.6,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    fontLigatures: true,
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    renderLineHighlight: "gutter",
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    folding: true,
    foldingHighlight: true,
    showFoldingControls: "always",
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showFunctions: true,
    },
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    readOnly,
  };

  return (
    <TooltipProvider>
      <motion.div
        ref={containerRef}
        className={cn(
          "relative bg-background border border-border rounded-lg overflow-hidden",
          isFullscreen && "fixed inset-0 z-50 rounded-none",
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">SQL Editor</span>
            </motion.div>
            
            {/* Status Indicators */}
            <div className="flex items-center gap-2 ml-4">
              {loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Executing...
                </motion.div>
              )}
              
              {executionTime && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium"
                >
                  <Clock className="w-3 h-3" />
                  {executionTime}ms
                </motion.div>
              )}
              
              {resultCount !== undefined && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                >
                  <FileText className="w-3 h-3" />
                  {resultCount} rows
                </motion.div>
              )}
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-xs font-medium"
                >
                  <AlertCircle className="w-3 h-3" />
                  Error
                </motion.div>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1">
            {!readOnly && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExecute}
                      disabled={loading}
                      className="h-7 w-7 p-0 hover:bg-primary/10"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Execute Query (Ctrl+Enter)</TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-border mx-1" />
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy to Clipboard</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="h-7 w-7 p-0"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download as SQL</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                  className="h-7 w-7 p-0"
                >
                  {showLineNumbers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Line Numbers</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-7 w-7 p-0"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Fullscreen</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Editor Container */}
        <div 
          className="relative overflow-hidden"
          style={{ height: isFullscreen ? "calc(100vh - 60px)" : height }}
        >
          <MonacoEditor
            height="100%"
            language="sql"
            value={editorValue}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme={theme === "dark" ? "custom-dark" : "custom-light"}
            options={editorOptions as any}
            loading={
              <div className="flex items-center justify-center h-full bg-background">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading editor...</span>
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
                className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="flex items-center gap-3 px-4 py-2 bg-background border border-border rounded-lg shadow-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Executing query...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer with shortcuts */}
        <div className="px-4 py-2 bg-muted/20 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Ctrl+Enter: Execute</span>
              <span>Shift+Alt+F: Format</span>
              <span>Ctrl+S: Save</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Lines: {editorValue.split('\n').length}</span>
              <span>Characters: {editorValue.length}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default EnhancedSQLEditor;
