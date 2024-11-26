import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

function NoActiveSubscriptionPage() {
  return (
    <div className="flex items-center justify-center flex-col h-screen gap-y-4">
      <h1 className="text-2xl font-semibold">You currently do not have any active subscription</h1>
      <Button className="" asChild>
        <Link href="/plans">Subscribe Now</Link>
      </Button>
    </div>
  );
}

export default NoActiveSubscriptionPage;
