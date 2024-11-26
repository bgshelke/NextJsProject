"use client";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { UserSelectedPlan } from "@/types/main";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast, Toaster } from "sonner";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDiscountStore } from "@/stores/useDiscountStore";
import { useFinalOrderStore } from "@/stores/plan/usePlanStore";
import useDeliveryInfo from "@/stores/useDeliveryInfo";

function StripeSubscriptionForm({
  selectedPlan,
}: {
  selectedPlan: UserSelectedPlan;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { update, data: session } = useSession();

  const { removeDiscount } = useDiscountStore();
  const { clearFinalOrder } = useFinalOrderStore();
  const { clearDeliveryInfo } = useDeliveryInfo();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const createSubscription = async () => {
    setIsLoading(true);
    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }
    const cardNumberElement = elements.getElement(CardNumberElement);
    const expiryElement = elements.getElement(CardExpiryElement);
    const cvcElement = elements.getElement(CardCvcElement);

    if (!cardNumberElement || !expiryElement || !cvcElement) {
      console.error("Card element not found");
      return;
    }
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardNumberElement,
      billing_details: {
        address: {
          line1: selectedPlan.billingInfo?.addressLine1,
          line2: selectedPlan.billingInfo?.addressLine2,
          city: selectedPlan.billingInfo?.city,
          country: "US",
          postal_code: selectedPlan.billingInfo?.zipCode,
          state: selectedPlan.billingInfo?.state,
        },
      },
    });

    if (error) {
      setMessage(error.message || "An error occurred");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/subscription/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedPlan,
            paymentMethodId: paymentMethod.id,
            smsNotifications: smsNotifications,
          }),
        }
      );
      const subscription = await response.json();
      if (subscription.success) {
        toast.success(subscription.message);
        update({ orders: 1 });
        router.push("/my-subscription");
        removeDiscount();
        clearFinalOrder();
        clearDeliveryInfo();
        router.refresh();
      } else {
        toast.error(subscription.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("An error occurred. Please try again");
    }
    setIsLoading(false);
  };

  return (
    <div>
      <CardNumberElement
        className="p-4 border border-gray-300  rounded-md"
        options={{ showIcon: true }}
      />
      <div className="flex mt-2 gap-3 max-sm:mb-2">
        <CardExpiryElement className="p-4 border border-gray-300 w-full rounded-md" />
        <CardCvcElement className="p-4 border border-gray-300 w-full rounded-md" />
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
      <div className="md:hidden">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                className="p-4 border border-gray-300 w-full rounded-md"
                placeholder="ZIP"
                value={selectedPlan.billingInfo?.zipCode}
                disabled
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                To change your ZIP code, please update your billing information.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {session && session?.user?.orders < 1 && (
        <div className="items-top flex space-x-2 mt-5 mb-2">
          <Checkbox
            id="smsNotifications"
            onCheckedChange={(checked: boolean) => setSmsNotifications(checked)}
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
      {message && (
        <div className="text-red-500 mt-3 text-sm font-semibold">{message}</div>
      )}
      <Button
        disabled={isLoading}
        className="mt-4"
        onClick={createSubscription}
      >
        {isLoading ? "Please wait..." : "Create Subscription"}
      </Button>
     
    </div>
  );
}

export default StripeSubscriptionForm;
