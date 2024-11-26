"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import useSWR, { mutate } from "swr";
import { ResponseType } from "@/types/main";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { format } from "date-fns";


import { Popover } from "@radix-ui/react-popover";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CouponInputSchema, CouponSchema } from "@/types/zod/couponSchema";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { CouponsTable } from "./CouponTable";
import { CalendarIcon } from "lucide-react";

const generateRandomCode = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 5)
  );
};
const fetcher = (url: string) => fetch(url).then((res) => res.json());
function MealsPage() {
  const [open, setOpen] = useState(false);
  const { data, error, isLoading } = useSWR<ResponseType>(
    process.env.NEXT_PUBLIC_URL + "/api/admin/coupons",
    fetcher
  );

  const form = useForm<CouponInputSchema>({
    resolver: zodResolver(CouponSchema),
  });

  async function onSubmit(data: CouponInputSchema) {
    const createCouponPromise = new Promise((resolve, reject) => {
      fetch(process.env.NEXT_PUBLIC_URL + "/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then(async (response) => {
          const res = await response.json();
          if (response.ok) {
            resolve(res);
            setOpen(false);
            form.reset();
            mutate(process.env.NEXT_PUBLIC_URL + "/api/admin/coupons");
          } else {
            reject(new Error(res.message || "Failed to create coupon"));
          }
        })
        .catch((error) => {
          reject(new Error(error.message));
        });
    });

    toast.promise(createCouponPromise as Promise<ResponseType>, {
      loading: "Creating Coupon...",
      success: (res) => {
        return res.message;
      },
      error: (error) => error.message,
    });

    createCouponPromise.catch((error) => {
      toast.error("Error while creating coupon");
      console.log("Error while creating coupon", error);
    });
  }

  const getRandomCode = () => {
    const code = generateRandomCode();
    form.setValue("code", code.toUpperCase());
  };

  return (
    <ScrollArea className="h-full ">
      <div className="flex-1 space-y-4 p-4 md:p-8 ">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
            <p className="text-sm text-muted-foreground">
              Coupons are used to give discounts to customers.
            </p>
          </div>
          <div>
            <Button onClick={() => setOpen(true)}>Add New Coupon</Button>
          </div>
        </div>
        <div>
          {!error ? (
            <CouponsTable data={data?.data} isLoading={isLoading} />
          ) : (
            "Error while fetching data"
          )}
        </div>
      </div>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
            <DialogDescription>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-3 mt-3"
                >
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Coupen Code <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <Input placeholder="Enter Your Code" {...field} />
                            <Button
                              type="button"
                              variant={"secondary"}
                              onClick={() => getRandomCode()}
                            >
                              Generate
                            </Button>
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="coupenType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>
                          Select Coupon Type{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-3"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="percentage" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Percentage(%)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="amount" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Amount($)
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-3 items-center ">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>
                            Amount <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="w-full"
                              placeholder="Enter Amount"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="addressUsageLimit"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>
                            Address Usage Limit
                            <span className="text-gray-500 text-xs">
                              {"(optional)"}
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="w-full"
                              placeholder="Same Address Usage Limit"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 items-center">
                    <FormField
                      control={form.control}
                      name="maxUsageLimit"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>
                            Max Usage Limit
                            <span className="text-gray-500 text-xs">
                              {"(optional)"}
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Max Usage Limit"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expiry"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="mb-[3px]">
                            Expiry Date
                            <span className="text-gray-500 text-xs">
                              {"(optional)"}
                            </span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-[240px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date: Date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit">Create Coupon</Button>
                </form>
              </Form>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

export default MealsPage;
