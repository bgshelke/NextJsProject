"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

import useSWR from "swr";
import { useEffect } from "react";
import { fetcher } from "@/lib/helper";
import { toast } from "sonner";

const FormSchema = z.object({
  weeklyMealCustomize: z.boolean().default(true).optional(),
  weeklyMenuUpdates: z.boolean().default(true).optional(),
  promoAndOffers: z.boolean().default(true).optional(),
  walletUpdates: z.boolean().default(true).optional(),
  orderUpdates: z.boolean().default(true).optional(),
  giftCardUpdates: z.boolean().default(true).optional(),
  feedback: z.boolean().default(true).optional(),
  marketingEmails: z.boolean().default(true).optional(),
  newsAndAnnouncements: z.boolean().default(true).optional(),
  deliveryUpdate: z.boolean().default(true).optional(),
  subscriptionUpdates: z.boolean().default(true).optional(),
  surveyUpdates: z.boolean().default(true).optional(),
  SMSNotification: z.boolean().default(false).optional(),
  createdAt: z.date().default(new Date()).optional(),
});

const notificationSettings = [
  {
    name: "weeklyMealCustomize",
    label: "Remind me to customize my weekly meals",
    description: "Get a reminder to customize your weekly meals.",
  },
  {
    name: "weeklyMenuUpdates",
    label: "Weekly menu updates",
    description: "Get notified when new menu items are available.",
  },
  {
    name: "promoAndOffers",
    label: "Promo and offers",
    description: "Get notified about special promotions and discounts.",
  },
  {
    name: "walletUpdates",
    label: "Wallet updates",
    description: "Get notified when your wallet balance changes.",
  },
  {
    name: "orderUpdates",
    label: "Order updates",
    description: "Get notified about order updates and changes.",
  },
  {
    name: "giftCardUpdates",
    label: "Gift card updates",
    description: "Get notified when your gift card balance changes.",
  },
  {
    name: "feedback",
    label: "Feedback",
    description: "Get notified when your feedback is reviewed.",
  },
  {
    name: "marketingEmails",
    label: "Marketing emails",
    description:
      "Receive marketing emails about new products, features, and more.",
  },
  {
    name: "newsAndAnnouncements",
    label: "News and announcements",
    description: "Get notified about news and announcements.",
  },
  {
    name: "SMSNotification",
    label: "SMS Notification",
    description: "Get notified on your mobile number.",
  },
];

export default function ManageNotificationForm() {
  const { data, mutate, isLoading } = useSWR(
    "/api/customer/notifications/manage",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );
  const preferences = data?.data;
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preferences) {
      form.reset(preferences);
    }
  }, [preferences, form]);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/customer/notifications/manage",
        {
          method: "PUT",
          body: JSON.stringify({ data }),
        }
      );
      const res = await response.json();
      if (res.success) {
        toast.success(res.message);
        mutate("/api/customer/notifications/manage");
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again later");
      console.log("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-5 "
      >
        <div className="space-y-3 rounded-md border p-4 bg-white">
          {notificationSettings.map((setting) => (
            <FormField
              key={setting.name}
              control={form.control}
              name={setting.name as keyof z.infer<typeof FormSchema>}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="font-semibold text-base">
                      {setting.label}
                    </FormLabel>
                    <FormDescription>{setting.description}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>

        {(form.formState.isDirty || isLoading) && (
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? "Updating Preferences..." : "Save changes"}
          </Button>
        )}
      </form>
    </Form>
  );
}
