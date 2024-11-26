"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function ResetPasswordForm({ token }: { token: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(true);
  const router = useRouter();

  const resetPasswordSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  });

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    async function checkTokenExpiration() {
      if (!token || token.length < 30) {
        setIsExpired(true);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/auth/reset-password?token=${token}`,
        {
          method: "GET",
        }
      );
      const res = await response.json();
      setIsExpired(!res.success);
    }
    checkTokenExpiration();
  }, [token]);

  const onSubmit = async (data: z.infer<typeof resetPasswordSchema>) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/auth/reset-password`,
        {
          method: "POST",
          body: JSON.stringify({ ...data, token }),
        }
      );
      const res = await response.json();
      if (res.success) {
        toast.success("Password reset successfully");
        router.push("/?login=true");
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Error while reset password");
      console.log(error);
    }
  };

  if (isExpired || !token || token.length < 30) {
    return <InvalidTokenExpired />;
  }

  return (
    <div className="w-full">
      <div className="text-center space-y-3 max-w-lg mx-auto mb-4">
        <h1 className="text-3xl md:text-4xl font-semibold">
          Reset your <span className="text-second dw-underline1">password</span>
        </h1>
        <p className="text-gray-700 max-w-xs mx-auto">
          Enter your new password below to reset your password
        </p>
      </div>

      <div className="max-w-[350px] mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 ">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password:</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="New Password"
                      className="p-6 rounded-full bg-white"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password:</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Confirm Password"
                      className="p-6 rounded-full bg-white"
                      type="password"
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
          <Link href="/login" className="underline">
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordForm;

function InvalidTokenExpired() {
  return (
    <div className="max-w-lg mx-auto text-center mt-12">
      <h1 className="text-2xl md:text-3xl font-semibold">
        Password reset link has expired
      </h1>
      <p className="text-gray-700 max-w-xs mx-auto my-2">
        The link you used is no longer valid. You can request a new link to be
        sent to.
      </p>
      <Button asChild className="mt-4">
        <Link href="/login/reset-password">Request a new link</Link>
      </Button>
      
    </div>
  );
}