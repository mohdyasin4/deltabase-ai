import React from "react";

interface NumberWidgetProps {
  numberValue: number;
}

export const NumberWidget = ({ numberValue }: NumberWidgetProps) => {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="number-widget h-full w-full bg-foreground-100 flex items-center justify-center text-foreground  shadow-md">
        <div className="w-full font-bold text-[min(10vw,5em)] flex items-center justify-center text-center leading-none">
          {numberValue}
        </div>
      </div>
    </div>
  );
};
