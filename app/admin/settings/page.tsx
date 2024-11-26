import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanSettings } from "./PlanSettings";
import TimeManagment from "./TimeManagment";
import Kitchens from "./Kitchens";


function page() {
  return (
    <ScrollArea className="h-full ">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        </div>
        <Tabs defaultValue="plan-options" className="w-full">
          <TabsList className="">
            <TabsTrigger value="plan-options" className="w-full p-2 px-6">
              Plan Options
            </TabsTrigger>

            <TabsTrigger value="time-managment" className="w-full p-2 px-6">
              Time & Opening Hours
            </TabsTrigger>

            <TabsTrigger value="kitchen" className="w-full p-2 px-6">
              Pickup Locations
            </TabsTrigger>
          </TabsList>
          <TabsContent value="plan-options">
            <PlanSettings />
          </TabsContent>
          <TabsContent value="time-managment" className="pt-3">
            <TimeManagment />
          </TabsContent>
          <TabsContent value="kitchen" className="pt-3">
            <Kitchens />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

export default page;
