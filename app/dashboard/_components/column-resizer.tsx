import { Header } from "@tanstack/react-table";

export const ColumnResizer = ({ header }: { header: Header<any, unknown> }) => {
  if (!header.column.getCanResize()) return null;

  return (
    <div
    {...{
      onDoubleClick: () => header.column.resetSize(),
      onMouseDown: header.getResizeHandler(),
      onTouchStart: header.getResizeHandler(),
      className: `absolute top-0 right-0 cursor-w-resize w-px h-full bg-transparent 800 hover:bg-primary hover:w-1 transition-all duration-500 ease-in-out ${header.column.getIsResizing() ? 'bg-white w-1 absolute right-0 top-0 h-full' : ''     }`,
      style: {  
        userSelect: "none",
        touchAction: "none",
      },
    }}
  />
);
};