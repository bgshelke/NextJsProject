"use client";

import { useDiscountStore } from "@/stores/useDiscountStore";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserSelectedPlan } from "@/types/main";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePaymentSuccess } from "@/stores/useOptions";
import Alert from "@/components/ui/customAlert";


function GuestCheckoutOnetime({
  selectedPlan,
}: {
  selectedPlan: UserSelectedPlan;
}) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setPaymentSuccess } = usePaymentSuccess();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const { removeDiscount } = useDiscountStore();
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }
    setError(null);
    const cardNumberElement = elements?.getElement(CardNumberElement);
    const cardExpiryElement = elements?.getElement(CardExpiryElement);
    const cardCvcElement = elements?.getElement(CardCvcElement);
    if (elements == null) {
      return;
    }

    if (!cardNumberElement || !cardExpiryElement || !cardCvcElement) {
      console.error("Card element not found");
      setIsLoading(false);
      return;
    }

    try {
      const { error: stripeError, paymentMethod } =
        await stripe?.createPaymentMethod({
          type: "card",
          card: cardNumberElement,
          billing_details: {
            name: selectedPlan.billingInfo?.fullName,
            email: email,
            phone: selectedPlan.shippingInfo?.phone,
            address: {
              line1: selectedPlan.billingInfo?.addressLine1,
              state: selectedPlan.billingInfo?.state,
              city: selectedPlan.billingInfo?.city,
              country: "US",
              postal_code: selectedPlan.billingInfo?.zipCode,
            },
          },
        });
      if (stripeError) {
        setError(
          stripeError?.message ||
            "An error occurred while processing your payment."
        );
        return;
      }
      if (!paymentMethod || !paymentMethod?.id) {
        throw new Error("Failed to create payment method");
      }

      const res = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/checkout/guest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id,
            selectedPlan,
            email,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        router.refresh();
        setPaymentSuccess(data.data);
        router.push("/plans/guest/success");
        removeDiscount();
      
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("An error occurred:", error);
      setError("An error occurred while processing your payment.");
    } finally {
      setIsLoading(false);
      elements?.getElement(CardNumberElement)?.clear();
      elements?.getElement(CardExpiryElement)?.clear();
      elements?.getElement(CardCvcElement)?.clear();
    }
  };

  return (
    <div>
      <div id="card-element">
        <Input
          placeholder="Email Address"
          type="email"
          className="p-6 border border-gray-300 w-full rounded-md"
          onChange={(e) => setEmail(e.target.value)}
        />
        <CardNumberElement
          className="p-4 border border-gray-300 mt-3 rounded-md"
          options={{ showIcon: true }}
          data-test="card-number"
        />
        <div className="flex mt-3 gap-3 max-sm:mb-2">
          <CardExpiryElement
            className="p-4 border border-gray-300 w-full rounded-md"
            data-test="card-expiry"
          />
          <CardCvcElement
            className="p-4 border border-gray-300 w-full rounded-md"
            data-test="card-cvc"
          />
          <div className="hidden md:block w-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    className="p-6 border border-gray-300 w-full rounded-md"
                    placeholder="ZIP"
                    value={selectedPlan.billingInfo?.zipCode}
                    disabled
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    To change your ZIP code, please update your billing
                    information.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="md:hidden w-full">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  className="p-6 border border-gray-300 w-full rounded-md"
                  placeholder="ZIP"
                  value={selectedPlan.billingInfo?.zipCode}
                  disabled
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  To change your ZIP code, please update your billing
                  information.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button
          disabled={isLoading}
          className="mt-4"
          onClick={handleSubmit}
          data-test="place-order-btn"
        >
          {isLoading ? "Please wait..." : "Place Order"}
        </Button>

        {error && error?.length !== 0 && (
          <Alert message={error} variant="error" className="mt-2" />
        )}
      </div>
    </div>
  );
}

export default GuestCheckoutOnetime;
