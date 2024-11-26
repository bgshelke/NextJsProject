import React from "react";
import { ManagePaymentInfo } from "./ManagePayment";
import { SubscriptionPage } from "./ManageSubscription";
function Page() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Manage Payment</h1>
      <div className="bg-white p-6 rounded-md border  mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold">Payment Info</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Update and manage your payment information.
          </p>
        </div>
        <ManagePaymentInfo />
      </div>
      <SubscriptionPage />
    </div>
  );
}

export default Page;
