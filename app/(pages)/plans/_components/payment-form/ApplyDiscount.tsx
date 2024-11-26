"use client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Coupon } from "@/types/main";
import { Button } from "@/components/ui/button";
import { useDiscountStore } from "@/stores/useDiscountStore";

function ApplyDiscount({
  userAddress,
  addressId,
}: {
  userAddress: string;
  addressId?: string;
}) {
  const {
    discountType,
    discountValue,
    couponCode,
    couponApplied,
    setCouponData,
    removeDiscount,
  } = useDiscountStore();

  const [couponError, setCouponError] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [applying, setApplying] = useState(false);

  const couponSchema = z.object({
    coupon: z.string().min(1, {
      message: "Coupon is required.",
    }),
  });

  const form = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
  });

  useEffect(() => {
    if (couponApplied && couponCode) {
      setCouponData(couponCode, discountType, discountValue);
      form.setValue("coupon", couponCode);
    }
  }, [
    discountType,
    discountValue,
    couponCode,
    couponApplied,
    form,
    setCouponData,
  ]);

  const removeCoupon = useCallback(() => {
    removeDiscount();
    form.reset({ coupon: "" });
    setCouponMessage("");
  }, [removeDiscount, form]);

  useEffect(() => {
    removeCoupon();
  }, [removeDiscount, removeCoupon]);

  useEffect(() => {
    if (couponMessage) {
      const timer = setTimeout(() => {
        setCouponMessage("");
        setCouponError(false);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [couponMessage]);

  async function onSubmit(values: z.infer<typeof couponSchema>) {
    setApplying(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/coupon`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coupon: values.coupon,
            userAddress,
            addressId,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setCouponError(false);
        setCouponMessage("Coupon Applied Successfully");
        const couponData = data.data as Coupon;
        if (couponData.discountAmount !== 0) {
          setCouponData(
            couponData.code,
            "amount",
            couponData.discountAmount || 0
          );
        } else {
          setCouponData(
            couponData.code,
            "percentage",
            couponData.discountPercentage || 0
          );
        }
      } else {
        setCouponError(true);
        setCouponMessage(data.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div>
        <Collapsible className="w-full text-right">
          <CollapsibleTrigger>
            <h4 className="text-second underline font-semibold">
              Have a coupon code?
            </h4>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3 mt-3"
              >
                <FormField
                  control={form.control}
                  name="coupon"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            className="py-6 px-4 rounded-md"
                            placeholder="Enter Coupon Code"
                            {...field}
                          />
                          {couponApplied ? (
                            <Button
                              onClick={removeCoupon}
                              type="button"
                              className="bg-red-700 absolute right-[5px] top-[6px]"
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              type="submit"
                              className="absolute right-[5px] top-[6px]"
                            >
                              {applying ? "Applying..." : "Apply"}
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        {!couponError && (
                          <p className="text-green-700">{couponMessage}</p>
                        )}
                        {couponError && (
                          <p className="text-red-700">{couponMessage}</p>
                        )}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

export default ApplyDiscount;
