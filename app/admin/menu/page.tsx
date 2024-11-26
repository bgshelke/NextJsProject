"use client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Item, MenuData, MenuItemType } from "@/types/main";
import {
  OurMenuEditSchema,
  OurMenuInputSchema,
  OurMenuSchema,
} from "@/types/zod/AdminSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";


import { useDebounceValue } from "usehooks-ts";
import { useItems } from "@/contexts/ItemContext";
import { useDwConfig } from "@/contexts/DwConfigProvider";
import {
  formatDateRange,
  getDaysInWeek,
  getWeeklyRanges,
} from "@/lib/helper/dateFunctions";
import { fetcher } from "@/lib/helper";
import { format, parse, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { utcTimeZone } from "@/lib/helper/dateFunctions";




function Page() {
  const { items } = useItems();
  const { dwConfig } = useDwConfig();
  const weeklyRanges = useMemo(() => getWeeklyRanges(5), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [debouncedInput] = useDebounceValue(inputValue, 500);
  const [suggestions, setSuggestions] = useState<
    { itemId: string; name: string }[]
  >([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<{
    start: Date;
    end: Date;
  } | null>(weeklyRanges[0]);

  const [isEditMode, setIsEditMode] = useState(false);

  const { data: menuData, mutate } = useSWR(
    `/api/menu/weekly?dateRange=weekly&startDate=${
      selectedWeek?.start.toISOString().split("T")[0]
    }&endDate=${selectedWeek?.end.toISOString().split("T")[0]}`,
    fetcher
  );
 
  const fetchSuggestions = async (input: string) => {
    const response = await fetch(
      process.env.NEXT_PUBLIC_URL + "/api/admin/menu/subitem?query=" + input
    );
    const data = await response.json();

    if (data.success) {

      setSuggestions(data.data);
    } else {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    if (debouncedInput && !selectedSuggestion) {
      fetchSuggestions(debouncedInput);
    }
  }, [debouncedInput, selectedSuggestion]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<OurMenuInputSchema>({
    resolver: zodResolver(isEditMode ? OurMenuEditSchema : OurMenuSchema),
  });

  async function onSubmit(values: OurMenuInputSchema) {
    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("items", JSON.stringify(values.items));
      formData.append("description", values.description ?? "");

      if (values.thumbnail && values.thumbnail.length > 0) {
        formData.append("thumbnail", values.thumbnail[0]);
      }
      formData.append("date", values.date || "");

      const response = await fetch("/api/admin/menu", {
        method: isEditMode ? "PUT" : "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setIsOpen(false);
        mutate();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again later");
      console.log("Error while creating menu", error);
    } finally {
      setIsSubmitting(false);
      setIsEditMode(false);
    }
  }
  const handleCreateMenu = (
    day: Date,
    menu?: MenuItemType,
    isEdit?: boolean
  ) => {
    setSelectedDay(day);
    setIsOpen(true);
    reset({
      ...menuData,
      date: day.toISOString().split("T")[0],
    });

    if (isEdit && menu) {
      setIsEditMode(true);
      setSelectedSuggestion(true);
      const updatedItems = items.map((item) => {
        
        const menuItem = menu.menuItems.find((i) => i.itemId === item.id);

        if (menuItem) {
          return {
            ...item,
            itemName: menuItem.name,
          };
        }
        return item;
      });

      const date = toZonedTime(new Date(menu.date), utcTimeZone).toISOString().split("T")[0];
    
      reset({
        items: updatedItems,
        description: menu.description || "",
        thumbnail: undefined,
        date: date,
      });
    }else{
      setIsEditMode(false);
    }
  };


  return (
    <ScrollArea className="h-full p-6">
      <h1 className="text-2xl font-bold text-center mb-4">Menu Managment</h1>

   
      <div className="flex justify-center items-center gap-2">
        {weeklyRanges.map((range) => (
          <button
            key={range.start.toString()}
            onClick={() => setSelectedWeek(range)}
            className={`text-sm transition font-medium border  ${
              selectedWeek &&
              selectedWeek.start.toDateString() === range.start.toDateString()
                ? "bg-primary text-white border-transparent"
                : "border-gray-300"
            } rounded-full px-6 py-2  hover:bg-primary/70`}
          >
            {formatDateRange(range.start, range.end)}
          </button>
        ))}
      </div>

      {selectedWeek && (
        <div className="mt-10">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">

            {getDaysInWeek(selectedWeek).map((date: Date, index: number) => {
              const menu = menuData?.data.find(
                (menuItem: MenuData) => menuItem.date.split("T")[0] === date.toISOString().split("T")[0]
              );

              return (
                <div key={index} className="border">
                  {menu && (
                    <div className="overflow-hidden rounded-md h-40 w-full ">
                      <Image
                        src={
                          (menu?.thumbnail &&
                            process.env.NEXT_PUBLIC_AWS_URL +
                              menu?.thumbnail) ||
                          "/images/placeholder.jpg"
                        }
                        alt="menu"
                        className="object-cover w-full h-full"
                        width={300}
                        height={300}
                      />
                    </div>
                  )}

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-md flex justify-between items-center gap-2 text-sm">
                    {format(date, "EEEE, MMMM do")}

                    {menu ? (
                      <Button
                        onClick={() => handleCreateMenu(date, menu, true)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Updating Menu..." : "Edit Menu"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleCreateMenu(date,undefined, false)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Creating Menu..." : "Create Menu"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full max-w-4xl">
          <DialogDescription>
            <h1 className="text-lg font-semibold text-center mb-5">
              {isEditMode ? "Edit Menu for " : "Create Menu for "}
              {selectedDay && format(selectedDay, "EEEE, MMMM do")}
            </h1>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2 ">
                {items.map((item: Item, index: number) => (
                  <div key={item.id} className="mt-2 relative">
                    <label>{item.itemName}:</label>
                    <br />
                    <input
                      placeholder={item.itemName || "Menu Item ID"}
                      value={item.id}
                      readOnly
                      type="hidden"
                      className="rounded-md p-3 w-full text-black dark:text-white !border-2"
                      {...register(`items.${index}.itemId`)}
                    />
                    <input
                      placeholder={item.itemName || "Menu Item ID"}
                      className="rounded-md p-3 w-full text-black dark:text-white !border-2"
                      {...register(`items.${index}.itemName`)}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setSelectedSuggestion(false);
                      }}
                    />
                    {inputValue && !selectedSuggestion && (
                      <div className="flex flex-col bg-white border shadow-sm absolute w-full">
                        {suggestions
                          .filter(
                            (suggestion: { itemId: string; name: string }) =>
                              item.id == suggestion.itemId
                          )
                          .map(
                            (suggestion: { itemId: string; name: string }) => (
                              <button
                                key={suggestion.itemId}
                                className="p-2 hover:bg-gray-200 cursor-pointer w-full"
                                onClick={() => {
                                  setValue(
                                    `items.${index}.itemName`,
                                    suggestion.name
                                  );
                                  setSelectedSuggestion(true);
                                }}
                              >
                                {suggestion.name}
                              </button>
                            )
                          )}
                      </div>
                    )}
                  </div>
                ))}
                {errors.items && (
                  <p className="text-red-500">{errors.items?.message}</p>
                )}
              </div>

              <div className="mt-3">
                <label>Thumbnail:</label>
                <br />
                <input
                  type="file"
                  className="rounded-md p-3 w-full  text-black dark:text-white !border-2"
                  accept="image/jpg, image/jpeg"
                  multiple={false}
                  required={!isEditMode}
                  placeholder="Thumbnail"
                  {...register("thumbnail")}
                />
                {errors?.thumbnail && (
                  <p className="text-red-500">
                    {errors?.thumbnail?.message?.toString() || "Error"}
                  </p>
                )}
              </div>

              <Collapsible className="mt-3">
                <CollapsibleTrigger className="font-semibold">
                  Description (Optional):
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div>
                    <br />
                    <textarea
                      className="rounded-md p-3 w-full  text-black dark:text-white !border-2"
                      placeholder="Description"
                      {...register("description")}
                    />
                    {errors.description && (
                      <p className="text-red-500">
                        {errors.description?.message}
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div>
                <input
                  type="hidden"
                  className="rounded-md p-3 w-full text-black dark:text-white !border-2"
                  placeholder="Date"
                  readOnly
                  {...register("date")}
                />
                {errors.date && (
                  <p className="text-red-500">{errors.date?.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !selectedDay}
                className="p-2 px-4 mt-3 bg-primary text-white rounded-md hover:bg-primary/60"
              >
                {isSubmitting
                  ? isEditMode
                    ? "Updating Menu..."
                    : "Creating Menu..."
                  : isEditMode
                  ? "Update Menu"
                  : "Create Menu"}
              </button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

export default Page;
