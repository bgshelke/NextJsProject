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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BillingInfo } from "@/types/main";
import { Label } from "@/components/ui/label";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "next-auth/react";
import Alert from "@/components/ui/customAlert";
import useAdditionalDays from "@/stores/additionalDayStore";
import { useWallet } from "@/contexts/WalletContext";
import { getPricingLabel } from "@/lib/helper";
import { toast } from "sonner";

function AddDayCheckout({
  selectedDate,
  orderId,
  slotId,
  items,
  billingInfo,
  totalAmount,
}: {
  selectedDate: Date;
  orderId: string;
  slotId: string;
  items: {
    itemId: string;
    quantity: number;
  }[];
  billingInfo: BillingInfo;
  totalAmount: number;
}) {
  const [showAlert, setShowAlert] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setDate, setOrderId } = useAdditionalDays();
  const { wallet, useWalletCredit, setUseWalletCredit } = useWallet();

  const handleSubmit = async (saveOnUpcoming: Boolean) => {
    setIsLoading(true);
    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }
    setError(null);
    setIsLoading(true);
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

    if (!elements) {
      setError("Card element not found");
      setIsLoading(false);
      return;
    }

    try {
      const { error: stripeError, paymentMethod } =
        await stripe?.createPaymentMethod({
          type: "card",
          card: cardNumberElement,
          billing_details: {
            name: session?.user?.name,
            email: session?.user?.email,
            address: {
              line1: billingInfo.addressLine1,
              city: billingInfo.city,
              state: billingInfo.state,
              postal_code: billingInfo.zipCode,
              country: "US",
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
        process.env.NEXT_PUBLIC_URL + "/api/checkout/create-new-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            billingInfo,
            selectedDate,
            slotId,
            items,
            saveUpcoming: saveOnUpcoming,
            paymentMethodId: paymentMethod.id,
            useWalletCredit,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        router.push(`/my-subscription`);
        setOrderId("");
        setUseWalletCredit(false);
        
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

  const handleShowAlert = () => {
    const cardNumberElement = elements?.getElement(CardNumberElement);
    const cardExpiryElement = elements?.getElement(CardExpiryElement);
    const cardCvcElement = elements?.getElement(CardCvcElement);

    if (!cardNumberElement) {
      setError("Card number is required");
      setIsLoading(false);
      return;
    } else if (!cardExpiryElement) {
      setError("Card expiry is required");
      setIsLoading(false);
      return;
    } else if (!cardCvcElement) {
      setError("Card cvc is required");
      setIsLoading(false);
      return;
    }
    if (!elements) {
      setError("Card element not found");
      setIsLoading(false);
      return;
    }

    setShowAlert(true);
  };

  return (
    <div className="bg-gray-50 p-6 mt-6 rounded-sm">
      <h1 className="text-lg font-semibold text-gray-800">Payment</h1>
      <p className="text-sm text-gray-500 mb-4">
        Please enter your card details to complete the payment.
      </p>

      <Label htmlFor="cardNumber" className="text-sm text-gray-800">
        Card Number <span className="text-red-500">*</span>
      </Label>
      <CardNumberElement
        id="cardNumber"
        className="p-3 border border-gray-300 bg-white mt-1 rounded-sm"
        options={{ showIcon: true }}
      />
      <div className="flex mt-2 gap-3 max-sm:mb-2">
        <div className="w-full">
          <Label htmlFor="cardExpiry" className="text-sm text-gray-800">
            Expiry <span className="text-red-500">*</span>
          </Label>
          <CardExpiryElement
            className="p-3 border border-gray-300 w-full bg-white rounded-sm"
            id="cardExpiry"
          />
        </div>

        <div className="w-full">
          <Label htmlFor="cardCvc" className="text-sm text-gray-800">
            CVC <span className="text-red-500">*</span>
          </Label>
          <CardCvcElement
            className="p-3 border border-gray-300 w-full  bg-white rounded-sm"
            id="cardCvc"
          />
        </div>
      </div>

      <div className="items-top flex space-x-2 mt-4">
        <Checkbox
          id="useWallet"
          checked={useWalletCredit}
          disabled={wallet <= 0}
          onCheckedChange={(checked) => setUseWalletCredit(checked === true)}
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

      <Button
            disabled={isLoading}
            className="mt-4"
        onClick={handleShowAlert}
      >
        {isLoading ? "Please wait..." : "Place Order"}
      </Button>
      <Dialog open={showAlert} onOpenChange={setShowAlert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Want to add this day to upcoming orders?</DialogTitle>
            <DialogDescription>
              This will add this day to your upcoming orders.
              <p className="mt-4 text-sm font-medium text-gray-900">
                Note: Clicking the 'Yes' button will ensure these changes are
                applied to your future order as well.
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  className="bg-white border border-gray-600 text-black hover:bg-gray-100 "
                  onClick={() => {
                    setShowAlert(false);
                    handleSubmit(false);
                  }}
                >
                  No Thanks
                </Button>
                <Button
                  className="bg-primary text-white"
                  onClick={() => {
                    setShowAlert(false);
                    handleSubmit(true);
                  }}
                >
                  Yes, Add to Upcoming
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {error && error?.length !== 0 && (
        <Alert message={error} variant="error" className="mt-2" />
      )}
    </div>
  );
}

export default AddDayCheckout;
