"use client";
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
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast, Toaster } from "sonner";
import { z } from "zod";
import ResetPasswordForm from "./ResetPasssword";

function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);
  const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email"),
  });

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/auth/reset-password`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      const res = await response.json();
      setIsLoading(false);
      if (res.success) {
        toast.success("Reset password link sent to your email");
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Error while reset password");
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (token) {
    return <ResetPasswordForm token={token} />;
  }

  return (
    <div className="w-full mt-12">
      <div className="text-center space-y-3 max-w-lg mx-auto mb-4">
        <h1 className="text-3xl md:text-4xl font-semibold">
          Forgot your{" "}
          <span className="text-second dw-underline1">password</span>?
        </h1>
        <p className="text-gray-700 max-w-xs mx-auto">
          Enter your email below to reset your password
        </p>
      </div>

      <div className="max-w-[350px] mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 ">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email:</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Email"
                      className="p-6 rounded-full bg-white"
                      type="eamil"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button
              className="btn-secondary w-full"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : "Reset Password"}
            </button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          <Link href="/" className="underline">
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
