"use client";
import { fetcher } from "@/lib/helper";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  SubscriptionCancelInput,
  subscriptionCancelSchema,
} from "@/types/zod/CustomerSchema";
import { Check, CircleAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { getUpcomingWeeks } from "@/lib/helper/dateFunctions";
import { useRouter } from "next/navigation";
export type weekOptions = "SECOND" | "THIRD";

export function SubscriptionPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR(
    process.env.NEXT_PUBLIC_URL + "/api/subscription",
    fetcher
  );
  const [isPausing, setIsPausing] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");

  const form = useForm<SubscriptionCancelInput>({
    resolver: zodResolver(subscriptionCancelSchema),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;

  const subscriptionData = data?.data;


  if(!subscriptionData && isLoading) return <div className="text-center text-gray-600 text-sm bg-white p-6 rounded-md border">Loading...</div>;

  if (!subscriptionData) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-3">Manage Subscription</h1>
        <div className="bg-white p-6 rounded-md border text-center">
          <h1 className="text-sm text-gray-600 font-medium mb-3">
            You don&apos;t have any subscription.
          </h1>
          <Button asChild>
            <Link href="/plans" className="text-primary font-medium">
              Create a Subscription
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCancellationDisabled = subscriptionData.cancel_at_period_end;
  async function onSubmit(
    data: SubscriptionCancelInput,
    cancelNow: boolean = false
  ) {
    const reason = data.reason === "Other" ? data.otherReason : data.reason;
    if (isCancellationDisabled && !cancelNow) {
      toast.error("You have already requested for cancellation");
      return;
    }
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_URL
        }/api/subscription?cancelInPeriod=${!cancelNow}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        if(cancelNow){
          router.push("/order-history")
        }else{
          setIsDialogOpen(false);
        }
        mutate(process.env.NEXT_PUBLIC_URL + "/api/subscription");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again.");
    }
  }

  const stopCancellation = async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/subscription",
        {
          method: "PUT",
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);

        mutate(process.env.NEXT_PUBLIC_URL + "/api/subscription");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const currentPeriodStart = subscriptionData.current_period_start;
  

 

  const handlePauseSubscription = async (
    action: "PAUSE_UPCOMING" | "RESUME_UPCOMING"
  ) => {
    setIsPausing(true);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/subscription/pause",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        mutate(process.env.NEXT_PUBLIC_URL + "/api/subscription");
       
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsPausing(false);
    }
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-semibold">Manage Subscription</h1>
      </div>

      <div className="bg-white p-6 rounded-md border">
        <div className="flex max-sm:flex-col sm:flex-row max-sm:gap-3 justify-between ">
          <div>
            <h2 className="text-base font-semibold">Subscription Status</h2>
            <p className="text-sm text-green-700 font-semibold capitalize">
              {subscriptionData.pause_collection ? <span className="text-orange-600">Paused</span> : subscriptionData.status}
            </p>
            {subscriptionData.pause_collection?.resumes_at && (
                        <p className="mt-1 text-gray-600 text-sm">
                          Your subscription will be resumed on{" "}
                          {format(
                            new Date(
                              subscriptionData.pause_collection?.resumes_at *
                                1000
                            ),
                            "EEEE, MMMM d, yyyy"
                          )}
                        </p>
                      )}
          </div>
          <div className="flex space-x-3">
            {!subscriptionData.cancel_at_period_end && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-sm h-0 text-orange-600 font-medium">
                    {subscriptionData.pause_collection
                      ? "Resume Subscription"
                      : "Pause Subscription"}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are your sure you want to{" "}
                      {subscriptionData.pause_collection ? "resume " : "pause "}
                      your subscription?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                     
                      <p className="mt-3 font-semibold text-gray-900">
                        {subscriptionData.pause_collection
                          ? "Note: You can resume your subscription before the start of the week."
                          : "Note: You can pause your subscription before 24 hours of the week."}
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handlePauseSubscription(subscriptionData.pause_collection ? "RESUME_UPCOMING" : "PAUSE_UPCOMING")}
                      disabled={isPausing}
                    >
                      {isPausing
                        ? "Please wait..."
                        : subscriptionData.pause_collection
                        ? "Resume Subscription"
                        : "Pause Upcoming Subscription"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {!subscriptionData.cancel_at_period_end && (
              <Link
                href="/my-subscription/upcoming"
                className="text-sm text-primary font-medium"
              >
                Edit Upcoming Order
              </Link>
            )}
            {!subscriptionData.cancel_at_period_end && (
              <button
                className="text-sm h-0 text-gray-600 font-medium"
                onClick={() => setIsDialogOpen(true)}
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <h2 className="text-base font-semibold">Subscription Details</h2>
          <div className="space-y-1 mt-2">
            <p className="text-sm text-gray-600 font-medium">
              Subscription Created on:{" "}
              {new Date(subscriptionData.created).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              Subscription Current Week Date:{" "}
              {new Date(
                subscriptionData.current_period_start
              ).toLocaleDateString()}
            </p>
            {!subscriptionData.cancel_at_period_end && (
              <p className="text-sm text-gray-600 font-medium">
                Next Billing Date:{" "}
                {new Date(subscriptionData.nextBilling).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {isCancellationDisabled && (
          <div className="border-2 border-red-700 p-4 mt-6 rounded-md text-sm text-red-700 flex justify-between items-center">
            <div>
              <CircleAlert className="w-4 h-4 text-red-700 inline-block" /> Your
              subscription is scheduled to be cancelled at{" "}
              {new Date(subscriptionData?.cancel_at).toLocaleString("en-US", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </div>

            <Button variant="destructive" onClick={stopCancellation}>
              Stop Cancellation
            </Button>
          </div>
        )}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription className="text-sm text-gray-900 font-semibold mt-4">
              You can only cancel your subscription before 24 hours of the start
              of the week.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => onSubmit(data, false))}
              className="space-y-2"
            >
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Please let us know the reason for cancellation:
                    </FormLabel>
                    <Select
                      onValueChange={(val) => {
                        setSelectedReason(val);
                        field.onChange(val);
                      }}
                      defaultValue={field.value}
                      value={selectedReason}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Too Expensive">
                          Too Expensive
                        </SelectItem>
                        <SelectItem value="Not Using Enough">
                          Not Using Enough
                        </SelectItem>
                        <SelectItem value="Found a Better Service">
                          Found a Better Service
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedReason === "Other" && (
                <FormField
                  control={form.control}
                  name="otherReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Reason</FormLabel>

                      <Textarea
                        className="mt-2 w-full"
                        placeholder="Please specify"
                        {...field}
                      />

                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="mt-4 flex justify-end pt-3 items-center gap-2">
               {subscriptionData.isCancelableNow ? (<Button
                  className="bg-gray-800 text-white"
                  type="button"
                    onClick={() => onSubmit(form.getValues(), true)}
                  >
                    Cancel Subscription
                  </Button>
                ) : (
                  <Button variant="destructive" type="submit">
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
