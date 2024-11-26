"use client";
import { Button } from "@/components/ui/button";
import { OrderDetails, TimeSlotsType } from "@/types/main";
import React from "react";
import useSWR from "swr";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { ChevronLeft, Ellipsis, Plus } from "lucide-react";
import SubscriptionOrder from "./SubscriptionOrder";
import OrderOverview from "./OrderOverview";
import NoActiveSubscriptionPage from "./NoActiveSubscriptionPage";
import { useSetAdditionalDays } from "@/stores/useOptions";
import { fetcher } from "@/lib/helper";

function UpcomingSubscription({ timeSlots }: { timeSlots: TimeSlotsType[] }) {
  const { showAddAdditionalDay, setShowAddAdditionalDay } =
    useSetAdditionalDays();
  const { data: orderData, isLoading: orderLoading } = useSWR(
    `/api/customer/subscription?status=upcoming`,
    fetcher
  );

  const { data } = useSWR("/api/subscription", fetcher);
  const cancelDate = data?.data?.cancel_at
    ? new Date(data?.data?.cancel_at)
    : null;

  const orderDetails = orderData?.data as OrderDetails;
 
  const dataLoading = orderLoading || !orderData;

  if(!orderDetails) return <NoActiveSubscriptionPage />;

  if (!orderData) return <NoActiveSubscriptionPage />;

  if (cancelDate) {
    return (
      <div className="p-2 ">
        <div className="mx-auto py-12 text-center">
          <h1 className="text-[1.5rem] font-semibold mb-1">
            Your Subscription is scheduled to be cancelled
          </h1>
          <p className="text-sm mb-2">
            If you want to continue your subscription, please cancel the
            cancellation.
          </p>
          <Button asChild>
            <Link href={`/account/subscription`}>Stop Cancellation</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-0">
      <div className="flex flex-col md:flex-row gap-3 sm:justify-between sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            Upcoming Week Order{" "}
            <span className="text-sm text-gray-700">
              {dataLoading ? "" : `#${orderDetails?.orderID}`}
            </span>
          </h1>
        </div>

        <div className="flex gap-x-2">
          <Button
            onClick={() => setShowAddAdditionalDay(!showAddAdditionalDay)}
          >
            <Plus size={18} />
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
              <DropdownMenuItem asChild>
                <Link href={`/account/manage-payment-info`}>Subscription</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start mt-4 gap-6">
        <div className="md:w-4/6">
          <div className="border rounded-md bg-white ">
            {orderDetails?.planType === "SUBSCRIPTION" &&
              orderDetails?.firstDeliveryDate && (
                <>
                  <SubscriptionOrder
                    firstDeliveryDate={new Date(orderDetails.firstDeliveryDate)}
                    orderId={orderDetails?.orderID}
                    isActive={true}
                    isUpcoming={true}
                    timeSlots={timeSlots || []}
                  />
                </>
              )}
          </div>

          <div className="flex justify-start mt-1">
            <Link href={`/my-subscription/`}>
              <Button className="mt-3 ml-auto">
                <>
                  <ChevronLeft size={18} /> Go Back
                </>
              </Button>
            </Link>
          </div>
        </div>
        <div className="md:w-2/6">
          <OrderOverview
            orderDetails={orderDetails}
            dataLoading={dataLoading}
            isUpcomingOrder={true}
          />
        </div>
      </div>
    </div>
  );
}

export default UpcomingSubscription;
