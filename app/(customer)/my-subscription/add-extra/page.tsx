"use client";
import { BillingInfo, Item, MenuType, OrderItemType } from "@/types/main";
import React, { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { SubOrders } from "@prisma/client";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Minus } from "lucide-react";
import PreferenceIcon from "@/app/(pages)/plans/_components/PreferenceIcon";

import { notFound } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import {
  convertToAmPm,
  estTimeZone,
  utcTimeZone,
} from "@/lib/helper/dateFunctions";
import { fetcher, getPricingLabel } from "@/lib/helper";
import AddExtraItemCheckout from "../_components/payment-form/AddExtraItemCheckout";
import UpdateItems from "../_components/payment-form/UpdateItems";
import { toZonedTime } from "date-fns-tz";
import { useWallet } from "@/contexts/WalletContext";
import { useDwConfig } from "@/contexts/DwConfigProvider";
import { useItems } from "@/contexts/ItemContext";
import useExtraItem from "@/stores/addExtraItem";

const stripePromise = loadStripe(`${process.env.NEXT_PUBLIC_STRIPE_KEY}`);
interface SubOrderItem extends SubOrders {
  items: OrderItemType[];
  order: {
    orderID: string;
  };
  totalAmount: number;
  orderedDays: number;
}

function Page() {
  const { items } = useItems();
  const { orderId, isFutureOrder } = useExtraItem();

  const [additionalItems, setAdditionalItems] = useState<
    { id: string; quantity: number }[]
  >([]);

  if (!orderId) {
    return notFound();
  }

  const apiUrl = `/api/customer/subscription/actions/add-extra?orderID=${orderId}&status=${
    isFutureOrder ? "upcoming" : "active"
  }`;
  const { data: subOrder } = useSWR(apiUrl, fetcher);
  const subLoading = subOrder?.isLoading;
  const subOrderData = subOrder?.data as SubOrderItem;
  const { dwConfig } = useDwConfig();
  const subOrderItems = subOrderData?.items as OrderItemType[];
  const [taxRate, setTaxRate] = useState<number | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState<boolean>(false);
  const [taxLoading, setTaxLoading] = useState<boolean>(false);
  const { useWalletCredit, wallet } = useWallet();
  const dateofDelivery = subOrderData?.deliveryDate
    ? new Date(subOrderData?.deliveryDate).toISOString().split("T")[0]
    : "";

  const mainOrderId = subOrderData?.order.orderID;
  const {
    data: billingInfoData,
    error: billingError,
    isLoading: billingLoading,
  } = useSWR(
    mainOrderId
      ? "/api/customer/profile/saved-address/get-address?orderId=" + mainOrderId
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  const billingInfo = billingInfoData?.data as BillingInfo;

  const appearance = {
    theme: "stripe" as "stripe",
  };
  const options: StripeElementsOptions = {
    appearance,
  };

  useEffect(() => {
    if (subOrderData && items) {
      setAdditionalItems(
        items.map((item: Item) => {
          const subOrderItem = subOrderItems.find(
            (subItem) => subItem.itemId === item.id
          );
          return {
            id: item.id,
            quantity: subOrderItem?.quantity || 0,
          };
        })
      );
    }
  }, [subOrderData, items, subOrderItems]);

  const handleIncreaseQuantity = (itemId: string) => {
    setAdditionalItems((prevItems) => {
      const itemIndex = prevItems.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) {
        return [...prevItems, { id: itemId, quantity: 1 }];
      } else {
        const updatedItems = [...prevItems];
        const currentQuantity = updatedItems[itemIndex].quantity;
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          quantity:
            currentQuantity < (dwConfig?.maxQtyOfItem || 8)
              ? currentQuantity + 1
              : currentQuantity,
        };
        return updatedItems;
      }
    });
  };

  const handleDecreaseQuantity = (itemId: string) => {
    setAdditionalItems((prevItems) => {
      const itemIndex = prevItems.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) {
        return prevItems;
      } else {
        const updatedItems = [...prevItems];
        const currentQuantity = updatedItems[itemIndex].quantity;
        const subOrderItem = subOrderItems.find(
          (subItem) => subItem.itemId === itemId
        );
        const defaultQuantity = subOrderItem?.quantity || 0;

        if (isFutureOrder) {
          if (currentQuantity > 0) {
            updatedItems[itemIndex] = {
              ...updatedItems[itemIndex],
              quantity: currentQuantity - 1,
            };
          }
        } else {
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            quantity:
              currentQuantity > defaultQuantity
                ? currentQuantity - 1
                : defaultQuantity,
          };
        }
        return updatedItems;
      }
    });
  };
  const additionalItemsCount = useMemo(() => {
    return additionalItems
      .map((item) => {
        const subOrderItem = subOrderItems.find(
          (subItem) => subItem.itemId === item.id
        );
        const defaultQuantity = subOrderItem?.quantity || 0;
        const additionalQuantity = item.quantity - defaultQuantity;
        return { ...item, quantity: additionalQuantity };
      })
      .filter((item) => item.quantity !== 0);
  }, [additionalItems, subOrderItems]);

  const subtotal = useMemo(() => {
    const walletAmount = useWalletCredit ? wallet : 0;
    const itemTotal = additionalItemsCount.reduce((acc, item) => {
      const itemData = items.find((i: Item) => i.id === item.id);
      return acc + (itemData?.price || 0) * item.quantity;
    }, 0);

    const remainingTotal = itemTotal - walletAmount;
    const usedWalletAmount =
      itemTotal >= walletAmount ? walletAmount : itemTotal;
    return {
      remainingTotal: remainingTotal > 0 ? remainingTotal : 0,
      usedWalletAmount: usedWalletAmount,
    };
  }, [additionalItemsCount, items, wallet, useWalletCredit]);

  const handleCreateTax = async () => {
    try {
      setTaxLoading(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/checkout/calculate-tax",
        {
          method: "POST",
          body: JSON.stringify({
            total: subtotal.remainingTotal || 0,
            address: billingInfo,
          }),
        }
      );
      const data = await response.json();
      setTaxLoading(false);
      if (data.success) {
        setTaxRate(parseFloat(data.data.tax_rate));
        setShowPaymentForm(true);
      } else {
        setTaxRate(null);
        setShowPaymentForm(false);
      }
    } catch (error) {
      console.log(error);
      setTaxRate(null);
      setShowPaymentForm(false);
      setTaxLoading(false);
    }
  };

  const orderTotal = useMemo(() => {
    const total = additionalItemsCount.reduce((acc, item) => {
      const itemData = items.find((i: Item) => i.id === item.id);
      return acc + (itemData?.price || 0) * item.quantity;
    }, 0);
    return total + subOrderData?.totalAmount || 0;
  }, [additionalItemsCount, items]);

  return (
    <div>
      <div className="bg-white rounded-md p-6 border w-full">
        <div className="flex flex-col md:flex-row gap-y-6 md:gap-x-6 items-start">
          <div className="w-full md:w-2/3">
            <div className="flex justify-between items-center gap-y-2 ">
              <div className="space-y-1">
                <h5 className="font-semibold">Order Details</h5>
                <p className="text-sm text-gray-600">
                  Order ID: #{subOrderData?.subOrderID}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm text-gray-600">
                  Date of Delivery:{" "}
                  {dateofDelivery
                    ? toZonedTime(dateofDelivery, utcTimeZone).toDateString()
                    : ""}
                </p>

                <p className="text-sm text-gray-600">
                  Time Slot:{" "}
                  {subOrderData?.timeSlotStart
                    ? convertToAmPm(subOrderData?.timeSlotStart)
                    : ""}{" "}
                  -{" "}
                  {subOrderData?.timeSlotEnd
                    ? convertToAmPm(subOrderData?.timeSlotEnd)
                    : ""}
                </p>
              </div>
            </div>

            <div>
              <Table className="rounded-md overflow-hidden mt-4">
                <TableHeader className="  ">
                  <TableRow>
                    <TableHead className="">Item</TableHead>
                    <TableHead className=" text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionalItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        No items added
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {additionalItemsCount.map((item) => {
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              {
                                items.find((i: Item) => i.id === item.id)
                                  ?.itemName
                              }
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {item.quantity > 0 ? (
                                `+${item.quantity}`
                              ) : item.quantity < 0 ? (
                                <span className="text-red-600">
                                  Removed {Math.abs(item.quantity)}
                                </span>
                              ) : (
                                item.quantity
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      <TableRow>
                        <TableCell>
                          <p className="font-semibold">Subtotal</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-semibold">
                            {getPricingLabel(subtotal.remainingTotal)}
                          </p>
                        </TableCell>
                      </TableRow>

                      {useWalletCredit && additionalItemsCount.length > 0 && (
                        <TableRow>
                          <TableCell>
                            <p className="font-semibold">Wallet Amount Used</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-semibold">
                              {getPricingLabel(subtotal.usedWalletAmount)}
                            </p>
                          </TableCell>
                        </TableRow>
                      )}

                      {taxRate && (
                        <TableRow>
                          <TableCell>
                            <p className="font-semibold">
                              Tax{"(" + taxRate + "%)"}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-semibold">
                              {getPricingLabel(
                                subtotal.remainingTotal * (taxRate / 100)
                              )}
                            </p>
                          </TableCell>
                        </TableRow>
                      )}

                      {taxRate && (
                        <TableRow>
                          <TableCell>
                            <p className=" font-semibold">Total to Pay</p>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <p className="">
                              {getPricingLabel(
                                subtotal.remainingTotal * (taxRate / 100) +
                                  subtotal.remainingTotal
                              )}
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                 
                </TableBody>
              </Table>

              {additionalItemsCount.length > 0 && (
                <div
                  className={`${
                    orderTotal >= (dwConfig?.maxAmountForFreeDelivery || 100)
                      ? "bg-primary"
                      : "bg-orange-500"
                  } text-white p-4 rounded-md mt-4`}
                >
                  <p className="text-sm font-semibold">
                    {orderTotal >= (dwConfig?.maxAmountForFreeDelivery || 100)
                      ? "You are eligible for free delivery."
                      : `Add ${getPricingLabel(
                          (dwConfig?.maxAmountForFreeDelivery || 100) -
                            orderTotal
                        )} more to get free delivery. Current delivery charge: ${getPricingLabel(
                          dwConfig?.deliveryFees ||
                            5 & subOrderData.orderedDays ||
                            5
                        )}`}
                  </p>
                </div>
              )}

              {!isFutureOrder ? (
                <>
                  {showPaymentForm &&
                    additionalItemsCount.length > 0 &&
                    taxRate &&
                    mainOrderId && (
                      <Elements options={options} stripe={stripePromise}>
                        <AddExtraItemCheckout
                          orderId={mainOrderId}
                          additionalItems={additionalItemsCount}
                          subOrderId={orderId}
                          billingInfo={billingInfo as BillingInfo}
                        />
                      </Elements>
                    )}
                </>
              ) : (
                taxRate && (
                  <div className="mt-4">
                    <UpdateItems
                      subOrderId={subOrderData.id}
                      orderId={mainOrderId}
                      isFutureOrder={isFutureOrder}
                      additionalItems={additionalItems}
                      totalAmount={
                        subtotal.remainingTotal * (taxRate / 100) +
                        subtotal.remainingTotal
                      }
                    />
                  </div>
                )
              )}

              {additionalItemsCount.length > 0 && !taxRate && (
                <Button
                  onClick={handleCreateTax}
                  disabled={billingLoading || subLoading || taxLoading}
                  className="mt-3 w-full"
                >
                  {subLoading || taxLoading || billingLoading
                    ? "Please wait..."
                    : "Continue"}
                </Button>
              )}
            </div>
          </div>
          <div className="w-full md:w-1/3 mt-4 md:mt-0">
            <h5 className="font-semibold px-2">
              {isFutureOrder ? "Add Extra Items" : "Update Items"}
            </h5>
            <Table className="text-sm font-medium">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subLoading || !subOrderData ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Skeleton className="w-full h-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ) : (
                  items?.map((item: Item) => {
                    const subOrderItem = subOrderItems.find(
                      (subItem) => subItem.itemId === item.id
                    );
                    const originalQuantity = subOrderItem?.quantity || 0;
                    const additionalItem = additionalItems.find(
                      (ai) => ai.id === item.id
                    );
                    const newQuantity =
                      additionalItem?.quantity || originalQuantity;

                    const futureQty = additionalItem?.quantity || 0;

                    const price = item.price || 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 relative">
                              <Image
                                src={
                                  item.thumbnail
                                    ? (process.env
                                        .NEXT_PUBLIC_AWS_URL as string) +
                                      item.thumbnail
                                    : "/images/placeholder.jpg"
                                }
                                alt={item.itemName || "thumbnail"}
                                width={100}
                                className="w-full h-full object-contain p-1"
                                height={100}
                                priority={true}
                              />
                              <PreferenceIcon
                                preference={item.mealPreference || "VEG"}
                                className="absolute bottom-0 left-0 h-4 w-4"
                              />
                            </div>

                            <div>
                              <p className="text-sm">
                                {" "}
                                {item.itemName}
                                {item.unit && (
                                  <span className="text-xs text-gray-600 ">{`(${item.unit}${item.unitType})`}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getPricingLabel(price)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-end">
                            <div className="bg-gray-100 rounded-md inline-flex items-center justify-end gap-x-2 overflow-hidden">
                              {!isFutureOrder ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-2.5 text-primary hover:bg-primary transition hover:text-white disabled:opacity-50"
                                        onClick={() =>
                                          handleDecreaseQuantity(item.id)
                                        }
                                        disabled={
                                          !isFutureOrder &&
                                          newQuantity <= originalQuantity
                                        }
                                      >
                                        <Minus size="18" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Disabled for the active week</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <button
                                  className="p-2.5 text-primary hover:bg-primary transition hover:text-white disabled:opacity-50"
                                  onClick={() =>
                                    handleDecreaseQuantity(item.id)
                                  }
                                  disabled={isFutureOrder && futureQty <= 0}
                                >
                                  <Minus size="18" />
                                </button>
                              )}

                              <span className="px-2">
                                {isFutureOrder ? futureQty : newQuantity}
                              </span>
                              <button
                                className="p-2.5 text-primary hover:bg-primary transition hover:text-white disabled:opacity-50"
                                onClick={() => handleIncreaseQuantity(item.id)}
                                disabled={
                                  newQuantity >= (dwConfig?.maxQtyOfItem || 8)
                                }
                              >
                                <Plus size="18" />
                              </button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <p className="text-sm text-gray-600 mt-4">
              Note: You can only add items on your current plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page;
