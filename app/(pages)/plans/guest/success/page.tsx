"use client";
import { Button } from "@/components/ui/button";
import { usePaymentSuccess } from "@/stores/useOptions";
import { Check } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import React from "react";
import { getPricingLabel } from "@/lib/helper";
import Link from "next/link";

function page() {
  const router = useRouter();
  const { paymentSuccess, paymentData } = usePaymentSuccess();
  const orderData = paymentData as any;

  if (!paymentSuccess) {
    return notFound();
  }
  
  return (
    <div className="bg-primary text-white border-primary-500 border-2 rounded-lg flex justify-center items-center p-12 flex-col gap-6">
      <Check className="w-16 h-16 text-primary-500" />
      <div className="my-3 text-center">
        <h1 className="text-lg font-semibold">Payment Successful</h1>
        <p>Your order has been placed successfully.</p>
      </div>

      <p className="text-center">
        Order ID: {orderData?.orderId}<br/>
        Amount Paid: {getPricingLabel(orderData?.amountPaid)}<br/>
      </p>

      <Button
        variant={"outline"}
        className="text-primary"
        asChild
      >
        <Link href="/">Go to Home</Link>
      </Button>
    </div>
  );
}

export default page;
