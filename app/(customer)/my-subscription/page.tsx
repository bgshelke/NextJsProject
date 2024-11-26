import React from "react";
import ActiveSubscription from "./_components/ActiveSubscription";
import { getTimeSlots } from "@/app/_serverActions/main";

export const metadata = {
  title: "My Subscription",
  description: "View and manage your subscription.",
};

async function page() {
  const timeSlots = await getTimeSlots();

  return (
    <>
      <ActiveSubscription timeSlots={timeSlots?.data || []} />
    </>
  );
}

export default page;
