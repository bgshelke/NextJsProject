import React from "react";
import CreateNewDay from "../_components/CreateNewDay";
import { getTimeSlots } from "@/app/_serverActions/main";

export const metadata = {
  title: "Create Order",
  description: "Create a new order.",
};


async function page() {
  const timeSlots = await getTimeSlots();

  return (
    <>
      <CreateNewDay timeSlots={timeSlots?.data || []} />
    </>
  );
}

export default page;
