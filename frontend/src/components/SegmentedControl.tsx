import React from "react";
import { ViewMode } from "../types";

interface SegmentedControlProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="segmented-control">
      <button
        className={`segment ${value === "chat" ? "active" : ""}`}
        onClick={() => onChange("chat")}
      >
        💬 Chat
      </button>
      <button
        className={`segment ${value === "paints" ? "active" : ""}`}
        onClick={() => onChange("paints")}
      >
        🎨 Catálogo
      </button>
    </div>
  );
};
