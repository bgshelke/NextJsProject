import { Button } from "@/components/ui/button";
import { fetcher, getPricingLabel } from "@/lib/helper";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Item } from "@/types/main";

function UpdateItems({
  subOrderId,
  isFutureOrder,
  additionalItems,
  totalAmount,
  orderId,
}: {
  subOrderId: string;
  isFutureOrder: boolean;
  additionalItems: Item[];
  totalAmount: number;
  orderId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pleaseWait, setPleaseWait] = useState(false);
  const { data, isLoading } = useSWR("/api/subscription", fetcher);
  const nextBillingDate = data?.data?.nextBilling
    ? new Date(data?.data?.nextBilling)
    : null;

  const filteredItems = additionalItems.filter(
    (item: any) => item.quantity >= 0 
  );

  async function handleUpdateItems() {
    console.log("filteredItems", filteredItems);
    setPleaseWait(true);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/customer/subscription/actions/upcoming",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subOrderId,
            additionalItems: filteredItems,
            orderId,
            reqType: "ITEMS",
          }),
        }
      );
      const data = await response.json();
      setPleaseWait(false);
      if (data.success) {
        toast.success(data.message);
      
        router.push("/my-subscription/upcoming");
        router.refresh();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Error updating items");
      setPleaseWait(false);
    }
  }
  return (
    <div>
      <Button onClick={() => setIsOpen(true)} disabled={pleaseWait}>
        {pleaseWait ? "Please wait..." : "Update My Order"}
      </Button>
      {!isLoading && nextBillingDate && (
        <p className="text-sm font-semibold mt-4">
          Note: You will be charged {getPricingLabel(totalAmount)} for these items
          on{" "}
          {nextBillingDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
<br/>
<br/>
<br/>

      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
      
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Want to update your order?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be extra charged {getPricingLabel(totalAmount)} for these items
              on{" "}
              {nextBillingDate
                ? nextBillingDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateItems}>
              {pleaseWait ? "Please wait..." : "Update My Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UpdateItems;
