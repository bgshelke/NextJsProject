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
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BillingInfo, Item } from "@/types/main";
import { Label } from "@/components/ui/label";
import { mutate } from "swr";
import { Checkbox } from "@/components/ui/checkbox";
import { useWallet } from "@/contexts/WalletContext";
import { getPricingLabel } from "@/lib/helper";
import { Button } from "@/components/ui/button";
import Alert from "@/components/ui/customAlert";
import { useSession } from "next-auth/react";
import useAdditionalDays from "@/stores/additionalDayStore";
import { X } from "lucide-react";
function AddExtraItemCheckout({
  subOrderId,
  additionalItems,
  orderId,
  billingInfo,
}: {
  subOrderId: string;
  additionalItems: Item[];
  orderId: string;
  billingInfo: BillingInfo;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { wallet, useWalletCredit, setUseWalletCredit } = useWallet();
  const { setDate, setOrderId, clearFinalOrder } = useAdditionalDays();
  const [showAlert, setShowAlert] = useState(false);
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


  const handleSubmit = async (isUpcoming: boolean) => {
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

    if (!elements) {
      setError("Card element not found");
      setIsLoading(false);
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
        process.env.NEXT_PUBLIC_URL + "/api/checkout/add-ons",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id,
            subOrderId,
            additionalItems,
            useWalletCredit,
            orderId,
            billingInfo,
            saveUpcoming: isUpcoming,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        router.push(`/my-subscription`);
        if (isUpcoming) {
          mutate(
            `/api/customer/subscription/orders?orderID=${data.orderId}&status=upcoming`
          );
        }
        setOrderId("");
        setUseWalletCredit(false);
        clearFinalOrder();
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
    <>
      <div className="bg-gray-100 p-6 mt-6 rounded-sm">
        <div className="">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-800">Payment</h1>
          </div>
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
              onCheckedChange={(checked) =>
                setUseWalletCredit(checked === true)
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

          <Button
            disabled={isLoading}
            className="mt-4"
            onClick={handleShowAlert}
          >
            {isLoading ? "Please wait..." : "Place Order"}
      </Button>

          {error && error?.length !== 0 && (
            <Alert message={error} variant="error" className="mt-2" />
          )}
                <Dialog open={showAlert} onOpenChange={setShowAlert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Would you like to add this item to your upcoming orders?</DialogTitle>
            <DialogDescription>
              This will add this item to your upcoming orders.
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
        </div>
      </div>
    </>
  );
}

export default AddExtraItemCheckout;
