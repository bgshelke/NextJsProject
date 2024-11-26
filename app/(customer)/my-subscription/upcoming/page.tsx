import React from "react";


import UpcomingSubscription from "../_components/UpcomingSubscription";
import { getTimeSlots } from "@/app/_serverActions/main";

export const metadata = {
  title: "My Subscription",
  description: "View and manage your subscription.",
};

async function page() {
  const timeSlots = await getTimeSlots();

  return (
    <>
      <UpcomingSubscription timeSlots={timeSlots?.data || []} />
    
    </>
  );
}

export default page;
