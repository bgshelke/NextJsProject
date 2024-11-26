"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeliveryDayStore,
  useSelectedSubDayDate,
  useSubscriptionDaysStore,
} from "@/stores/plan/usePlanStore";
import {
  getSusbcriptionWeekDates,
  estTimeZone,
} from "@/lib/helper/dateFunctions";

import { toZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";

function SelectDeliveryDate() {
  const today = toZonedTime(new Date(), estTimeZone);
  const tomorrow = addDays(today, 1);
  const weekDates = getSusbcriptionWeekDates(tomorrow);
  const { selectedDeliveryDate, setSelectedDeliveryDate } =
    useDeliveryDayStore();
  const { clearSubscriptionDays } = useSubscriptionDaysStore();
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 mt-4">
        Set Subscription Start Date
      </h2>
      <Select
        onValueChange={(value: string) => {
          setSelectedDeliveryDate(
            toZonedTime(value, estTimeZone).toISOString().split("T")[0]
          );
          clearSubscriptionDays();
        }}
        value={selectedDeliveryDate || ""}
      >
        <SelectTrigger
          className="w-full rounded-md p-6"
          data-test="select-delivery-date"
        >
          <SelectValue placeholder="Select Date" />
        </SelectTrigger>
        <SelectContent>
          {weekDates.map((date) => (
            <SelectItem
              className="py-2"
              key={toZonedTime(new Date(date), estTimeZone).toISOString()}
              value={
                toZonedTime(new Date(date), estTimeZone)
                  .toISOString()
                  .split("T")[0]
              }
            >
              {toZonedTime(date, estTimeZone).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SelectDeliveryDate;
