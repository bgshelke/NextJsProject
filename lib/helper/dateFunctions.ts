import { TimeSlotsType } from "@/types/main";
import { addDays, addHours, format, isAfter, isTomorrow } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
export const estTimeZone = "EST";
export const utcTimeZone = "UTC";

export const convertToAmPm = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const adjustedHours = hours % 12 || 12;
  return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

//used for subscription  -

export const getSusbcriptionWeekDates = (startDate?: Date) => {
  const today = toZonedTime(startDate || new Date(), estTimeZone);
  const currentHour = today.getHours();
  const isAfterTenPM = currentHour >= 22;
  const startDayOffset = isAfterTenPM ? 1 : 0;

  const weekDates = [];
  for (let i = startDayOffset; i < 7 + startDayOffset; i++) {
    const date = addDays(today, i);
    date.setHours(0, 0, 0, 0);
    weekDates.push(date);
  }

  return weekDates;
};

export function disableTomorrow(orderDate: Date,actionDisabledTime:string): boolean {
  const isTomorrowOrder = isTomorrow(orderDate);
  if (!isTomorrowOrder) {
    return false;
  }
  const currentTime = new Date();
  const [cutoffHours, cutoffMinutes] = (actionDisabledTime || "17:00").split(':').map(Number);
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffHours, cutoffMinutes, 0);
  return currentTime >= cutoffTime;
}

export const getWeekDates = (startDate?: Date) => {
  const today = toZonedTime(startDate || new Date(), estTimeZone);
  const weekDates = [];
  for (let i = 0; i < 7; i++) {

    const date = addDays(today, i);
  
    date.setHours(0, 0, 0, 0);

    weekDates.push(date);
  }

  return weekDates;
};

export const disableTimeSlot = (timeSlot: TimeSlotsType): boolean => {
  const timeDefined = timeSlot.timeStart;
  const hoursToSubtract = 2;
  const currentDate = toZonedTime(new Date(), estTimeZone);
  const [definedHour, definedMinute] = timeDefined.split(":").map(Number);
  const timeDefinedDate = toZonedTime(new Date(), estTimeZone);
  timeDefinedDate.setHours(definedHour, definedMinute, 0, 0);
  const adjustedTime = addHours(timeDefinedDate, -hoursToSubtract);
  const isTimeOver = isAfter(currentDate, adjustedTime);

  return isTimeOver;
};

// used on menu page
export const getWeeklyRanges = (numberOfWeeks?: number) => {
  const ranges: { start: Date; end: Date }[] = [];
  const today = toZonedTime(new Date(), estTimeZone);
  const startOfWeek = today.getDate() - today.getDay();

  for (let i = 0; i < (numberOfWeeks || 5); i++) {
    const start = new Date(today.setDate(startOfWeek + i * 7));
    const end = new Date(today.setDate(startOfWeek + i * 7 + 6));
    ranges.push({ start, end });
  }

  return ranges;
};

export const getDaysInWeek = (week: { start: Date; end: Date }) => {
  const dates: Date[] = [];
  let currentDate = toZonedTime(new Date(week.start), estTimeZone);
  const endDate = toZonedTime(new Date(week.end), estTimeZone);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const formatDateRange = (start: Date, end: Date) => {
  const startDate = formatInTimeZone(start, estTimeZone, "MMM d");
  const endDate = formatInTimeZone(end, estTimeZone, "MMM d");
  return `${startDate} - ${endDate}`;
};

// end here

//f
export const getUpcomingWeeks = (currentPeriodStart: Date) => {
  const nextWeekStart = addDays(currentPeriodStart, 7);
  const thirdWeekStart = addDays(currentPeriodStart, 14);

  const nextWeekRange = getWeekRange(nextWeekStart);
  const thirdWeekRange = getWeekRange(thirdWeekStart);

  return {
    nextWeekRange,
    thirdWeekRange,
  };
};

export const getWeekRange = (date: Date) => {
  const weekStart = date;
  const weekEnd = addDays(weekStart, 6);

  return {
    start: weekStart,
    end: weekEnd,
  };
};
