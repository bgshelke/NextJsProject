"use client";
import {
  convertToAmPm,
  getSusbcriptionWeekDates,
  getWeekDates,

} from "@/lib/helper/dateFunctions";
import { toZonedTime } from "date-fns-tz";
import { Item, TimeSlotsType } from "@/types/main";
import React, { useEffect, useRef, useState } from "react";
import {
  useDeliveryDayStore,
  useOrderType,
  usePlanItemsStore,
  useSelectedSubDayDate,
  useSubscriptionDaysStore,
} from "@/stores/plan/usePlanStore";
import { format, parse } from "date-fns";
import { CircleMinus } from "lucide-react";
import { Clock } from "lucide-react";
import { useDwConfig } from "@/contexts/DwConfigProvider";

export interface SelectedSubscriptionDaysType {
  items: Item[];
  slotId: string | null;
  deliveryDate: string | null;
}

function SelectSubscriptionDays({ slots }: { slots: TimeSlotsType[] }) {
  const { dwConfig } = useDwConfig();

  const [errorMessage, setErrorMessage] = useState<{
    type: "error" | "success";
    message: string;
  }>({
    type: "error",
    message: "",
  });
  const { items, setEditItems, editItems, setItems, setEditMode, editMode } =
    usePlanItemsStore();
  const { selectedSubDayDate, setSelectedSubDayDate } = useSelectedSubDayDate();
  const { selectedDeliveryDate } = useDeliveryDayStore();
  const [selectedSubDay, setSelectedSubDay] =
    useState<SelectedSubscriptionDaysType>({
      items: [],
      deliveryDate: null,
      slotId: null,
    });

  const [selectedTimeSlot, setSelectedTimeSlot] =
    useState<TimeSlotsType | null>(null);
  const { planType } = useOrderType();
  const {
    selectedSubscriptionDays,
    addSubscriptionDay,
    updateSubscriptionDay,
    removeSubscriptionDay,
  } = useSubscriptionDaysStore();

  const getSubscriptionDays = (): Date[] => {
    if (!selectedDeliveryDate) return [];
    const parsedDate = parse(selectedDeliveryDate, "yyyy-MM-dd", new Date());
    const weekDays = getWeekDates(parsedDate);
    return weekDays;
  };

  if (
    !selectedDeliveryDate ||
    !getSubscriptionDays() ||
    planType !== "SUBSCRIPTION"
  )
    return null;

  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target as Node) &&
        !document
          .getElementById("itemContainer")
          ?.contains(event.target as Node)
      ) {
        setErrorMessage({
          type: "error",
          message: "",
        });

        setSelectedSubDayDate(null);
        const defaultItems = items.map((item: Item) => {
          if (item.mealPreference === "NON_VEG") {
            return { ...item, quantity: 0 };
          }
          return { ...item, quantity: 1 };
        });
        setItems(defaultItems);
        setSelectedTimeSlot(null);
        setSelectedSubDay({
          items: [],
          deliveryDate: null,
          slotId: null,
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    setSelectedSubDayDate,
    setItems,
    items,
    selectedSubDayDate,
    selectedSubscriptionDays,
  ]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage({
          type: "error",
          message: "",
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleSlotClick = (slot: TimeSlotsType) => {
    setSelectedSubDay((prev) => ({
      ...prev,
      slotId: slot.id,
    }));
    setErrorMessage({
      type: "error",
      message: "",
    });
  };

  const handleDelete = (date: string) => {
    removeSubscriptionDay(date);
  };

  const handleDayClick = (date: Date) => {
    const adjustedDate = new Date(date);
    adjustedDate.setHours(0, 0, 0, 0);

    const selectedDay = selectedSubscriptionDays.find(
      (day) => day.date === adjustedDate.toISOString()
    );

    if (selectedDay) {
      setEditItems(selectedDay.items);
      setEditMode(true);
      setSelectedSubDay((prev) => ({
        items: selectedDay.items,
        deliveryDate: adjustedDate.toISOString(),
        slotId: selectedDay.slotId,
      }));
    } else {
      setEditMode(false);
      setEditItems([]);
      const updatedItems = items.map((item: Item) => {
        if (item.mealPreference === "NON_VEG") {
          return { ...item, quantity: 0 };
        }
        return { ...item, quantity: 1 };
      });
      setItems(updatedItems);
    }

    const isDuplicate = selectedSubscriptionDays.some(
      (day) => day.date === adjustedDate.toISOString()
    );

    if (!isDuplicate) {
      setSelectedSubDay((prev) => ({
        ...prev,
        deliveryDate: adjustedDate.toISOString(),
      }));
    }

    setSelectedSubDayDate(adjustedDate);
  };

  const handleSave = () => {
    if (!selectedSubDay.slotId) {
      setErrorMessage({
        type: "error",
        message: "Please select a delivery window before saving.",
      });

      return;
    }

    if (selectedSubDay.deliveryDate && selectedSubDay.slotId) {
      const selectedDay = selectedSubscriptionDays.find(
        (day) => day.date === selectedSubDay.deliveryDate
      );
      const existingIndex = selectedSubscriptionDays.findIndex(
        (day) => day.date === selectedSubDay.deliveryDate
      );

      if (existingIndex !== -1) {
        if (selectedDay) {
          setEditItems(selectedDay.items);
          setEditMode(true);

          const myEditItems = editItems;

          const hasItems = editItems.some((item) => (item.quantity || 0) > 0);
          if (!hasItems) {
            setErrorMessage({
              type: "error",
              message: "Please add at least one item before saving.",
            });
            return;
          }

          setErrorMessage({
            type: "error",
            message: "",
          });
          updateSubscriptionDay({
            items: myEditItems,
            date: selectedSubDay.deliveryDate,
            slotId: selectedDay.slotId,
          });
          setEditItems(myEditItems);

          setErrorMessage({
            type: "success",
            message: `${format(
              new Date(selectedSubDay.deliveryDate),
              "EEEE"
            )} Updated!`,
          });
          return;
        }
        setErrorMessage({
          type: "error",
          message: "Please select day to update.",
        });
      } else {
        const itemsToAdd = items;

        const hasItems = itemsToAdd.some((item) => (item.quantity || 0) > 0);
        if (!hasItems) {
          setErrorMessage({
            type: "error",
            message: "Please add at least one item before saving.",
          });

          return;
        }
        setErrorMessage({
          type: "error",
          message: "",
        });

        addSubscriptionDay({
          items: itemsToAdd,
          date: selectedSubDay.deliveryDate,
          slotId: selectedSubDay.slotId,
        });

        setErrorMessage({
          type: "success",
          message: `Selections saved for ${format(
            new Date(selectedSubDay.deliveryDate),
            "EEEE"
          )}`,
        });
      }
    }
    setEditMode(true);
    setEditItems(items);
  };

  return (
    <div ref={componentRef}>
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-lg mt-4 font-semibold mb-4">
          Select / Customize Days
        </h2>
        {errorMessage.message !== "" && (
          <div
            className={`text-xs md:text-sm ${
              errorMessage.type === "success" ? "bg-primary" : "bg-destructive"
            } font-medium text-white p-1 rounded-full px-3`}
          >
            {errorMessage.message}
          </div>
        )}
      </div>

      <div className="flex max-sm:flex-wrap gap-1 sm:gap-3 text-center mb-4">
        {getSubscriptionDays().map((date) => {
          const selected = selectedSubscriptionDays.find(
            (day) => day.date === date.toISOString()
          );
          return (
            <button
              key={date.toISOString()}
              onClick={() => {
                handleDayClick(date);
                setSelectedSubDayDate(date);
              }}
              className={`bg-gray-100 py-2 max-sm:w-fit text-gray-500 rounded-full px-4 w-full text-sm hover:bg-first hover:text-white transition cursor-pointer border border-transparent
            ${
              selectedSubDayDate?.toISOString() === date.toISOString()
                ? "!border-first !text-first !bg-first/20"
                : ""
            }
            ${selected ? "bg-primary text-white" : ""}`}
            >
              {date.toLocaleDateString("en-US", {
                weekday: "short",
              })}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-center mb-4">
        {slots.map((slot) => {
          const selected = selectedSubscriptionDays.find(
            (day) => day.date === selectedSubDay.deliveryDate
          );
          const isSelected = selectedSubDay.slotId === slot.id;
          const isDaySelected = !!selectedSubDay.deliveryDate;

          return (
            <button
              key={slot.id}
              onClick={() => {
                if (isDaySelected) {
                  handleSlotClick(slot);
                  setSelectedTimeSlot(slot);
                }
              }}
              disabled={!isDaySelected}
              className={`border flex items-center justify-center gap-2 py-3 rounded-md px-4 w-full text-sm ${
                selected && isSelected
                  ? "bg-primary text-white"
                  : "hover:border-first "
              }
            ${
              selectedTimeSlot && !selected && selectedTimeSlot.id === slot.id
                ? "bg-primary text-white hover:border-transparent"
                : ""
            }
            ${!isDaySelected ? "opacity-50 cursor-not-allowed" : ""}
            `}
            >
              <Clock size={16} /> {convertToAmPm(slot.timeStart)} -{" "}
              {convertToAmPm(slot.timeEnd)}
            </button>
          );
        })}
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={!selectedSubDay.deliveryDate}
            className="p-3 bg-primary text-sm text-white text-nowrap rounded-md hover:bg-first max-sm:w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editMode ? "Update" : "Save"}
          </button>
          {selectedSubscriptionDays.find(
            (day) => day.date === selectedSubDay.deliveryDate
          ) && (
            <button
              onClick={() => handleDelete(selectedSubDay.deliveryDate || "")}
              className="p-3 px-4 bg-destructive text-sm text-white rounded-md hover:bg-destructive/80"
            >
              <CircleMinus size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SelectSubscriptionDays;
