// app/dashboard/_components/WidgetPlaceholder.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MousePointer, Grid3X3 } from 'lucide-react';

interface WidgetPlaceholderProps {
  onAddWidget: () => void;
  editMode: boolean;
  className?: string;
}

export const WidgetPlaceholder: React.FC<WidgetPlaceholderProps> = ({
  onAddWidget,
  editMode,
  className = ""
}) => {
  if (!editMode) return null;

  return (
    <div className={`add-widget-zone widget-placeholder-enhanced h-full relative group ${className}`}>
      {/* Corner indicators */}
      <div className="corner-indicator top-left"></div>
      <div className="corner-indicator top-right"></div>
      <div className="corner-indicator bottom-left"></div>
      <div className="corner-indicator bottom-right"></div>
      
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-3 border border-dashed border-primary/30 rounded-md"></div>
        <div className="absolute inset-6 border border-dashed border-primary/20 rounded-sm"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full grid grid-cols-4 grid-rows-3 gap-1 p-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-primary/30 rounded-sm"></div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center h-full text-center p-6 relative z-10">
        <div className="mb-4 relative">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border-2 border-dashed border-primary/30 group-hover:border-primary/50 transition-colors">
            <PlusCircle className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
          </div>
          {/* Floating indicators */}
          <Grid3X3 className="absolute -top-1 -right-1 h-4 w-4 text-primary/60 animate-pulse" />
          <MousePointer className="absolute -bottom-1 -left-1 h-3 w-3 text-primary/60 animate-bounce" />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Add Widget Zone</h3>
          <p className="text-xs text-muted-foreground max-w-48 leading-relaxed">
            Drop your widget here or click to create charts, tables, and metrics
          </p>
          <Button
            size="sm"
            onClick={onAddWidget}
            variant="outline"
            className="h-8 text-xs border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all group-hover:scale-105"
          >
            <PlusCircle size={12} className="mr-1.5" />
            Create Widget
          </Button>
        </div>
        
        {/* Corner indicators */}
        <div className="absolute top-2 left-2 w-2 h-2 bg-primary/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute top-2 right-2 w-2 h-2 bg-primary/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 bg-primary/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-primary/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </div>
  );
};
