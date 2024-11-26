"use client";

import Image from "next/image";
import useSWR, { mutate } from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Item, MenuType, PickupOption, SubOrderStatusType } from "@/types/main";


import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast, Toaster } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { OrderStatusLabel, PickupStatusLabel, PickupStatusType } from "./OrderStatusLabel";

import { OrderItem } from "@prisma/client";
import PreferenceIcon from "@/app/(pages)/plans/_components/PreferenceIcon";
import { fetcher, getPricingLabel } from "@/lib/helper";
import { useItems } from "@/contexts/ItemContext";
import { useDayMenu } from "@/contexts/DayMenuProvider";
import { estTimeZone, utcTimeZone } from "@/lib/helper/dateFunctions";
import { toZonedTime } from "date-fns-tz";


// Define the expected return type of useMenuStore


function OneTimeOrder({
  orderId,
  orderType,
}: {
  orderId: string;
  firstDeliveryDate: Date;
  orderType: PickupOption;
}) {
  const {items} = useItems();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isValidOrderDate, setIsValidOrderDate] = useState(false);
  const { data, error, isLoading, mutate: orderMutate } = useSWR(
    process.env.NEXT_PUBLIC_URL + `/api/customer/orders?orderId=${orderId}`,
    fetcher
  );

  const order = data?.data;
  const orderItems = order?.items;

  const orderDate = order ? new Date(order?.pickupDate || order?.deliveryDate)?.toISOString().split("T")[0] : "";
  console.log(orderDate)
  const { menuData } = useDayMenu(orderDate);
  useEffect(() => {
    isOrderDateValid();
  }, [isValidOrderDate]);

  const orderStatus = order?.status as SubOrderStatusType;
  const pickupStatus = order?.status as PickupStatusType;

  const cancelOrder = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + `/api/customer/orders`,
        {
          method: "DELETE",
          body: JSON.stringify({ orderId, orderType }),
        }
      );
      const data = await response.json();
      setIsDeleting(false);
      if (data.success) {
        toast.success(data.message);
        orderMutate();
        mutate(`/api/customer/wallet`);
      } else {
        toast.error(data.message);
        setIsDeleting(false);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
      setIsDeleting(false);
    }
  };

  const isOrderDateValid = useCallback(() => {
    const currentDate = toZonedTime(new Date(), estTimeZone);
    const date = new Date(orderDate);
    console.log(date)
    const myOrderDate = toZonedTime(date, utcTimeZone);
    
    currentDate.setHours(0, 0, 0, 0);
    myOrderDate.setHours(0, 0, 0, 0);
    console.log(myOrderDate, currentDate)
    setIsValidOrderDate(myOrderDate > currentDate);
  }, [orderDate]);

  if (isLoading) return <div>Loading...</div>;
  if (error || !data) {
    return (
      <div className="border-2 border-gray-300 p-2 rounded-md">
        Order not found
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="bg-gray-50 p-2 rounded-md flex items-center gap-4 relative">
        <div className="bg-gray-200 h-24 w-24 rounded-md overflow-hidden relative">
          <Image
            src={
              order.thumbnail
                ? process.env.NEXT_PUBLIC_AWS_URL + order.thumbnail
                : "/images/placeholder.jpg"
            }
            alt="Dabbah Order"
            className="object-cover w-full h-full"
            width={200}
            height={200}
          />
        
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">
        
            {toZonedTime(order?.deliveryDate || order?.pickupDate, utcTimeZone).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h2>

          {orderType === "DELIVERY" ? (
            <>
              {orderStatus !== "REFUNDED" &&
                orderStatus !== "CANCELLED" &&
                orderStatus !== "DELIVERED" && (
                  <p className="text-sm text-gray-700">
                     Delivery Window:{" "}
                    {order?.timeSlotStart} - {order?.timeSlotEnd}
                  </p>
                )}
              {orderStatus === "CANCELLED" && (
                <p className="text-sm text-gray-700">Order Cancelled</p>
              )}
              {orderStatus === "DELIVERED" && (
                <p className="text-sm text-gray-700">Order Delivered</p>
              )}
              {orderStatus === "REFUNDED" && (
                <p className="text-sm text-gray-700">Order Refunded</p>
              )}
            </>
          ) : (
            <>
              {pickupStatus !== "REFUNDED" &&
                pickupStatus !== "CANCELLED" &&
                pickupStatus !== "PICKED_UP" && (
                  <p className="text-sm text-gray-700">
                    Pickup Time:{" "}
                    {order?.pickupTime}
                  </p>
                )}
              {pickupStatus === "CANCELLED" && (
                <p className="text-sm text-gray-700">Order Cancelled</p>
              )}
              {pickupStatus === "PICKED_UP" && (
                <p className="text-sm text-gray-700">Order Picked Up</p>
              )}
            </>
          )}

          <div>
            {order?.orderType === "SCHEDULED" &&
            order?.status === "ACCEPTED" ? (
              <span className="text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded-md font-semibold uppercase">
                Scheduled
              </span>
            ) : (
              <>
                {orderType === "DELIVERY" && (
                  <PickupStatusLabel status={pickupStatus} />
                )}
                {orderType === "PICKUP" && <OrderStatusLabel status={orderStatus} />}
              </>
            )}
          </div>
        </div>
        {order?.status === "ACCEPTED"  && isValidOrderDate ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="text-xs p-3 h-8 shadow-sm bg-white hover:bg-gray-100 text-gray-800 border absolute top-2 right-2 "
                disabled={isDeleting}
              >
                {isDeleting ? "Cancelling..." : "Cancel Order"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you sure you want to cancel this order?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Your order will be cancelled and you will be refunded to your
                  wallet.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No</AlertDialogCancel>
                <AlertDialogAction onClick={cancelOrder}>
                  Cancel Order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
         isValidOrderDate && orderStatus === "ACCEPTED" && <p className="text-sm text-gray-700">Order cannot be cancelled</p> 
        )}
      </div>
      <div>
        <Table className="text-sm font-medium">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderItems
              ?.map((orderItem: OrderItem) => {
                const item = items.find((i: Item) => i.id === orderItem.itemId);
                
                const menuItem = menuData?.find((menuItem: MenuType) => menuItem.itemId === item?.id);
                return (
                  <TableRow key={item?.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item?.thumbnail && (
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 relative">
                            <Image
                              src={
                               
                                item?.thumbnail ? (process.env.NEXT_PUBLIC_AWS_URL as string) + item?.thumbnail : "/images/placeholder.jpg"
                              }
                              alt={item?.itemName || ""}
                              width={100}
                              className="w-full h-full object-contain"
                              height={100}
                              priority={true}
                            />
                            <PreferenceIcon preference={item?.mealPreference || "VEG"} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm">
                            {item?.itemName}{" "}
                            {item?.unit && (
                              <span className="text-xs text-gray-600">{`(${item?.unit} ${
                                item?.unitType || ""
                              })`}</span>
                            )}
                          </p>

                          <p className="text-xs text-gray-500">{ menuItem?.name || "Menu not available"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>x{orderItem?.quantity}</TableCell>
                    <TableCell>{getPricingLabel(orderItem?.itemPrice)}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
      <Toaster />
    </div>
  );
}

export default OneTimeOrder;
