"use client";

import { ItemsWithQty, OneTimeOrderType, PickupOption, PlanOption } from "@/types/main";
import useDeliveryInfo from "@/stores/useDeliveryInfo";
import { useDiscountStore } from "@/stores/useDiscountStore";
import {
  useFinalOrderStore,
  useCheckoutPlanStore,
} from "@/stores/plan/usePlanStore";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { SquarePen } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect } from "react";
const stripePromise = loadStripe(`${process.env.NEXT_PUBLIC_STRIPE_KEY}`);
import GuestCheckoutOnetime from "../../_components/payment-form/GuestCheckoutOnetime";
import { toast } from "sonner";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTaxRate } from "@/stores/useOptions";
import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutPage() {
    const router = useRouter();
    const {data:session} = useSession();
  const { addressInfo } = useDeliveryInfo();
  const { checkoutPlan, setCheckoutPlan } = useCheckoutPlanStore();
  const billingInfo = addressInfo.billingInfo;
  const shippingInfo = addressInfo.shippingInfo;
  const { taxRate, setTaxRate } = useTaxRate();
  const { couponCode } = useDiscountStore();
  const {
    items,
    planType,
    deliveryFees,
    oneTimeOrder,
    subTotal,
    selectedPlan: planName,
  } = useFinalOrderStore();

  if(session && session?.user.role ==="CUSTOMER"){
    redirect("/plans/checkout/payment");
  }
  const calculateTax = useCallback(async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/checkout/calculate-tax",
        {
          method: "POST",
          body: JSON.stringify({
            total: subTotal,
            deliveryFees,
            address: billingInfo,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setTaxRate(parseFloat(data.data.tax_rate));
      } else {
        setTaxRate(0);
      }
    } catch (error) {
      console.log(error);
      setTaxRate(0);
    }
  }, [setTaxRate,subTotal, deliveryFees, billingInfo]);

  useEffect(() => {
    if (planType !== "ONETIME") {
      router.push("/plans/");
      toast.error("You can only checkout one-time orders.");
    }
  }, [planType, router]);

  const setCheckoutPlanMemoized = useCallback(() => {
    if (planType === "ONETIME") {
      if (oneTimeOrder) {
        setCheckoutPlan({
          discountCode: couponCode && couponCode !== "" ? couponCode : null,
          items: items.filter((item) => item.quantity && item.quantity > 0).map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })) as ItemsWithQty[],
          planName: planName as PlanOption,
          planType: "ONETIME" ,
          billingInfo,
          shippingInfo,
          saveAddressForLater: false,
          oneTimeOrder: {
            orderType: oneTimeOrder.orderType as OneTimeOrderType,
            orderDate: oneTimeOrder.orderDate || "",
            slotId: oneTimeOrder.slotId || null,
            pickupTime: oneTimeOrder.pickupTime || null,
            pickupOption: oneTimeOrder.pickupOption as PickupOption,
            selectedKitchenId: oneTimeOrder.selectedKitchenId || null,
          },
        });
      }
    }

  }, [
    planType,
    oneTimeOrder,
    setCheckoutPlan,
    couponCode,
    items,
    planName,
    billingInfo,
    shippingInfo,
  ]);
  useEffect(() => {
    setCheckoutPlanMemoized();
    calculateTax();
  }, [setCheckoutPlanMemoized, couponCode, calculateTax]);

  const appearance = {
    theme: "stripe" as "stripe",
  };
  const options: StripeElementsOptions = {
    appearance,
  };

  return (
    <div className="rounded-md p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="">
          <h1 className="text-lg font-semibold mb-2 inline-flex gap-2 items-center">
           {oneTimeOrder?.pickupOption === "DELIVERY" ? "Delivery Information" : "Billing Information"}
            <Link href="/plans/checkout">
              <SquarePen size="17" />
            </Link>
          </h1>

          <div className="text-gray-700 text-sm">
            {shippingInfo && (
              <div>
                <p className="font-semibold mb-1">{shippingInfo.fullName}</p>
                <p className="mb-1">
                  {shippingInfo.addressLine1},<br />
                  {shippingInfo.addressLine2 && (
                    <>
                      {shippingInfo.addressLine2},<br />
                    </>
                  )}
                  {shippingInfo.city}, {shippingInfo.state} -{" "}
                  <span className="font-semibold"> {shippingInfo.zipCode}</span>
                </p>
                <p className="font-semibold">Phone: {shippingInfo.phone}</p>
              </div>
            )}
          </div>
        </div>

       {oneTimeOrder?.pickupOption === "DELIVERY" && (
        <div className="">
          <h1 className="text-lg font-semibold mb-2 inline-flex gap-2 items-center">
            Billing Information{" "}
            <Link href="/plans/checkout">
              <SquarePen size="17" />
            </Link>
          </h1>

          <div className="text-gray-700 text-sm">
            {billingInfo && (
              <div>
                <p className="font-semibold mb-1">{billingInfo.fullName}</p>
                <p className="mb-1">
                  {billingInfo.addressLine1},<br />
                  {billingInfo.addressLine2 && (
                    <>
                      {billingInfo.addressLine2},<br />
                    </>
                  )}
                  {billingInfo.city}, {billingInfo.state} -{" "}
                  <span className="font-semibold"> {billingInfo.zipCode}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      <div className="mt-6">
        <h1 className="text-lg font-semibold mb-2 inline-flex gap-2 items-center">
          Payment Information
        </h1>
       
           {checkoutPlan && checkoutPlan.planType === "ONETIME" && (taxRate !== undefined || taxRate !== 0) ? (
          <>
            <Elements options={options} stripe={stripePromise}>
            <GuestCheckoutOnetime selectedPlan={checkoutPlan} />
          </Elements>
          </>
        ) : (
          <div className="mt-4">
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-3 mt-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-9 w-36 mt-3" />
          </div>
        )}
      </div>
    </div>
  );
}
