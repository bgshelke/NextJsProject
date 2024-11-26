"use client";
import { notFound } from "next/navigation";
import React from "react";
import useSWR from "swr";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SubscriptionOrder from "../../my-subscription/_components/SubscriptionOrder";
import OneTimeOrder from "../../my-subscription/_components/OneTimeOrder";
import { downloadInvoice } from "../../my-subscription/_components/ActiveSubscription";
import { useKitchens } from "@/contexts/KitchenContext";
import { fetcher } from "@/lib/helper";
import { toZonedTime } from "date-fns-tz";
import { estTimeZone, utcTimeZone } from "@/lib/helper/dateFunctions";
import PickupAddress from "./PickupAddress";

function OrderPage({ params }: { params: { orderID: string } }) {
  const orderID = params.orderID;
  const { data: myData, isLoading: orderLoading } = useSWR(
    orderID
      ? process.env.NEXT_PUBLIC_URL +
          `/api/customer/subscription/orders/subdays?orderID=${orderID}`
      : null,
    fetcher
  );

  if (!orderID) {
    return notFound();
  }

  const orderData = myData?.data;
  const orderDetails = myData?.data?.order;
  const dataLoading = orderLoading || !myData;
  const orderType = orderData?.kitchenId ? "PICKUP" : "DELIVERY";
  const kitchenId = orderData?.kitchenId;

  // const pickupKitchen =
  //   kitchens.find((kitchen) => kitchen.id === kitchenId) || null;

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-y-5 md:gap-y-0 justify-between">
        <div>
          <h1 className="text-[1.5rem] font-semibold mb-1">
            Order #{dataLoading ? "" : orderDetails?.orderID}
          </h1>
          <p className="text-foreground text-sm">
            Order Date{" "}
            {dataLoading ? (
              <></>
            ) : (
              toZonedTime(orderDetails?.createdAt,utcTimeZone).toLocaleString(
                "en-US",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )
            )}
          </p>
        </div>
        <div className="gap-x-2 flex items-center">
     
          <Button onClick={() => downloadInvoice(orderDetails?.invoiceId)}>
            Download Invoice
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start mt-4 gap-6">
        <div className="md:w-2/3">
          <div className="border rounded-md bg-white ">
            {dataLoading ? (
              <div className="space-y-2">
                <Skeleton className="w-full h-24 rounded-md" />
                <Skeleton className="w-full h-24 rounded-md" />
                <Skeleton className="w-full h-24 rounded-md" />
                <Skeleton className="w-full h-24 rounded-md" />
                <Skeleton className="w-full h-24 rounded-md" />
              </div>
            ) : orderDetails?.planType === "SUBSCRIPTION" &&
              orderDetails?.firstDeliveryDate ? (
              <SubscriptionOrder
                firstDeliveryDate={new Date(orderDetails?.firstDeliveryDate)}
                orderId={orderID}
                isActive={false}
                isUpcoming={false}
              />
            ) : (
              <>
                {orderDetails?.planType === "ONETIME" && (
                  <OneTimeOrder
                    orderId={orderID}
                    orderType={orderType}
                    firstDeliveryDate={
                      new Date(orderDetails?.firstDeliveryDate)
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div className="md:w-1/3">
          <div className="bg-white rounded-md p-6 border">
            <div className="">
              <h5 className="font-semibold">Order Detail</h5>
              <Table className="text-sm mt-3 font-medium">
                <TableBody>
              
            
                  <TableRow className="border-none">
                    <TableCell className="font-medium px-0">
                      Total Servings
                    </TableCell>
                    <TableCell className="text-right px-0">
                      {dataLoading ? (
                        <Skeleton className="w-40 h-[20px] rounded-full" />
                      ) : (
                        orderData?.totalServings
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
                        "$" + orderData?.costPerServing
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-none">
                    <TableCell className="font-medium px-0">
                      Servings Per Day
                    </TableCell>
                    <TableCell className="text-right px-0">
                      {dataLoading ? (
                        <Skeleton className="w-40 h-[20px] rounded-full" />
                      ) : (
                        orderData?.servingsPerDay?.toFixed(2)
                      )}
                    </TableCell>
                  </TableRow>
                  {orderType === "DELIVERY" && (
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
                  )}
                </TableBody>
              </Table>

              <hr className="mt-3" />
            </div>

            <div className="mt-4">
              <h5 className="font-semibold">
                {orderType !== "PICKUP" ? "Delivery Info" : "Pickup Info"}
              </h5>
              {dataLoading ? (
                <Skeleton className="w-full h-24 rounded-md" />
              ) : (
                <>
                  {orderType === "DELIVERY" && orderDetails?.shippingInfo && (
                    <div className="mt-1 text-sm text-foreground">
                      <p>{orderDetails?.shippingInfo?.fullName}</p>
                      <p>
                        {orderDetails?.shippingInfo?.addressLine1},{" "}
                        {orderDetails?.shippingInfo?.city},{" "}
                        {orderDetails?.shippingInfo?.state},{" "}
                        {orderDetails?.shippingInfo?.zipCode}
                      </p>
                    </div>
                  )}
                  {orderType === "PICKUP" && (
                    <PickupAddress
                      orderType={orderType}
                      kitchenId={kitchenId}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Button
              className="bg-white text-primary hover:bg-gray-100 border"
              asChild
            >
              <Link href="/contact">
                <CircleHelp size={17} className="inline-block mr-1" /> Need
                Help?
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPage;
