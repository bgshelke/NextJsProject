"use client";
import React from "react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ChangePasswordInput,
  changePasswordSchema,
} from "@/types/zod/CustomerSchema";
import { toast } from "sonner";


function ChangeUserPassword() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function onSubmit(values: ChangePasswordInput) {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/customer/profile/change-password",
        {
          method: "POST",
          body: JSON.stringify(values),
        }
      );
      const data = await response.json();
      if (!data.success) {
        toast.error(data.message);
       
      } else {
        toast.success(data.message);
        
        form.reset({
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      }
    } catch (error) {
      toast.error("An error occurred.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <div className="container mx-auto p-2 ">
      <h1 className="text-xl font-semibold mb-4">Change Password</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Current Password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="New Password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Confirm New Password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Changing Password..." : "Change Password"}
            </Button>
          </form>
        </Form>
        <div>
          <h1 className="text-lg font-semibold mb-2">Change Password</h1>
          <p className="text-sm">
            To change your password, please enter your current password and the
            new password you want to set.
          </p>
          <p className="text-sm font-semibold mb-2 mt-4">
            Your password must meet the following requirements:
          </p>
          <ul className="list-disc list-inside text-sm text-green-700">
            <li>Your password must be at least 8 characters long.</li>
            <li>Your password must contain at least one uppercase letter.</li>
            <li>Your password must contain at least one lowercase letter.</li>
            <li>Your password must contain at least one number.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ChangeUserPassword;
