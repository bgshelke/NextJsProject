"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UpdatePaymentInfo } from "@/app/_serverActions/main";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
export type weekOptions = "SECOND" | "THIRD";


export function ManagePaymentInfo() {
  const router = useRouter();
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const managePayment = async () => {
    try {
      setIsLinkLoading(true);
      const portalLink = await UpdatePaymentInfo();
      setIsLinkLoading(false);
      router.push(portalLink);
    } catch (error) {
      setIsLinkLoading(false);
      toast.error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  };
  return (
    <Button onClick={managePayment}>
      {isLinkLoading ? "Please wait..." : "Manage Payment Info"}
    </Button>
  );
}
