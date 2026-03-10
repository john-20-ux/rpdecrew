import { CalendarDays, Moon, Sun, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useTheme } from "@/hooks/useTheme";
import { DATE_PRESET_LABELS, type DatePreset } from "@/lib/date-utils";
import { formatDateShort } from "@/lib/date-utils";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

export function TopBar() {
  const { preset, setPreset, dateRange, setCustomRange } = useDateFilter();
  const { theme, toggle } = useTheme();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const location = useLocation();

  const isSettingsPage = location.pathname === "/settings";

  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      setPreset("custom");
      setCalendarOpen(true);
    } else {
      setPreset(value as DatePreset);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="shrink-0" />

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {!isSettingsPage && (
          <>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <CalendarDays className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {preset === "custom" && (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs h-9">
                    {formatDateShort(dateRange.from)} – {formatDateShort(dateRange.to)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setCustomRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </>
        )}

        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
