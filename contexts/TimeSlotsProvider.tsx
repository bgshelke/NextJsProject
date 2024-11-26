"use client";
import { TimeSlotsType } from "@/types/main";
import React, { createContext, useContext, useState } from "react";
interface TimeSlotContextType {
  timeslots: TimeSlotsType[];
  setItems: React.Dispatch<React.SetStateAction<TimeSlotsType[]>>;
}
interface ProviderProps {
  children: React.ReactNode;
  slots: TimeSlotsType[];
}

const TimeSlotContext = createContext<TimeSlotContextType | undefined>(undefined);

export const TimeSlotsProvider: React.FC<ProviderProps> = ({
  children,
  slots,
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlotsType[]>(slots || []);

  return (
    <TimeSlotContext.Provider value={{ timeslots: timeSlots, setItems: setTimeSlots }}>
      {children}
    </TimeSlotContext.Provider>
  );
};

export const useTimeSlots = () => {
  const context = useContext(TimeSlotContext);
  if (context === undefined) {
    throw new Error("useTimeSlots must be used within a TimeSlotProvider");
  }
  return context;
};
