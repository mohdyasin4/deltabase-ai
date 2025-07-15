import { create } from "zustand";
import { shallow } from "zustand/shallow";

interface SidePanelState {
  isAiSidePanelOpen: boolean;
  showSidePanel: boolean;
  showSummarizePanel: boolean;
  setIsAiSidePanelOpen: (open: boolean) => void;
  setShowSidePanel: (open: boolean) => void;
  setShowSummarizePanel: (open: boolean) => void;
}

export const useSidePanelStore = create<SidePanelState>((set) => ({
    isAiSidePanelOpen: false,
    showSidePanel: false,
    showSummarizePanel: false,
    setIsAiSidePanelOpen: (open) =>
      set((state) =>
        state.isAiSidePanelOpen === open ? state : { isAiSidePanelOpen: open }
      ),
    setShowSidePanel: (open) =>
      set((state) =>
        state.showSidePanel === open ? state : { showSidePanel: open }
      ),
    setShowSummarizePanel: (open) =>
      set((state) =>
        state.showSummarizePanel === open ? state : { showSummarizePanel: open }
      ),
  }));