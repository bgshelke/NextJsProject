"use client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import useSWR from "swr";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  CustomerProfileInput,
  customerProfileSchema,
} from "@/types/zod/CustomerSchema";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher } from "@/lib/helper";
import { Customer } from "@/types/main";
import { toast } from "sonner";

export function ProfileCard() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { update } = useSession();


  const { data, isLoading: isLoadingProfile , mutate: mutateProfile } = useSWR("/api/customer/profile", fetcher, {
    revalidateOnFocus: false,
  });


  const userProfile = data?.data as Customer || {};

  const form = useForm<CustomerProfileInput>({
    resolver: zodResolver(customerProfileSchema),
  });


  useEffect(() => {
    if (userProfile || !isLoadingProfile) {
      form.setValue("firstName", userProfile.firstName || "");
      form.setValue("lastName", userProfile.lastName || "");
      form.setValue("email", userProfile.email || "");
      form.setValue("phone", userProfile.phone || "");
    }
  }, [userProfile, form, isLoadingProfile]);

  async function onSubmit(values: CustomerProfileInput) {
    const hasChanged =
      values.firstName !== userProfile.firstName ||
      values.lastName !== userProfile.lastName ||
      values.email !== userProfile.email ||
      values.phone !== userProfile.phone;

    if (!hasChanged) {
      setIsEditing(false);
      return;
    }

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/customer/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );
      setIsLoading(true);
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message)
        return;
      }

      if (response.ok) {
        toast.success(data.message)
        setIsEditing(false);
        update({
          name: values.firstName + " " + values.lastName,
        });
        mutateProfile();
      }
    } catch (error) {
      console.log(error);
      toast.error("Error while updating profile")
    } finally {
      setIsLoading(false);
    }
  }

  function ChangeEditing() {
    setIsEditing(!isEditing);
  }

  return (
    <div>

      {isLoadingProfile ? <Skeleton className="h-48 w-full" /> :
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid border p-3 md:p-6 rounded-md gap-4 md:gap-6  md:grid-cols-2 ">
            <div>
              <h4 className="font-semibold text-gray-500 mb-1 text-sm">
                First Name
              </h4>
              {isEditing ? (
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="First Name" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Update your first name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p>{userProfile?.firstName}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-500 mb-1 text-sm">
                Last Name
              </h4>
              {isEditing ? (
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Last Name" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Update your last name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p>{userProfile?.lastName}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-500 mb-1 text-sm">
                Email Address
              </h4>
              <div
                className={`inline-flex items-center gap-x-2 ${
                  isEditing ? "text-gray-500" : "text-black"
                }`}
              >
                {userProfile?.email}{" "}
                <Badge
                  variant={"outline"}
                  className={`${
                    userProfile?.user?.isVerified
                      ? "text-green-800"
                      : "text-red-500"
                  }`}
                >
                  {userProfile?.user?.isVerified ? "Verified" : "Not Verified"}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-500 mb-1 text-sm">
                Phone Number
              </h4>
              {isEditing ? (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="E.g +19543214567"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Update your phone no.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p>{userProfile?.phone ? userProfile?.phone : "Not set"}</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-gray-500 mb-1 text-sm">
                Account Created On
              </h4>
              <p className={`${isEditing ? "text-gray-500" : "text-black"}`}>
                {new Date(userProfile?.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-500 mb-1 text-sm">
                Customer ID
              </h4>
              <p className={`${isEditing ? "text-gray-500" : "text-black"}`}>
                #{userProfile?.customerUniqueId}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {isEditing && (
              <Button type="submit">
                {isLoading ? "Please wait..." : "Save Changes"}
              </Button>
            )}
            <Button
              type="button"
              onClick={ChangeEditing}
              variant={isEditing ? "destructive" : "default"}
            >
              <Pencil
                size="16"
                className="mr-1 inline-block fill-white"
                strokeWidth={0}
              />{" "}
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </form>
      </Form>
}
    </div>
  );
}
