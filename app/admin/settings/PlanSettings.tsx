"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { planSettingsSchema, PlanSettingsInput } from "@/types/zod/AdminSchema";
import useSWR from "swr";
import { fetcher } from "@/lib/helper";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function PlanSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const { data: planOptions } = useSWR(
    "/api/admin/settings/plan-options",
    fetcher
  );

  const planOptionsData = planOptions?.data;

  const form = useForm<PlanSettingsInput>({
    resolver: zodResolver(planSettingsSchema),
  });
  useEffect(() => {
    if (planOptionsData) {
      form.reset({
        deliveryFees: planOptionsData?.deliveryFees?.toString(),
        maxAmountForFreeDelivery:
          planOptionsData?.maxAmountForFreeDelivery?.toString(),
        disableActionAndEmailToSend:
          planOptionsData?.disableActionAndEmailToSend?.toString(),
        timeForPreparing: planOptionsData?.timeForPreparing?.toString(),
        minQtyOfItem: planOptionsData?.minQtyOfItem?.toString(),
        maxQtyOfItem: planOptionsData?.maxQtyOfItem?.toString(),
        loopMenu: planOptionsData?.menuLoop?.toString(),
        timeToStopAction: planOptionsData?.timeToStopAction?.toString(),
      });
    }
  }, [planOptionsData, form]);
  async function onSubmit(values: PlanSettingsInput) {
    try {
      setIsSaving(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/admin/settings/plan-options",
        {
          method: "POST",
          body: JSON.stringify(values),
        }
      );
      const data = await response.json();
      setIsSaving(false);
      if (data.success) {
        toast.success("Plan options updated successfully");
      } else {
        toast.error("Error updating plan options");
      }
    } catch (error) {
      console.log(error);
      toast.error("Error updating plan options");
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-5">
      <h2 className="text-xl font-semibold tracking-tight">Plan Options</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Here you can manage the plan options.
      </p>
      <div className="mt-5 bg-white border rounded-md p-6 ">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deliveryFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Fees</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Delivery Fees"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxAmountForFreeDelivery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Amount For Free Delivery</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Max Amount For Free Delivery"
                        type="number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeForPreparing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time For Preparing</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Time For Preparing eg 4 or 5"
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="disableActionAndEmailToSend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email To Send Before Time</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Disable Action And Email To Send eg 4 or 5"
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minQtyOfItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Qty Of Item</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Min Qty Of Item"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxQtyOfItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Qty Of Item</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Max Qty Of Item"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loopMenu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loop Menu</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Loop Menu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeToStopAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time To Stop Action</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="Loop Menu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.formState.isDirty && (
              <Button type="submit" disabled={isSaving} className="mt-4">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </form>
        </Form>

        <p className="text-sm  mt-4 text-red-500 font-semibold">
          Note: This settings will be very important for the app. Please be
          careful while changing them. and make sure to test the app after
          changing them.
        </p>
      </div>
    </div>
  );
}
