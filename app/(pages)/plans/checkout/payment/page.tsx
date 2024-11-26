"use client";

import { useFinalOrderStore } from "@/stores/plan/usePlanStore";
import { useCallback, useEffect } from "react";
import { useCheckoutPlanStore } from "@/stores/plan/usePlanStore";
import useDeliveryInfo from "@/stores/useDeliveryInfo";
import { useDiscountStore } from "@/stores/useDiscountStore";
import { useTaxRate } from "@/stores/useOptions";
import { OneTimeOrderType, PickupOption, PlanOption } from "@/types/main";
import Link from "next/link";
import { SquarePen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Elements } from "@stripe/react-stripe-js";
import StripeSubscriptionForm from "../../_components/payment-form/StripeSubscriptionForm";
import CheckoutOneTimeForm from "../../_components/payment-form/CheckoutOneTime";
import { StripeElementsOptions } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(`${process.env.NEXT_PUBLIC_STRIPE_KEY}`);

export default function CheckoutPage() {
  const { addressId, addressInfo, saveAddressForLater } = useDeliveryInfo();
  const { checkoutPlan, setCheckoutPlan } = useCheckoutPlanStore();

  const { taxRate, setTaxRate } = useTaxRate();
  const billingInfo = addressInfo.billingInfo;
  const shippingInfo = addressInfo.shippingInfo;
  const { couponCode } = useDiscountStore();
  const {
    items,
    planType,
    deliveryFees,
    oneTimeOrder,
    subTotal,
    subscriptionOrder,
    selectedPlan: planName,
  } = useFinalOrderStore();

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
  }, [subTotal, deliveryFees, billingInfo]);

  const setCheckoutPlanMemoized = useCallback(() => {
    if (planType === "ONETIME") {
      if (oneTimeOrder) {
        setCheckoutPlan({
          discountCode: couponCode && couponCode !== "" ? couponCode : null,
          items: items
            .filter((item) => item.quantity && item.quantity > 0)
            .map((item) => ({
              id: item.id,
              quantity: item.quantity || 0,
            })),
          planName: planName as PlanOption,
          planType: "ONETIME",
          billingInfo,
          shippingInfo,
          saveAddressForLater: saveAddressForLater,
          oneTimeOrder: {
            orderType: oneTimeOrder.orderType as OneTimeOrderType,
            orderDate: oneTimeOrder.orderDate || "",
            slotId: oneTimeOrder.slotId || null,
            pickupTime: oneTimeOrder.pickupTime || null,
            pickupOption: oneTimeOrder.pickupOption as PickupOption,
            selectedKitchenId: oneTimeOrder.selectedKitchenId || null,
          },

          addressId: addressId,
        });
      }
    }
    if (planType === "SUBSCRIPTION") {
      if (
        subscriptionOrder &&
        subscriptionOrder.selectedDays &&
        subscriptionOrder.deliveryDate
      ) {
        setCheckoutPlan({
          discountCode: couponCode && couponCode !== "" ? couponCode : null,
          items: null,
          planName: planName as PlanOption,
          planType: "SUBSCRIPTION",
          billingInfo,
          shippingInfo,
          subscriptionOrder: {
            subscriptionDays: subscriptionOrder.selectedDays.map((day) => ({
              ...day,
              items: day.items
                .filter((item) => item.quantity && item.quantity > 0)
                .map((item) => ({
                  id: item.id,
                  quantity: item.quantity || 0,
                })),
            })),
            deliveryDate: subscriptionOrder.deliveryDate,
          },
          saveAddressForLater: saveAddressForLater,
          addressId: addressId,
        });
      }
    }
  }, [
    planType,
    setCheckoutPlan,
    couponCode,
    items,
    planName,
    billingInfo,
    shippingInfo,
    saveAddressForLater,
    addressId,
    subscriptionOrder,
    oneTimeOrder,
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
        <div>
          <h1 className="text-lg font-semibold mb-2 inline-flex gap-2 items-center">
            {oneTimeOrder?.pickupOption === "DELIVERY" ? "Delivery" : "My"}{" "}
            Information{" "}
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
      </div>

      <div className="mt-6">
        <h1 className="text-lg font-semibold mb-2 inline-flex gap-2 items-center">
          Payment Information
        </h1>


 

        {checkoutPlan && (taxRate !== undefined || taxRate !== 0) ? (
          <>
            {checkoutPlan.planType === "SUBSCRIPTION" && (
              <Elements options={options} stripe={stripePromise}>
                <StripeSubscriptionForm selectedPlan={checkoutPlan} />
              </Elements>
            )}
            {checkoutPlan.planType === "ONETIME" && (
              <Elements options={options} stripe={stripePromise}>
                <CheckoutOneTimeForm selectedPlan={checkoutPlan} />
              </Elements>
            )}
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
