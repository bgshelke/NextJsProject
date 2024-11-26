"use client";
import React from "react";
import { DateRange } from "react-day-picker";

import CustomerTable from "./CustomerTable";
function page() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold">Customers</h1>
          <p>Here you can manage your customers</p>
        </div>
      </div>
      <CustomerTable />
    </div>
  );
}

export default page;
