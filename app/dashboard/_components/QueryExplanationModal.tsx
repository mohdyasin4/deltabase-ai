"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Eye, 
  Code, 
  Copy, 
  X,
  Loader2
} from "lucide-react";

interface QueryExplanationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sqlQuery: string;
  explanation: string;
  conciseExplanation?: string;
  detailedExplanation?: string;
  loading?: boolean;
}

export default function QueryExplanationModal({
  isOpen,
  onOpenChange,
  sqlQuery,
  explanation,
  conciseExplanation,
  detailedExplanation,
  loading = false,
}: QueryExplanationModalProps) {
  const [copied, setCopied] = React.useState<'query' | 'explanation' | null>(null);
  const [isDetailedMode, setIsDetailedMode] = React.useState(false);
  // Helper function to create concise explanation
  const createConciseExplanation = (fullExplanation: string) => {
    if (!fullExplanation) return "";
    
    // Remove step-by-step breakdown sections from concise view
    const lines = fullExplanation.split('\n').filter(line => line.trim());
    const filteredLines: string[] = [];
    let skipStepByStep = false;
    
    for (const line of lines) {
      // Skip step-by-step sections in concise mode
      if (line.match(/^##\s*(Step-by-Step|Step by Step|Breakdown|Steps)/i)) {
        skipStepByStep = true;
        continue;
      }
      
      // Reset skip flag when we hit a new section
      if (line.startsWith('##') && !line.match(/^##\s*(Step-by-Step|Step by Step|Breakdown|Steps)/i)) {
        skipStepByStep = false;
      }
      
      // Skip numbered step lines (1., 2., 3., etc.)
      if (skipStepByStep || line.match(/^\d+\./)) {
        continue;
      }
      
      filteredLines.push(line);
    }
    
    // Take first 2 sections or 8 lines for concise view
    const conciseContent = filteredLines.slice(0, 8).join('\n');
    return conciseContent + (filteredLines.length > 8 ? '\n\n*Switch to detailed view for complete explanation*' : '');
  };

  const handleCopy = async (text: string, type: 'query' | 'explanation') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  // Helper function to process inline formatting
  const processInlineFormatting = (text: string) => {
    return text
      // Convert **bold** to strong tags
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert *italic* to em tags
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert `code` to code tags
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-800 dark:text-slate-200">$1</code>');
  };

  // Component for rendering formatted text
  const FormattedText = ({ children, className = "" }: { children: string; className?: string }) => (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: processInlineFormatting(children) }}
    />
  );// Format explanation for better readability and handle markdown
  const formatExplanation = (text: string) => {
    if (!text) return [];
    
    // Split into sections by ## headers first
    const sections = text.split(/(?=##\s)/g).filter(s => s.trim());
    
    const formattedContent: Array<{
      type: string;
      content: string;
      id: number;
      level?: number;
      number?: string;
    }> = [];
    
    let itemId = 0;
    
    sections.forEach((section) => {
      const lines = section.trim().split('\n').filter(line => line.trim());
      
      lines.forEach((line) => {
        const trimmed = line.trim();
        
        // Section headers (## )
        if (trimmed.startsWith('## ')) {
          formattedContent.push({
            type: 'section-header',
            content: trimmed.replace(/^##\s*/, ''),
            id: itemId++
          });
          return;
        }
        
        // Subsection headers (### )
        if (trimmed.startsWith('### ')) {
          formattedContent.push({
            type: 'subsection-header',
            content: trimmed.replace(/^###\s*/, ''),
            id: itemId++
          });
          return;
        }
        
        // Numbered list items
        if (trimmed.match(/^\d+\.\s/)) {
          const match = trimmed.match(/^(\d+)\.\s*(.+)$/);
          if (match) {
            formattedContent.push({
              type: 'numbered',
              content: match[2],
              number: match[1],
              id: itemId++
            });
          }
          return;
        }
        
        // Bullet points
        if (trimmed.match(/^[•·*-]\s/)) {
          formattedContent.push({
            type: 'bullet',
            content: trimmed.replace(/^[•·*-]\s*/, ''),
            id: itemId++
          });
          return;
        }
        
        // Code blocks (containing SQL keywords)
        if (trimmed.match(/(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|HAVING|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i) && 
            trimmed.length > 20) {
          formattedContent.push({
            type: 'code',
            content: trimmed,
            id: itemId++
          });
          return;
        }
        
        // Regular paragraphs (skip very short lines that might be artifacts)
        if (trimmed.length > 10) {
          formattedContent.push({
            type: 'paragraph',
            content: trimmed,
            id: itemId++
          });
        }
      });
    });
    
    return formattedContent;
  };  // Get the appropriate explanation based on mode
  const displayExplanation = React.useMemo(() => {
    if (!explanation && !conciseExplanation && !detailedExplanation) return "";
    
    if (isDetailedMode) {
      return detailedExplanation || explanation || "";
    } else {
      return conciseExplanation || createConciseExplanation(explanation) || "";
    }
  }, [explanation, conciseExplanation, detailedExplanation, isDetailedMode]);

  const formattedExplanation = React.useMemo(() => {
    return formatExplanation(displayExplanation);
  }, [displayExplanation]);
  // Dynamic modal size based on mode
  const modalClassName = React.useMemo(() => {
    const baseClasses = "p-0 gap-0 bg-background border border-border/20 shadow-2xl overflow-hidden flex flex-col";
    
    if (!isDetailedMode && displayExplanation) {
      // Smaller modal for concise mode
      return `max-w-4xl w-[85vw] h-[45vh] ${baseClasses}`;
    } else {
      // Larger modal for detailed mode or when no explanation yet
      return `max-w-6xl w-[95vw] h-[85vh] ${baseClasses}`;
    }
  }, [isDetailedMode, displayExplanation]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-24 flex-1"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <div className="absolute inset-0 w-8 h-8 border-2 border-primary/20 rounded-full animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-medium text-foreground">Analyzing Query</h3>
                  <p className="text-sm text-muted-foreground">Generating explanation...</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col h-full"
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/10 flex-shrink-0 bg-background">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Query Explanation</h2>
                    <p className="text-sm text-muted-foreground">Understanding your SQL query</p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* SQL Query Panel */}
                <div className="w-2/5 border-r border-border/10 bg-muted/5 flex flex-col">
                  <div className="p-4 border-b border-border/10 bg-background/80 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">SQL Query</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(sqlQuery, 'query')}
                        className="h-7 px-2 text-xs hover:bg-background"
                      >
                        {copied === 'query' ? (
                          <span className="text-green-600 text-xs">✓ Copied</span>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                    <ScrollArea className="flex-1">
                    <div className="p-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <pre className="text-sm leading-relaxed font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                          {sqlQuery}
                        </pre>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Explanation Panel */}
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-border/10 bg-background/80 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">Explanation</span>
                        {explanation && (
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setIsDetailedMode(false)}
                              className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                                !isDetailedMode 
                                  ? 'bg-primary text-primary-foreground shadow-sm' 
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                              }`}
                            >
                              Concise
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setIsDetailedMode(true)}
                              className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                                isDetailedMode 
                                  ? 'bg-primary text-primary-foreground shadow-sm' 
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                              }`}
                            >
                              Detailed
                            </motion.button>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(displayExplanation, 'explanation')}
                        className="h-7 px-2 text-xs hover:bg-muted/50"
                      >
                        {copied === 'explanation' ? (
                          <span className="text-green-600 text-xs">✓ Copied</span>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="p-6">
                      {formattedExplanation.length > 0 ? (
                        <motion.div 
                          key={isDetailedMode ? 'detailed' : 'concise'}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          {formattedExplanation.map((item, index) => (
                            <motion.div
                              key={`${isDetailedMode ? 'detailed' : 'concise'}-${item.id}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                              {item.type === 'section-header' && (
                                <div className="mb-4 mt-6 first:mt-0">
                                  <h2 className="text-lg font-bold text-foreground border-b-2 border-primary/20 pb-2 mb-3">
                                    <FormattedText>{item.content}</FormattedText>
                                  </h2>
                                </div>
                              )}
                              
                              {item.type === 'subsection-header' && (
                                <div className="mb-3 mt-4">
                                  <h3 className="text-base font-semibold text-foreground/90 border-l-3 border-primary/40 pl-3">
                                    <FormattedText>{item.content}</FormattedText>
                                  </h3>
                                </div>
                              )}
                                {item.type === 'code' && (
                                <div className="my-3">
                                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                    <pre className="text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words overflow-hidden">
                                      {item.content}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              
                              {item.type === 'numbered' && (
                                <div className="flex gap-4 items-start mb-3">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-sm font-semibold text-primary">
                                      {item.number}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <p className="text-sm leading-relaxed text-foreground break-words">
                                      <FormattedText>{item.content}</FormattedText>
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {item.type === 'bullet' && (
                                <div className="flex gap-4 items-start mb-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/70 flex-shrink-0 mt-2.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm leading-relaxed text-foreground/90 break-words">
                                      <FormattedText>{item.content}</FormattedText>
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {item.type === 'paragraph' && (
                                <div className="mb-3">
                                  <p className="text-sm leading-relaxed text-foreground/90 break-words">
                                    <FormattedText>{item.content}</FormattedText>
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : (
                        <div className="text-center py-20">
                          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center">
                            <Eye className="w-10 h-10 text-muted-foreground/60" />
                          </div>
                          <h3 className="text-lg font-medium text-foreground mb-3">
                            {explanation ? "Processing explanation..." : "No explanation available"}
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                            {explanation 
                              ? "The AI is analyzing your query structure and generating a comprehensive breakdown of how it works." 
                              : "Click the 'Explain' button (eye icon) in the SQL editor toolbar to get an AI-powered explanation of your query's functionality and structure."
                            }
                          </p>
                          {!explanation && (
                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
                              <Eye className="w-4 h-4" />
                              <span>Explain feature powered by AI</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 border-t border-border/10 bg-background flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>AI-powered query analysis</span>
                    {!isDetailedMode && explanation ? (
                      <span className="text-primary">• Concise view</span>
                    ) : <span className="text-primary">• Detailed view</span>}
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => onOpenChange(false)}
                      size="sm"
                      className="h-8 px-4 bg-primary hover:bg-primary/90"
                    >
                      Done
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
