"use client";
import {
  useOrderType,
  usePickUpOption,
  usePlanItemsStore,
  usePlanStore,
  useSelectedSubDayDate,
} from "@/stores/plan/usePlanStore";
import React, { use, useCallback, useEffect } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { fetcher, getPricingLabel } from "@/lib/helper";
import { Item, MenuType } from "@/types/main";
import PreferenceIcon from "./PreferenceIcon";
import { Minus, Plus } from "lucide-react";
import { addressAvailability } from "@/stores/addressAvailability";
import { useItems } from "@/contexts/ItemContext";
import { useDwConfig } from "@/contexts/DwConfigProvider";
import { toZonedTime } from "date-fns-tz";
import { estTimeZone } from "@/lib/helper/dateFunctions";
import { useDayMenu } from "@/contexts/DayMenuProvider";
function ItemsOverviewTable() {

  const currentDate = toZonedTime(new Date(), estTimeZone);
  const { selectedDeliveryOption } = usePickUpOption();
  const { isAvailable } = addressAvailability();
  const { items: menuItem } = useItems();

  const { oneTimeOrderOption, planType } = useOrderType();
  const { dwConfig } = useDwConfig();
  const { items, setItems, editItems, setEditItems, editMode } =
    usePlanItemsStore();
  const { selectedSubDayDate, setSelectedSubDayDate } = useSelectedSubDayDate();

  let menuDate = currentDate.toISOString().split("T")[0];
  useEffect(() => {
  
    const onetimeScheduleDate =
      planType === "ONETIME"
        ? toZonedTime(oneTimeOrderOption?.orderDate || new Date(), estTimeZone)
            .toISOString()
            .split("T")[0]
        : selectedSubDayDate?.toISOString().split("T")[0];
    if (onetimeScheduleDate) {
      menuDate = onetimeScheduleDate;
    }
  }, [oneTimeOrderOption?.orderDate, selectedSubDayDate, planType]);

  const { menuData } = useDayMenu(menuDate);

  
  useEffect(() => {
    setSelectedSubDayDate(null);
  }, [planType]);

  useEffect(() => {
    const updatedItems = menuItem?.map((item: Item) => {
      if (item.mealPreference === "NON_VEG") {
        return { ...item, quantity: 0 };
      }
      return { ...item, quantity: 1 };
    });

    setItems(updatedItems);
  }, [menuItem]);

  const increaseQuantity = useCallback(
    (id: string) => {
      if (editMode) {
        const updatedItems = editItems?.map((item: Item) =>
          item.id === id && (item.quantity || 0) < (dwConfig?.maxQtyOfItem || 8)
            ? { ...item, quantity: (item.quantity || 0) + 1 }
            : item
        );
        setEditItems(updatedItems);
      } else if (!editMode) {
        const updatedItems = items?.map((item: Item) =>
          item.id === id && (item.quantity || 0) < (dwConfig?.maxQtyOfItem || 8)
            ? { ...item, quantity: (item.quantity || 0) + 1 }
            : item
        );
        setItems(updatedItems);
      }
    },
    [dwConfig, editMode, items, setEditItems, editItems, setItems]
  );

  const decreaseQuantity = useCallback(
    (id: string) => {
      if (editMode) {
        const updatedItems = editItems?.map((item: Item) =>
          item.id === id && (item.quantity || 0) > (dwConfig?.minQtyOfItem || 0)
            ? { ...item, quantity: (item.quantity || 0) - 1 }
            : item
        );
        setEditItems(updatedItems);
      } else if (!editMode) {
        const updatedItems = items?.map((item: Item) =>
          item.id === id && (item.quantity || 0) > (dwConfig?.minQtyOfItem || 0)
            ? { ...item, quantity: (item.quantity || 0) - 1 }
            : item
        );
        setItems(updatedItems);
      }
    },
    [dwConfig, editMode, items, setEditItems, editItems, setItems]
  );

  const disableItems = selectedDeliveryOption !== "PICKUP" && !isAvailable;

  return (
    <div
      className={`mt-6 ${disableItems ? "opacity-50 pointer-events-none" : ""}`}
    >
      {(items || editItems)?.length > 0 && (
        <div
          className="bg-gray-100 border border-gray-200 rounded-md  p-2 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  gap-3 sm:gap-4 "
          id="itemContainer"
        >
          {(editMode ? editItems : items)?.map((item: Item, index: number) => {
            const menuItem = menuData.find(
              (menuItem: MenuType) => menuItem.itemId === item.id
            );
            return (
              <div
                key={index}
                className="bg-white p-2 sm:p-4 rounded-md relative max-sm:flex max-sm:gap-x-2 max-w-full w-full"
              >
                {item.thumbnail && (
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-40 sm:h-40 rounded-md mx-auto overflow-hidden bg-gray-100 sm:bg-transparent relative z-10">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Image
                            src={
                              item.thumbnail
                                ? process.env.NEXT_PUBLIC_AWS_URL +
                                  item.thumbnail
                                : "/images/placeholder.jpg"
                            }
                            alt={item.itemName || "item"}
                            width={200}
                            className="w-full h-full object-contain p-2"
                            height={200}
                            priority={true}
                            draggable={false}
                          />
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Item Preview</DialogTitle>
                            <Image
                              src={
                                item.thumbnail
                                  ? process.env.NEXT_PUBLIC_AWS_URL +
                                    item.thumbnail
                                  : "/images/placeholder.jpg"
                              }
                              alt={item.itemName || "item"}
                              width={500}
                              className="w-full h-full object-contain p-2"
                              height={500}
                              priority={true}
                              draggable={false}
                            />
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <PreferenceIcon
                      preference={item.mealPreference || "VEG"}
                      className="absolute bottom-0 left-0  max-sm:w-4 max-sm:h-4 sm:top-2 sm:left-2 z-10"
                    />
                    <div className="w-16 h-6 sm:w-40 sm:h-14 rotate-x-50 rounded-md mx-auto   blur-xl overflow-hidden absolute bottom-2 right-0 left-0 opacity-50 z-0">
                      <Image
                        src={
                          item.thumbnail
                            ? process.env.NEXT_PUBLIC_AWS_URL + item.thumbnail
                            : "/images/placeholder.jpg"
                        }
                        alt={item.itemName || "item"}
                        width={200}
                        className="w-full h-full "
                        height={200}
                        priority={true}
                        draggable={false}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-[2px] absolute top-2 right-2">
                  {item.unitType && (
                    <p className="text-xs text-gray-500">
                      {item.unit}
                      {item.unitType}
                    </p>
                  )}
                  <div className="bg-primary/10 text-primary py-[2px] font-semibold rounded-full max-w-fit text-xs px-2">
                    {getPricingLabel(item.price || 0)}
                  </div>
                </div>

                <div className="sm:flex sm:items-end sm:justify-between mt-0">
                  <div>
                    <p className="text-sm font-medium mb-0 ">
                      {" "}
                      {menuItem?.name || "Menu not available"}
                    </p>
                    <p className="text-xs text-gray-500">{item.itemName}</p>
                  </div>

                  <div className="bg-gray-100 rounded-md inline-flex text-sm items-center justify-end gap-x-3 overflow-hidden max-sm:mt-2 max-sm:absolute max-sm:right-2 max-sm:bottom-2">
                    <button
                      className="py-2 px-1.5 text-primary hover:bg-primary transition hover:text-white border-r"
                      onClick={() => decreaseQuantity(item.id)}
                    >
                      <Minus size="14" />
                    </button>
                    {item.quantity || 0}
                    <button
                      className="py-2 px-1.5 hover:bg-primary text-primary transition hover:text-white border-l"
                      onClick={() => increaseQuantity(item.id)}
                    >
                      <Plus size="14" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(items || editItems)?.length === 0 && (
        <p className="text-sm text-gray-800 text-center w-full">
          No items found
        </p>
      )}
    </div>
  );
}

export default ItemsOverviewTable;
