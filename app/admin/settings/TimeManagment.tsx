"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  OpenHoursInput,
  openHoursSchema,
  TimeSlotInput,
  timeSlotSchema,
} from "@/types/zod/AdminSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import { TimeSlots } from "@prisma/client";
import { getWeekDates } from "@/lib/helper/dateFunctions";
import { fetcher } from "@/lib/helper";

function TimeManagment() {
  const [isDeletingTimeSlot, setIsDeletingTimeSlot] = useState<string | null>(null);
  const [submitTimeSlot, setSubmitTimeSlot] = useState<boolean>(false);
  const {
    data: timeSlots,
    mutate: mutateTimeSlots,
    isLoading: isLoadingTimeSlots,
  } = useSWR("/api/dw?get=timeslots", fetcher, {
    revalidateOnFocus: false,
  });

  const timeslotsData = timeSlots?.data;

  const openHoursForm = useForm<OpenHoursInput>({
    resolver: zodResolver(openHoursSchema),
  });

  const weekDates = getWeekDates();

  const slotForm = useForm<TimeSlotInput>({
    resolver: zodResolver(timeSlotSchema),
  });

  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<{
    [key: string]: { isOpen: boolean; openTime: string; closeTime: string };
  }>({});

  const {
    data,
    isLoading,
    mutate: mutateOpenHours,
  } = useSWR(
    process.env.NEXT_PUBLIC_URL +
      "/api/admin/settings/time-managment/open-hours",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const handleEditClick = (dateKey: string) => {
    const getDayKey = new Date(dateKey).toLocaleString("en-US", {
      weekday: "long",
    });
    setEditingDay((prevDay) => {
      if (prevDay === dateKey) {
        return null;
      } else {
        const openHourData = isOpen[getDayKey] || {
          openTime: "",
          closeTime: "",
        };
        openHoursForm.setValue("openTime", openHourData.openTime);
        openHoursForm.setValue("closeTime", openHourData.closeTime);
        return dateKey;
      }
    });
  };

  async function onOpenHoursSubmit(values: OpenHoursInput) {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL +
          "/api/admin/settings/time-managment/open-hours",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...values, day: editingDay, isClosed: false }),
        }
      );
      const result = await response.json();
      if (result.success) {
        setEditingDay(null);
        toast.success("Open hours updated successfully");
        mutateOpenHours();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.log(error);
    }
  }

  const handleSwitchChange = async (checked: boolean, dateKey: string) => {
    setIsOpen((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], isOpen: checked },
    }));
    if (!checked) setEditingDay(null);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL +
          "/api/admin/settings/time-managment/open-hours",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ day: dateKey, isClosed: !checked }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success("Open hours updated successfully");

        mutateOpenHours();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.log(error);
    }
  };

  const openHoursLoading = isLoading && !data;
  const openHoursData = !isLoading && data?.success === true && data?.data;
  useEffect(() => {
    if (openHoursData) {
      const openHours = openHoursData.reduce((acc: any, day: any) => {
        acc[day.day] = {
          isOpen: !day.isClosed,
          openTime: day.openTime,
          closeTime: day.closeTime,
        };
        return acc;
      }, {});
      setIsOpen(openHours);
    }
  }, [openHoursData]);

  const onSubmitSlot = async (values: TimeSlotInput) => {
    try {
      setSubmitTimeSlot(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/admin/settings/time-managment",
        {
          method: "POST",
          body: JSON.stringify(values),
        }
      );
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        slotForm.reset();
        setSubmitTimeSlot(false);
        mutateTimeSlots();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again.");
      setSubmitTimeSlot(false);
    }
  };

  const deleteTimeSlot = async (id: string) => {
    setIsDeletingTimeSlot(id); // Set the deleting state
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/admin/settings/time-managment",
        {
          method: "DELETE",
          body: JSON.stringify({ id }),
        }
      );
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        mutateTimeSlots();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.log(error);
    } finally {
      setIsDeletingTimeSlot(null); 
    }
  };


  return (
    <>
      <div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Time Slot Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Here you can manage the time of kitchen and orders.
          </p>
        </div>

       <div className="mt-4 flex justify-between ">
       <Form {...slotForm}>
          <form
            onSubmit={slotForm.handleSubmit(onSubmitSlot)}
            className="space-y-4 bg-white border rounded-md p-6 my-4 w-1/3 "
          >
            <div className="flex items-center gap-2 w-full">
              <FormField
                control={slotForm.control}
                name="timeStart"
                
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Time Start</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="Start Time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={slotForm.control}
                name="timeEnd"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Time End</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="End Time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit">{submitTimeSlot ? "Adding..." : "Add Time Slot"}</Button>
          </form>
        </Form>

        <div className="flex flex-wrap  gap-4 mt-5 w-full px-6 h-fit">
              {isLoadingTimeSlots && (
                <>
                  <Skeleton className="w-full h-16" />
                  <Skeleton className="w-full h-16" />
                  <Skeleton className="w-full h-16" />
                  <Skeleton className="w-full h-16" />
                </>
              ) }
          {timeslotsData?.map((timeslot: TimeSlots) => (
            <div key={timeslot.id} className="border-2 rounded-md bg-white dark:bg-primary-foreground p-3 flex justify-between items-center gap-8">
              <p>{timeslot.timeStart} - {timeslot.timeEnd}</p>
              <Button
                variant="destructive"
                onClick={() => deleteTimeSlot(timeslot.id)}
                disabled={isDeletingTimeSlot === timeslot.id} // Disable button if deleting
              >
                {isDeletingTimeSlot === timeslot.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          ))}
        </div>
       </div>
      </div>

      <div className="mt-2">
        <h2 className="text-xl font-semibold tracking-tight">Open Hours</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here you can manage the time of kitchen and orders.
        </p>
      </div>

      {openHoursLoading && (
        <>
          <div className="grid md:grid-cols-3 gap-4 mt-5">
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-40" />
          </div>
        </>
      )}
      {openHoursData && (
        <div className="grid md:grid-cols-3 gap-4 mt-5">
          {weekDates.map((date: Date) => {
            const dateKey = new Date(date).toISOString().split("T")[0];
            const dayKey = new Date(date).toLocaleString("en-US", {
              weekday: "long",
            });
            const isEditing = editingDay === dateKey;
            const openHourData = isOpen[dayKey] || {
              isOpen: false,
              openTime: "",
              closeTime: "",
            };
            return (
              <div
                key={dateKey}
                className="border rounded-md bg-white dark:bg-primary-foreground"
              >
                <div className="p-3 border-b flex justify-between items-center w-full">
                  <p>
                    {new Date(date).toLocaleString("en-US", {
                      weekday: "long",
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${
                        openHourData.isOpen ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {openHourData.isOpen ? "Open" : "Closed"}
                    </p>
                    <Switch
                      checked={openHourData.isOpen}
                      onCheckedChange={(checked) =>
                        handleSwitchChange(checked, dateKey)
                      }
                    />
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm text-muted-foreground">
                    Date:{" "}
                    {new Date(date).toLocaleString("en-US", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {openHourData.isOpen && (
                    <>
                      {!isEditing ? (
                        <div className="mt-2">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between ">
                              <Label>Open Time</Label>
                              <Input
                                type="time"
                                className="w-fit"
                                placeholder="10:00"
                                disabled
                                value={openHourData.openTime}
                              />
                            </div>
                            <div className="flex items-center justify-between ">
                              <Label>Close Time</Label>
                              <Input
                                type="time"
                                className="w-fit"
                                placeholder="16:00"
                                disabled
                                value={openHourData.closeTime}
                              />
                            </div>
                            <Button
                              onClick={() => handleEditClick(dateKey)}
                              className="mt-2"
                            >
                              Edit Time
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Form {...openHoursForm}>
                          <form
                            onSubmit={openHoursForm.handleSubmit(
                              onOpenHoursSubmit
                            )}
                            className="space-y-4 mt-2"
                          >
                            <FormField
                              control={openHoursForm.control}
                              name="openTime"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between ">
                                    <FormLabel>Open Time</FormLabel>
                                    <FormControl className="w-fit ">
                                      <Input
                                        type="time"
                                        placeholder="10:00"
                                        {...field}
                                        defaultValue={openHourData.openTime}
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={openHoursForm.control}
                              name="closeTime"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between ">
                                    <FormLabel>Close Time</FormLabel>
                                    <FormControl className="w-fit ">
                                      <Input
                                        type="time"
                                        placeholder="16:00"
                                        {...field}
                                        defaultValue={openHourData.closeTime}
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2">
                              <Button type="submit">Update</Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingDay(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </Form>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default TimeManagment;
