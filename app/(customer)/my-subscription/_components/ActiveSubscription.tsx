"use client";

import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuLabel,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fetcher } from "@/lib/helper";
import { useSetAdditionalDays } from "@/stores/useOptions";
import { TimeSlotsType } from "@/types/main";
import { Order } from "@prisma/client";
import { ChevronRight, Ellipsis } from "lucide-react";
import Link from "next/link";
import NoActiveSubscriptionPage from "./not-found/NoActiveSubscriptionPage";
import React from "react";
import useSWR from "swr";
import OrderOverview from "./OrderOverview";
import { toast } from "sonner";
import SubscriptionOrder from "./SubscriptionOrder";
import { estTimeZone } from "@/lib/helper/dateFunctions";
import { toZonedTime } from "date-fns-tz";

function ActiveSubscription({ timeSlots }: { timeSlots: TimeSlotsType[] }) {
  const { showAddAdditionalDay, setShowAddAdditionalDay } =
    useSetAdditionalDays();

  const { data: orderData, isLoading: orderLoading } = useSWR(
    `/api/customer/subscription?status=active`,
    fetcher
  );
  const orderDetails = orderData?.data as Order;

  const dataLoading = orderLoading || !orderData;

  if (dataLoading) return <Loading />;

  if (!orderData) return <NoActiveSubscriptionPage />;

  return (
    <div className="px-4 md:px-0">
      <div className="flex flex-col md:flex-row gap-3 sm:justify-between sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            My Subscription{" "}
            <span className="text-sm text-gray-700">
              {dataLoading ? "" : `#${orderDetails?.orderID}`}
            </span>
          </h1>

          <p className="text-foreground text-sm">
            Subscription Created At:{" "}
            {dataLoading ? (
              <></>
            ) : (
              toZonedTime(
                new Date(orderDetails?.createdAt || ""),
                estTimeZone
              ).toLocaleString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            )}
          </p>
        </div>
        <div className="flex gap-x-2">
          <Button
            onClick={() => setShowAddAdditionalDay(!showAddAdditionalDay)}
          >
            {showAddAdditionalDay
              ? "Cancel Adding Days"
              : "Add Additional Days"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Ellipsis size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => downloadInvoice(orderDetails?.invoiceId || "")}
              >
                Download Invoice
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/account/manage-payment-info`}>Subscription</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/my-subscription/upcoming`}>
                  Edit Upcoming Order
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start mt-4 gap-6">
        <div className="w-full md:w-4/6">
          <div className="border rounded-md bg-white ">
            {orderDetails?.planType === "SUBSCRIPTION" &&
              orderDetails?.firstDeliveryDate && (
                <SubscriptionOrder
                  firstDeliveryDate={orderDetails?.firstDeliveryDate}
                  orderId={orderDetails?.orderID}
                  isActive={true}
                  isUpcoming={false}
                  timeSlots={timeSlots || []}
                />
              )}
          </div>

          <div className="flex justify-end mt-3">
            <Button asChild>
              <Link href={`/my-subscription/upcoming`}>
                <>Next Week Order</> <ChevronRight size={18} />
              </Link>
            </Button>
          </div>
        </div>
        <div className="w-full md:w-2/6">
          <OrderOverview
            orderDetails={orderDetails}
            dataLoading={dataLoading}
            isUpcomingOrder={false}
          />
        </div>
      </div>
    </div>
  );
}

export default ActiveSubscription;
export const downloadInvoice = async (invoiceId: string) => {
  try {
    const response = await fetch(`/api/customer/orders/download-invoice`, {
      method: "POST",
      body: JSON.stringify({ invoiceId: invoiceId }),
    });

    const data = await response.json();
    if (data.success && data.data) {
      const url = data.data;
      const link = document.createElement("a");
      link.href = url;
      document.body.appendChild(link);
      link.click();
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    console.error("Error downloading the invoice:", error);
    toast.error("Error downloading the invoice");
  }
};
