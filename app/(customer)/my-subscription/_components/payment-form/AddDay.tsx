import { Button } from "@/components/ui/button";
import { getPricingLabel } from "@/lib/helper";
import { fetcher } from "@/lib/helper";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

function AddDay({
  selectedDate,
  orderId,
  items,
  slotId,
  totalAmount,
  isUpcoming,
}: {
  selectedDate: Date;
  orderId: string;
  items: { itemId: string; quantity: number }[];
  slotId: string;
  totalAmount: number;
  isUpcoming: boolean;
}) {
  const router = useRouter();

  const [pleaseWait, setPleaseWait] = useState(false);
  const { data } = useSWR("/api/subscription", fetcher);
  const nextBillingDate = data?.data?.nextBilling
    ? new Date(data?.data?.nextBilling)
    : null;

  const handleAddDay = async () => {
    try {
      setPleaseWait(true);
      if (!slotId) {
        toast.error("Please select a delivery window");
        setPleaseWait(false);
        return;
      }
      const response = await fetch(
        "/api/customer/subscription/actions/upcoming",
        {
          method: "POST",
          body: JSON.stringify({
            orderId,
            selectedDate,
            items,
            slotId,
            reqType: "ADD_DAY",
          }),
        }
      );
      const res = await response.json();
      setPleaseWait(false);
      if (res.success) {
        toast.success(res.message);
        router.push("/my-subscription/upcoming");
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.log(error);
      setPleaseWait(false);
    }
  };

  return (
    <div>
      {isUpcoming && (
        <>
          <Button onClick={handleAddDay} disabled={pleaseWait}>
            {pleaseWait
              ? "Please wait..."
              : `Yes, Add Order`}
          </Button>
          <p className="text-sm font-semibold mt-4">
            Note: Clicking the 'Yes' button will ensure these changes are applied
            to your future order as well.
          </p>
        </>
      )}
    </div>
  );
}

export default AddDay;
