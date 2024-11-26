

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";
import useAdditionalDays from "@/stores/additionalDayStore";

function AddAdditionalDay({
  orderID,
  isUpcoming,
  availableDates,
}: {
  firstDeliveryDate: Date;
  orderID: string;
  isUpcoming: boolean;
  availableDates: Date[];
}) {
  const router = useRouter();
  const { setDate, setOrderId, setIsUpcoming } = useAdditionalDays();

  if (!orderID) return null;

  const createOrderForDate = (date: Date) => {
    setDate(date);
    setIsUpcoming(isUpcoming);
    router.push("/my-subscription/create-order");
  };

  return (
    <div>
      {availableDates?.length === 0 ? (
        <div className="text-center p-4">No days available to create order</div>
      ) : (
        availableDates?.map((date) => (
          <div
            key={new Date(date).toISOString()}
            className="bg-white border p-4 rounded-md flex justify-between items-center"
          >
            <span className="font-semibold">
              {new Date(date).toLocaleDateString("en-US", {
                weekday: "long",
                day: "2-digit",
                month: "short",
              })}
            </span>
            <div className="flex gap-1">
              <Button
                className="text-xs py-2 px-2 h-fit"
                onClick={() => {
                  createOrderForDate(new Date(date));
                  setOrderId(orderID);
                }}
              >
                <Plus className="w-3 h-3 inline mr-1" /> Create Order
              </Button>
            </div>
          </div>
        ))
      )}
      <Toaster />
    </div>
  );
}

export default AddAdditionalDay;
