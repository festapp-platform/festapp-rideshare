"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  isToday as isDateToday,
  type Locale,
} from "date-fns";
import { cs, sk, enUS } from "date-fns/locale";
import { useI18n } from "@/lib/i18n/provider";

const localeMap: Record<string, Locale> = {
  cs,
  sk,
  en: enUS,
};

interface DateTimePickerProps {
  /** Currently selected date string (YYYY-MM-DD) */
  selectedDate: string;
  /** Currently selected hour (00-23) */
  selectedHour: string;
  /** Currently selected minute (00, 05, 10, ..., 55) */
  selectedMinute: string;
  /** Callback when date changes */
  onDateChange: (date: string) => void;
  /** Callback when hour changes */
  onHourChange: (hour: string) => void;
  /** Callback when minute changes */
  onMinuteChange: (minute: string) => void;
  /** Whether to show time picker (default: true) */
  showTime?: boolean;
  /** Label for the date section */
  dateLabel?: string;
  /** Label for the time section */
  timeLabel?: string;
}

const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);

/**
 * Shared DateTimePicker component (GROUP-C).
 * Features:
 * - Calendar grid with no past dates selectable
 * - Minutes in 5-min steps
 * - Mobile-friendly with large touch targets
 * - Localized month/day names via date-fns locale
 * - Tailwind styling matching pastel design system
 */
export function DateTimePicker({
  selectedDate,
  selectedHour,
  selectedMinute,
  onDateChange,
  onHourChange,
  onMinuteChange,
  showTime = true,
  dateLabel,
  timeLabel,
}: DateTimePickerProps) {
  const { locale } = useI18n();
  const dateFnsLocale = localeMap[locale] ?? cs;
  const today = useMemo(() => startOfDay(new Date()), []);

  // Parse selected date or default to today
  const selectedDateObj = useMemo(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return today;
  }, [selectedDate, today]);

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDateObj));

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewMonth]);

  // Weekday headers
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return format(d, "EEEEEE", { locale: dateFnsLocale });
    });
  }, [dateFnsLocale]);

  const handleDateSelect = useCallback(
    (day: Date) => {
      if (isBefore(day, today)) return;
      const dateStr = format(day, "yyyy-MM-dd");
      onDateChange(dateStr);
    },
    [onDateChange, today],
  );

  const goToPrevMonth = useCallback(() => {
    const prev = subMonths(viewMonth, 1);
    // Don't go before current month
    if (!isBefore(endOfMonth(prev), today)) {
      setViewMonth(prev);
    }
  }, [viewMonth, today]);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => addMonths(m, 1));
  }, []);

  const canGoPrev = !isBefore(endOfMonth(subMonths(viewMonth, 1)), today);

  // Check if selected date is today (use fresh Date() for current hour/minute)
  const isSelectedToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  // Auto-advance past hour/minute when today is selected
  useEffect(() => {
    if (!isSelectedToday) return;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const selH = parseInt(selectedHour, 10);
    const selM = parseInt(selectedMinute, 10);

    if (selH < currentHour) {
      // Selected hour is past — advance to current hour and next valid minute
      const nextMinute = MINUTES.find((m) => parseInt(m, 10) > currentMinute);
      onHourChange(String(currentHour).padStart(2, "0"));
      onMinuteChange(nextMinute ?? MINUTES[MINUTES.length - 1]);
    } else if (selH === currentHour && selM <= currentMinute) {
      // Same hour but past minute — advance to next valid minute
      const nextMinute = MINUTES.find((m) => parseInt(m, 10) > currentMinute);
      if (nextMinute) {
        onMinuteChange(nextMinute);
      } else {
        // No valid minutes left in this hour — advance to next hour
        const nextHour = currentHour + 1;
        if (nextHour <= 23) {
          onHourChange(String(nextHour).padStart(2, "0"));
          onMinuteChange("00");
        }
      }
    }
  }, [selectedDate, selectedHour, selectedMinute, isSelectedToday, onHourChange, onMinuteChange]);

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div>
        {dateLabel && (
          <span className="mb-2 block text-sm font-medium text-text-main">
            {dateLabel}
          </span>
        )}
        <div className="rounded-2xl border border-border-pastel bg-surface p-4">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevMonth}
              disabled={!canGoPrev}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-primary/5 disabled:opacity-30"
              aria-label="Previous month"
            >
              <svg className="h-5 w-5 text-text-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-base font-semibold capitalize text-text-main">
              {format(viewMonth, "LLLL yyyy", { locale: dateFnsLocale })}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-primary/5"
              aria-label="Next month"
            >
              <svg className="h-5 w-5 text-text-main" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 gap-0">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-xs font-medium uppercase text-text-secondary"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map((day) => {
              const isPast = isBefore(day, today);
              const isSelected = isSameDay(day, selectedDateObj);
              const isCurrentMonth = isSameMonth(day, viewMonth);
              const isNow = isDateToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleDateSelect(day)}
                  className={`flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    !isCurrentMonth
                      ? "text-text-secondary/40"
                      : isPast
                        ? "cursor-not-allowed text-text-secondary/40"
                        : isSelected
                          ? "bg-primary text-surface"
                          : isNow
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "text-text-main hover:bg-primary/5"
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Time picker */}
      {showTime && (
        <div>
          {timeLabel && (
            <span className="mb-2 block text-sm font-medium text-text-main">
              {timeLabel}
            </span>
          )}
          <div className="flex items-center gap-2">
            <select
              value={selectedHour}
              onChange={(e) => onHourChange(e.target.value)}
              className="flex-1 rounded-xl border border-border-pastel bg-background px-4 py-3 text-center text-lg font-semibold text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {HOURS.map((h) => {
                const isPastHour = isSelectedToday && parseInt(h, 10) < new Date().getHours();
                return (
                  <option key={h} value={h} disabled={isPastHour}>
                    {h}
                  </option>
                );
              })}
            </select>
            <span className="text-2xl font-bold text-text-secondary">:</span>
            <select
              value={selectedMinute}
              onChange={(e) => onMinuteChange(e.target.value)}
              className="flex-1 rounded-xl border border-border-pastel bg-background px-4 py-3 text-center text-lg font-semibold text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {MINUTES.map((m) => {
                const now = new Date();
                const isPastMinute = isSelectedToday
                  && parseInt(selectedHour, 10) === now.getHours()
                  && parseInt(m, 10) <= now.getMinutes();
                return (
                  <option key={m} value={m} disabled={isPastMinute}>
                    {m}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
