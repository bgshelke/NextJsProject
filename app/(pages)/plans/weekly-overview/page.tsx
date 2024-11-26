"use client";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFinalOrderStore } from "@/stores/plan/usePlanStore";
import { TimeSlotsType } from "@/types/main";
import PlanOverview from "../_components/PlanOverview";
import { useTimeSlots } from "@/contexts/TimeSlotsProvider";
import { convertToAmPm } from "@/lib/helper/dateFunctions";

function Page() {
  const finalOrder = useFinalOrderStore();
  const { subscriptionOrder } = finalOrder;
  const selectedDays = subscriptionOrder?.selectedDays || [];
  const { timeslots } = useTimeSlots();

  return (
    <div>
      <div className="text-center w-full space-y-1 md:space-y-3 md:max-w-lg mx-auto">
        <h1 className="text-3xl font-semibold">Weekly Overview</h1>
        <p className="text-gray-700 max-w-sm mx-auto">
          View your weekly plan overview here.
        </p>
      </div>

      <div className="flex flex-col md:flex-row  justify-center mt-12 items-stretch max-w-7xl mx-auto gap-6 ">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 sm:w-[80%]`}
        >
          {selectedDays?.map((day) => (
            <div
              key={day.date}
              className="bg-white rounded-md border w-full min-w-full p-4 h-fit"
            >
              <div className="flex items-center justify-between w-full">
                <h2 className="text-base font-semibold">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    weekday: "long",
                  })}
                </h2>

                <div className="text-sm text-gray-600">
                  {day?.slotId && (
                    <span>
                      {convertToAmPm(
                        timeslots.find(
                          (slot: TimeSlotsType) => slot.id === day.slotId
                        )?.timeStart || ""
                      ) || "N/A"}{" "}
                      -{" "}
                      {convertToAmPm(
                        timeslots.find((slot: any) => slot.id === day.slotId)
                          ?.timeEnd || ""
                      ) || "N/A"}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full  border-t mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {day?.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.price}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        $
                        {day?.items?.reduce(
                          (acc, item) =>
                            acc + (item.price || 0) * (item.quantity || 0),
                          0
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>

        <div className="sm:w-96  h-full bg-white">
          <PlanOverview />
        </div>
      </div>
    </div>
  );
}

export default Page;
