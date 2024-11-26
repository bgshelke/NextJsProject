"use client";
import { useDayMenu } from "@/contexts/DayMenuProvider";
import { BillingInfo, Item, MenuType, TimeSlotsType } from "@/types/main";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Check, Plus, Minus } from "lucide-react";
import { notFound } from "next/navigation";
import React, { useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Elements } from "@stripe/react-stripe-js";
import AddDayCheckout from "./payment-form/AddNewDayCheckout";
import AddDay from "./payment-form/AddDay";
import Image from "next/image";
import PreferenceIcon from "@/app/(pages)/plans/_components/PreferenceIcon";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import useAdditionalDays from "@/stores/additionalDayStore";

import { useItems } from "@/contexts/ItemContext";
import { useDwConfig } from "@/contexts/DwConfigProvider";
import { getPricingLabel } from "@/lib/helper";
import { convertToAmPm } from "@/lib/helper/dateFunctions";
import { fetcher } from "@/lib/helper";
const stripePromise = loadStripe(`${process.env.NEXT_PUBLIC_STRIPE_KEY}`);
function CreateNewDay({ timeSlots }: { timeSlots: TimeSlotsType[] }) {
  const { date, orderId, isUpcoming } = useAdditionalDays();
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; quantity: number }[]
  >([]);
  const { items: itemData } = useItems();
  const { dwConfig } = useDwConfig();
  const [slotId, setSlotId] = useState<string | null>(null);
  const getDate = new Date(date);

  const selectedDate = new Date(getDate)?.toISOString().split("T")[0];
  const { menuData } = useDayMenu(selectedDate);
  const [taxRate, setTaxRate] = useState<number | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState<boolean>(false);
  const [taxLoading, setTaxLoading] = useState<boolean>(false);

  const appearance = {
    theme: "stripe" as "stripe",
  };

  if (!date && !orderId) {
    return notFound();
  }

  const {
    data: subscriptionData,
    error: subscriptionError,
    isLoading: subscriptionLoading,
  } = useSWR(
    "/api/customer/subscription?status=upcoming&isActive=false&getTotal=true",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const subscription = subscriptionData?.data;

  const { data, error, isLoading } = useSWR(
    "/api/customer/profile/saved-address/get-address?orderId=" + orderId,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const options: StripeElementsOptions = {
    appearance,
  };

  const minQty = dwConfig?.minQtyOfItem || 0;
  const maxQty = dwConfig?.maxQtyOfItem || 0;
  const billingInfo = data?.data as BillingInfo;

  const increaseQuantity = (itemId: string) => {
    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.itemId === itemId);
      if (existingItem) {
        const newQuantity = Math.min(existingItem.quantity + 1, maxQty);
        return prevItems.map((item) =>
          item.itemId === itemId ? { ...item, quantity: newQuantity } : item
        );
      } else {
        return [...prevItems, { itemId, quantity: 1 }];
      }
    });
  };

  const decreaseQuantity = (itemId: string) => {
    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.itemId === itemId);
      if (existingItem) {
        if (existingItem.quantity > 1) {
          return prevItems.map((item) =>
            item.itemId === itemId
              ? { ...item, quantity: item.quantity - 1 }
              : item
          );
        } else {
          return prevItems.filter((item) => item.itemId !== itemId);
        }
      }
      return prevItems;
    });
  };

  const subtotal = useMemo(() => {
    return selectedItems?.reduce((acc, selectedItem) => {
      const item = itemData.find((item) => item.id === selectedItem.itemId);
      return acc + (item?.price || 0) * selectedItem.quantity;
    }, 0);
  }, [selectedItems, itemData]);

  const handleCreateTax = async () => {
    try {
      setTaxLoading(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/checkout/calculate-tax",
        {
          method: "POST",
          body: JSON.stringify({
            total: subtotal,
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

  const orderTotal = subscription?.totalAmount || 0;
  const orderedDays = subscription?.subscriptionDays || 0;

  const checker = selectedItems.length > 0 && getDate && orderId && slotId;
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Create New Order</h1>
      <p className="text-sm text-gray-500">
        {getDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="">
          <div className="w-full bg-white rounded-md p-4 border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.length > 0 &&
                  itemData
                    .filter((item) =>
                      selectedItems.some(
                        (selectedItem) => selectedItem.itemId === item.id
                      )
                    )
                    .map((item: Item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">
                            {item.itemName}
                            <span className="text-gray-500 text-xs">
                              {item.unit && `(${item.unit}${item.unitType})`}
                            </span>
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-medium">
                            x
                            {
                              selectedItems.find(
                                (selectedItem) =>
                                  selectedItem.itemId === item.id
                              )?.quantity
                            }
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                <TableRow>
                  <TableCell>
                    <p className="font-semibold">Subtotal</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="font-semibold">{getPricingLabel(subtotal)}</p>
                  </TableCell>
                </TableRow>

                {taxRate && (
                  <TableRow>
                    <TableCell>
                      <p className="font-semibold">Tax{"(" + taxRate + "%)"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold">
                        {getPricingLabel(subtotal * (taxRate / 100))}
                      </p>
                    </TableCell>
                  </TableRow>
                )}

                {taxRate && checker && (
                  <TableRow>
                    <TableCell>
                      <p className=" font-semibold">Total</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <p className="">
                        {getPricingLabel(subtotal * (taxRate / 100) + subtotal)}
                      </p>
                    </TableCell>
                  </TableRow>
                )}

            
              </TableBody>
            </Table>


            {!taxRate && checker && (
              <Button
                onClick={handleCreateTax}
                disabled={isLoading || taxLoading}
                className="mt-3 w-full"
              >
                {isLoading || taxLoading
                  ? "Please wait..."
                  : "Continue"}
              </Button>
            )}
            {isUpcoming ? (
              <>
                {taxRate && checker && (
                  <div className="mt-4">
                    <AddDay
                      selectedDate={getDate}
                      orderId={orderId}
                      items={selectedItems}
                      slotId={slotId || ""}
                      totalAmount={subtotal * (taxRate / 100) + subtotal}
                      isUpcoming={isUpcoming}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {showPaymentForm && checker && taxRate && (
                  <div className={`mt-4`}>
                    <Elements options={options} stripe={stripePromise}>
                      <AddDayCheckout
                        selectedDate={getDate}
                        orderId={orderId}
                        items={selectedItems}
                        slotId={slotId}
                        billingInfo={billingInfo}
                        totalAmount={subtotal * (taxRate / 100) + subtotal}
                      />
                    </Elements>
                  </div>
                )}
              </>
            )}{" "}
        
        {taxRate && isUpcoming && (
            <div
              className={`${
                (orderTotal + subtotal) >=
                (dwConfig?.maxAmountForFreeDelivery || 100)
                ? "bg-primary"
                : "bg-orange-500"
            } text-white p-4 rounded-md mt-4`}
          >
            <p className="text-sm font-semibold">
              {(orderTotal + subtotal) >= (dwConfig?.maxAmountForFreeDelivery || 100)
                ? "You are eligible for free delivery."
                : `Add ${getPricingLabel(
                    (dwConfig?.maxAmountForFreeDelivery || 100) -
                      (orderTotal + subtotal)
                  )} more to get free delivery. Current delivery charge: ${getPricingLabel(
                    (dwConfig?.deliveryFees || 5) * (subscription?.orderedDays || 1)
                  )}`}
            </p>
          </div>
        )}

          </div>
       
          {taxRate && isUpcoming && (
          <p className="text-sm text-gray-500">
            Note: Your all order total amount is{" "}
            {getPricingLabel(orderTotal)} and current delivery charge is{" "}
            {getPricingLabel(
              (dwConfig?.deliveryFees || 5) * (subscription?.orderedDays || 1)
            )}
          </p>
        )}
        </div>


        <div className="space-y-2 bg-white border border-gray-200 rounded-md p-5">
          <h2 className="text-lg font-semibold">Customize Your Order</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-medium">
              {itemData.map((item: Item, index: number) => {
                const menuItem = menuData?.find(
                  (menuItem: MenuType) => menuItem.itemId === item.id
                ) as MenuType;
                return (
                  <TableRow key={index}>
                    <TableCell className="py-2 flex items-center gap-2">
                      {item.thumbnail && (
                        <div className="w-11 h-11 rounded-md overflow-hidden bg-gray-100 relative">
                          <Image
                            src={
                              item.thumbnail
                                ? (process.env.NEXT_PUBLIC_AWS_URL as string) +
                                  item.thumbnail
                                : "/images/placeholder.jpg"
                            }
                            alt={item.itemName || "item"}
                            width={100}
                            className="w-full h-full object-contain"
                            height={100}
                            priority={true}
                          />
                          <PreferenceIcon
                            preference={item.mealPreference || "VEG"}
                          />
                        </div>
                      )}
                      <div className="space-y-[1px]">
                        <p className="text-sm font-medium">
                          {menuItem?.name || "Menu Not Available"}
                        </p>
                        <p className="text-xs text-gray-600">{item.itemName}</p>
                        <div className="flex items-center gap-2 pt-[2px]">
                          <div className="bg-primary/10 text-primary py-[2px] font-semibold rounded-full max-w-fit text-xs px-2">
                            {getPricingLabel(item.price || 0)}
                          </div>
                          {item.unit && (
                            <p className="text-xs text-gray-500">
                              {item.unit + " " + item.unitType}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="bg-gray-100 rounded-md inline-flex items-center justify-end gap-x-2 overflow-hidden">
                        <button
                          className="p-2.5 text-primary hover:bg-primary transition hover:text-white"
                          onClick={() => decreaseQuantity(item.id)}
                        >
                          <Minus size="18" />
                        </button>
                        {selectedItems.find(
                          (selectedItem) => selectedItem.itemId === item.id
                        )?.quantity || 0}
                        <button
                          className="p-2.5 hover:bg-primary text-primary transition hover:text-white"
                          onClick={() => increaseQuantity(item.id)}
                        >
                          <Plus size="18" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="font-semibold mt-6">Select Delivery Slot</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {timeSlots.map((slot: TimeSlotsType) => (
              <div
                key={slot.id}
                onClick={() => setSlotId(slot.id)}
                className={`bg-gray-100 w-full relative font-semibold border-2 hover:border-primary p-4 rounded-md cursor-pointer ${
                  slotId === slot.id
                    ? "border-primary !bg-white"
                    : "border-gray-300"
                }`}
              >
                {convertToAmPm(slot.timeStart)} - {convertToAmPm(slot.timeEnd)}
                {slotId === slot.id ? (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-primary rounded-full p-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateNewDay;
