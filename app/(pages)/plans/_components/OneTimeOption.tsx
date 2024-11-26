"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  orderTiming,
  useOrderType,
  usePickUpOption,
} from "@/stores/plan/usePlanStore";
import { OneTimeOrderType, TimeSlotsType } from "@/types/main";
import { CalendarDays, CalendarIcon, PackageCheck } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  addDays,
  addMinutes,
  format,
  isAfter,
  isBefore,
  isToday,
  parse,
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { OpenHours, OrderType } from "@prisma/client";
import { convertToAmPm, estTimeZone } from "@/lib/helper/dateFunctions";
import { disableTimeSlot } from "@/lib/helper/dateFunctions";
import { toZonedTime } from "date-fns-tz";
import { useOpenHours } from "@/contexts/OpenHoursContext";

function OneTimeOption({ slots }: { slots: TimeSlotsType[] }) {
  const currentDate = toZonedTime(new Date(), estTimeZone);
  const tomorrow = addDays(currentDate, 1);
  const [date, setDate] = useState<Date | undefined>(tomorrow);
  const { oneTimeOrderOption, setOneTimeOrderOption } = useOrderType();
  const [selectedOrderType, setSelectedOrderType] =
    useState<OneTimeOrderType>("ORDERNOW");
  const { selectedDeliveryOption } = usePickUpOption();
  const { openHours } = useOpenHours();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleOrderTypeChange = useCallback(
    (orderType: OneTimeOrderType) => {
      const newDate = orderType === "SCHEDULED" ? tomorrow : currentDate;
      setSelectedOrderType(orderType);
      setOneTimeOrderOption({
        ...oneTimeOrderOption,
        orderType: orderType,
        orderDate: newDate,
        slotId: undefined,
        pickupTime: undefined,
      });
      if (orderType === "SCHEDULED") {
        setDate(tomorrow);
      } else {
        setDate(undefined);
      }
    },
    [currentDate, oneTimeOrderOption, setOneTimeOrderOption, tomorrow]
  );

  const todayOpenHours = openHours?.find(
    (hour: OpenHours) => hour.day === format(currentDate, "EEEE")
  );

  const handleSlotChange = useCallback(
    (value: string) => {
      setIsPopoverOpen(false);

      if (value === "") {
        setOneTimeOrderOption({
          slotId: undefined,
          pickupTime: undefined,
          orderType: selectedOrderType,
          orderDate:
            selectedOrderType === "ORDERNOW"
              ? currentDate
              : date || currentDate,
        });
      }

      const slot =
        selectedDeliveryOption === "DELIVERY"
          ? slots?.find((slot) => slot.id === value)
          : null;
      if (slot && selectedDeliveryOption === "DELIVERY") {
        setOneTimeOrderOption({
          slotId: slot.id,
          orderType: selectedOrderType,
          orderDate:
            selectedOrderType === "ORDERNOW"
              ? currentDate
              : date || currentDate,
        });
      }
      if (selectedDeliveryOption === "PICKUP" && value) {
        setOneTimeOrderOption({
          pickupTime: value,
          orderType: selectedOrderType,
          orderDate:
            selectedOrderType === "ORDERNOW"
              ? currentDate
              : date || currentDate,
        });
      }
    },
    [
      date,
      oneTimeOrderOption,
      selectedDeliveryOption,
      selectedOrderType,
      setOneTimeOrderOption,
    ]
  );

  const getCloseMessage = () => {
    if (todayOpenHours && todayOpenHours.isClosed) {
      return true;
    } else if (
      todayOpenHours &&
      isAfter(currentDate, parse(todayOpenHours.closeTime, "HH:mm", new Date()))
    ) {
      return true;
    }
    return false;
  };

  const getPickupTime = useCallback(() => {
    const targetDate =
      selectedOrderType === "ORDERNOW" ? currentDate : date || currentDate;
    const weekday = format(targetDate, "EEEE");

    const selectedDayOpenHours = openHours?.find(
      (hour: OpenHours) => hour.day === weekday
    );

    if (selectedDayOpenHours && !selectedDayOpenHours.isClosed) {
      const intervals = [];
      let currentTime = parse(
        selectedDayOpenHours.openTime,
        "HH:mm",
        targetDate
      );
      const closeTime = parse(
        selectedDayOpenHours.closeTime,
        "HH:mm",
        targetDate
      );

      if (selectedOrderType === "ORDERNOW" && isToday(targetDate)) {
        const bufferTime = addMinutes(currentDate, 30);
        if (isBefore(currentTime, bufferTime)) {
          currentTime = bufferTime;
        }
        currentTime.setMinutes(Math.ceil(currentTime.getMinutes() / 30) * 30);
      }

      while (isBefore(currentTime, closeTime)) {
        intervals.push(format(currentTime, "HH:mm"));
        currentTime = addMinutes(currentTime, 30);
      }

      return intervals;
    }

    return [];
  }, [date, openHours, selectedOrderType, currentDate]);

  const allSlotsDisabled = () => {
    const allclosed = slots?.every((slot) => disableTimeSlot(slot));
    return allclosed;
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setIsPopoverOpen(false);
  };

  const isKitchenClosedForDay = useCallback(() => {
    const targetDate =
      selectedOrderType === "ORDERNOW" ? currentDate : date || currentDate;
    const weekday = format(targetDate, "EEEE");
    const selectedDayOpenHours = openHours?.find(
      (hour: OpenHours) => hour.day === weekday
    );

    return selectedDayOpenHours?.isClosed || !selectedDayOpenHours;
  }, [date, openHours, selectedOrderType, currentDate]);

  return (
    <div className="mt-3">
      <h2 className="text-lg font-semibold mb-3">
        When would you like to receive your order?
      </h2>

  
      <div className="flex  gap-3">
        <button
          className={`px-4 h-12 text-sm border w-full  rounded-md flex justify-center items-center gap-2 cursor-pointer ${
            oneTimeOrderOption?.orderType === "ORDERNOW"
              ? "border-primary text-primary"
              : " hover:border-first hover:text-first"
          }`}
          onClick={() => {
            handleOrderTypeChange("ORDERNOW");
          }}
        >
          <PackageCheck size={16} /> Order Now
        </button>

        <button
          className={`px-4 h-12 border text-sm w-full hover:border-first rounded-md flex justify-center items-center gap-2 cursor-pointer ${
            oneTimeOrderOption?.orderType === "SCHEDULED"
              ? "border-primary text-primary"
              : "hover:border-first hover:text-first"
          }`}
          onClick={() => {
            handleOrderTypeChange("SCHEDULED");
          }}
        >
          <CalendarDays size={16} /> Schedule for later
        </button>
      </div>

      <div className="flex gap-3 mt-3">
        {oneTimeOrderOption?.orderType === "SCHEDULED" && (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild className="w-full">
              <Button
                id="order-date"
                variant={"outline"}
                className={cn(
                  "h-12 bg-inherit justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
                disabled={(date) => {
                  const tomorrow = addDays(currentDate, 1);
                  const maxDate = addDays(currentDate, 28);
                  const isTodayDisabled =
                    oneTimeOrderOption?.orderType === "SCHEDULED" &&
                    isToday(date);
                  return (
                    isTodayDisabled || date < currentDate || date > maxDate
                  );
                }}
              />
            </PopoverContent>
          </Popover>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full" asChild>
              <div>
                <Select
                  onValueChange={(value) => handleSlotChange(value)}
                  value={
                    selectedDeliveryOption === "DELIVERY"
                      ? oneTimeOrderOption?.slotId || ""
                      : oneTimeOrderOption?.pickupTime || ""
                  }
                  disabled={
                    (oneTimeOrderOption?.orderType === "ORDERNOW" &&
                      selectedDeliveryOption === "PICKUP" &&
                      (getPickupTime().length === 0 || getCloseMessage())) ||
                    (oneTimeOrderOption?.orderType === "ORDERNOW" &&
                      selectedDeliveryOption === "DELIVERY" &&
                      allSlotsDisabled()) ||
                    (selectedDeliveryOption === "PICKUP" &&
                      isKitchenClosedForDay())
                  }
                >
                  <SelectTrigger className="w-full h-12">
                    <SelectValue
                      placeholder={
                        selectedDeliveryOption === "DELIVERY"
                          ? "Select Delivery Window"
                          : "Select Pickup Time"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {selectedDeliveryOption === "DELIVERY" &&
                      slots?.map((slot) => {
                        const isTodayDisabled =
                          selectedOrderType === "ORDERNOW" &&
                          isToday(currentDate);
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex flex-col w-full">
                                <SelectItem
                                  key={slot.id}
                                  value={slot.id}
                                  disabled={
                                    isTodayDisabled && disableTimeSlot(slot)
                                  }
                                >
                                  {convertToAmPm(slot.timeStart)} -{" "}
                                  {convertToAmPm(slot.timeEnd)}
                                </SelectItem>
                              </TooltipTrigger>
                              {disableTimeSlot(slot) && isTodayDisabled && (
                                <TooltipContent>
                                  <p>Window is currently unavailable.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}

                    {selectedDeliveryOption === "PICKUP" &&
                      getPickupTime().length > 0 &&
                      getPickupTime().map((time) => (
                        <TooltipProvider key={time}>
                          <Tooltip>
                            <TooltipTrigger className="flex flex-col w-full">
                              <SelectItem key={time} value={time}>
                                {convertToAmPm(time)}
                              </SelectItem>
                            </TooltipTrigger>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>

            {allSlotsDisabled() &&
              selectedOrderType === "ORDERNOW" &&
              selectedDeliveryOption === "DELIVERY" && (
                <TooltipContent>
                  <p>
                    All delivery windows are currently unavailable. Please
                    schedule your order for a later.
                  </p>
                </TooltipContent>
              )}

            {selectedDeliveryOption === "PICKUP" &&
              selectedOrderType === "ORDERNOW" &&
              getCloseMessage() && (
                <TooltipContent>
                  <p>
                    Our kitchen is currently closed. Please schedule your order
                    for later.
                  </p>
                </TooltipContent>
              )}
            {selectedDeliveryOption === "PICKUP" &&
              selectedOrderType === "ORDERNOW" &&
              getPickupTime().length === 0 && (
                <TooltipContent>
                  <p>
                    Our kitchen is currently closed. Please schedule your order
                    for later.
                  </p>
                </TooltipContent>
              )}

            {selectedDeliveryOption === "PICKUP" &&
              selectedOrderType === "SCHEDULED" &&
              isKitchenClosedForDay() && (
                <TooltipContent>
                  <p>
                    {isKitchenClosedForDay() && date && !isToday(date)
                      ? "Kitchen is closed on the selected day."
                      : "Our kitchen is currently closed. Please schedule your order for later."}
                  </p>
                </TooltipContent>
              )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default OneTimeOption;
