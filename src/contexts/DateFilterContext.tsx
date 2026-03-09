import React, { createContext, useContext, useState, useMemo } from "react";
import { type DatePreset, type DateRange, getDateRange } from "@/lib/date-utils";

interface DateFilterContextType {
  preset: DatePreset;
  setPreset: (p: DatePreset) => void;
  customRange: DateRange | undefined;
  setCustomRange: (r: DateRange) => void;
  dateRange: DateRange;
}

const DateFilterContext = createContext<DateFilterContextType | null>(null);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<DatePreset>("last30");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const dateRange = useMemo(
    () => getDateRange(preset, customRange),
    [preset, customRange]
  );

  return (
    <DateFilterContext.Provider value={{ preset, setPreset, customRange, setCustomRange, dateRange }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error("useDateFilter must be used within DateFilterProvider");
  return ctx;
}
