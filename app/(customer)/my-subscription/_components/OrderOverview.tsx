"use client";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetails, ShippingInfo } from "@/types/main";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CircleHelp, FormInput } from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/helper";
import { formatDate } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { utcTimeZone } from "@/lib/helper/dateFunctions";
const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function OrderOverview({
  orderDetails,
  dataLoading,
  isUpcomingOrder,
}: {
  orderDetails: OrderDetails;
  dataLoading: boolean;
  isUpcomingOrder: boolean;
}) {
  const isDayMatched = (day: string) => {
    return orderDetails?.subscriptionDays?.some((matchedDay: string) =>
      matchedDay.startsWith(day)
    );
  };

  const { data, isLoading } = useSWR(
    !isUpcomingOrder ? process.env.NEXT_PUBLIC_URL + "/api/subscription" : null,
    fetcher
  );
  const nextBillingDate = data?.data?.nextBilling
    ? new Date(data?.data?.nextBilling)
    : null;

  const shippingInfo = orderDetails?.shippingInfo as unknown as ShippingInfo;

  const firstDeliveryDate = toZonedTime(
    new Date(orderDetails.firstDeliveryDate || new Date()),
    utcTimeZone
  );

 
  const startDayIndex = firstDeliveryDate.getDay();
  const orderedWeekDays = [
    ...weekDays.slice(startDayIndex),
    ...weekDays.slice(0, startDayIndex),
  ];

  return (
    <>
      <div className="bg-white rounded-md p-6 border">
        <div className="">
          <h5 className="font-semibold">Order Detail</h5>
        
          <Table className="text-sm mt-3 font-medium">
            <TableBody>
              <TableRow className="border-none">
                <TableCell className="font-medium px-0">
                  Susbcribed Days
                </TableCell>
                <TableCell className="text-right px-0">
                  {dataLoading ? (
                    <Skeleton className="w-40 h-[20px] rounded-full" />
                  ) : (
                    orderDetails?.subscriptionDays?.length
                  )}
                </TableCell>
              </TableRow>

              <TableRow className="border-none">
                <TableCell className="font-medium px-0">
                  Total Servings
                </TableCell>
                <TableCell className="text-right px-0">
                  {dataLoading ? (
                    <Skeleton className="w-40 h-[20px] rounded-full" />
                  ) : (
                    (orderDetails?.totalServings || 0).toFixed(0)
                  )}
                </TableCell>
              </TableRow>

              <TableRow className="border-none">
                <TableCell className="font-medium px-0">
                  Cost Per Serving
                </TableCell>
                <TableCell className="text-right px-0">
                  {dataLoading ? (
                    <Skeleton className="w-40 h-[20px] rounded-full" />
                  ) : (
                    "$" + (orderDetails?.costPerServing || 0).toFixed(2)
                  )}
                </TableCell>
              </TableRow>
            
              <TableRow className="border-none">
                <TableCell className="font-medium px-0">
                  Delivery Fees
                </TableCell>
                <TableCell className="text-right px-0">
                  {dataLoading ? (
                    <Skeleton className="w-40 h-[20px] rounded-full" />
                  ) : (
                    "$" + orderDetails?.deliveryFees
                  )}
                </TableCell>
              </TableRow>

              <TableRow className="border-none">
                <TableCell className="font-medium px-0">
                  Next Billing Date
                </TableCell>
                <TableCell className="text-right px-0">
                  {dataLoading ? (
                    <Skeleton className="w-40 h-[20px] rounded-full" />
                  ) : nextBillingDate ? (
                    formatDate(nextBillingDate, "MMM dd, yyyy")
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="flex gap-x-1 font-medium text-center mt-4">
            {orderedWeekDays.map((day, index) => (
              <div
                key={index}
                className={`bg-white border border-gray-300 p-2 text-sm shadow-md rounded-sm w-full ${
                  isDayMatched(day)
                    ? "!bg-primary text-white font-semibold"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {day.slice(0, 1)}
              </div>
            ))}
          </div>

          <hr className="mt-3" />
        </div>

        <div className="mt-4">
          <h5 className="font-semibold">Delivery info</h5>
          {dataLoading && !orderDetails ? (
            <Skeleton className="w-full h-24 rounded-md" />
          ) : (
            orderDetails && (
              <div className="mt-1 text-sm text-foreground space-y-1">
                <p>{shippingInfo?.fullName}</p>
                <p className="text-gray-700">
                  {shippingInfo?.addressLine1}, {shippingInfo?.city},{" "}
                  {shippingInfo?.state}, {shippingInfo?.zipCode}
                </p>
                <p className="font-medium">{shippingInfo?.phone}</p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="mt-4">
        <Button
          className="bg-white text-primary hover:bg-gray-100 border"
          asChild
        >
          <Link href="/contact">
            <CircleHelp size={17} className="inline-block mr-1" /> Need Help?
          </Link>
        </Button>
      </div>
    </>
  );
}

export default OrderOverview;
