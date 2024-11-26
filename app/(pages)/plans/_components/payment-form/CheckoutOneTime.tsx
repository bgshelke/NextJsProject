"use client";
import { useDiscountStore } from "@/stores/useDiscountStore";
import {
  CardCvcElement,
  CardElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useSession } from "next-auth/react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPricingLabel } from "@/lib/helper";
import Alert from "@/components/ui/customAlert";
import { useWallet } from "@/contexts/WalletContext";


export default function CheckoutOneTimeForm({ selectedPlan }: { selectedPlan: UserSelectedPlan }) {
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { removeDiscount } = useDiscountStore();
  const { wallet ,useWalletCredit,setUseWalletCredit} = useWallet();
  const { data: session, update } = useSession();
  const [smsNotifications, setSmsNotifications] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async () => {
    
    try{
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
  
      const { error: stripeError, paymentMethod } =
        await stripe?.createPaymentMethod({
          type: "card",
          card: cardNumberElement,
        });
      if (stripeError) {
        setError(
          stripeError?.message ||
            "An error occurred while processing your payment."
        );
        return;
      }
  
      if (!error) {
        const id = paymentMethod?.id;
        try {
          const res = await fetch(process.env.NEXT_PUBLIC_URL + "/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentMethodId: id,
              selectedPlan,
              useWalletAmount: useWalletCredit,
              smsNotifications,
            }),
          });
          const data = await res.json();
          setIsLoading(false);
          if (data.success) {
            update((prev: any) => ({ orders: (prev.orders || 0) + 1 }));
            toast.success("Payment Successful. Order Placed Successfully.");
            removeDiscount();
            router.push("/order-history");
          } else {
            setError(data.message);
          }
          elements?.getElement(CardElement)?.clear();
        } catch (error) {
          setError("An error occurred while processing your payment.");
          console.log(error);
        }
        setIsLoading(false);
      }
    }catch{
      setError("An error occurred while processing your payment.");
    }finally{
      setIsLoading(false);
    }
  };
  return (
    <div>
      <div id="card-element">
        <CardNumberElement
          className="p-4 border border-gray-300 mt-4 rounded-md"
          options={{ showIcon: true }}
          data-test="card-number"
        />
        <div className="flex mt-4 gap-3 max-sm:mb-2">
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
    
        {session?.user?.orders !== 0 && (
          <div className="items-top flex space-x-2 mt-4">
            <Checkbox
              id="useWallet"
              checked={useWalletCredit}
              disabled={wallet <= 0}
              onCheckedChange={(checked: boolean) =>
                setUseWalletCredit(checked)
              }
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="useWallet"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use my wallet balance to pay for the order
              </label>
              <p className="text-xs text-gray-500">
                Your Available Balance is {getPricingLabel(wallet)}
              </p>
            </div>
          </div>
        )}

        {session?.user?.orders === 0 && (
          <div className="items-top flex space-x-2 mt-5 mb-2">
            <Checkbox
              id="smsNotifications"
              onCheckedChange={(checked: boolean) =>
                setSmsNotifications(checked)
              }
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="smsNotifications"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Would you like to receive SMS notifications?
              </label>
              <p className="text-xs">
                You can change this later in your account settings.
              </p>
            </div>
          </div>
        )}

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

