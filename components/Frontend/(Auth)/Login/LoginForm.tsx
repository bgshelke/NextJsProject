"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoginInput, LoginSchema } from "@/types/zod/AuthSchema";
import { toast } from "sonner";
import { useLoginModal } from "@/stores/useOptions";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  let decodedCallbackUrl = callbackUrl ? decodeURIComponent(callbackUrl) : null;
  if (!decodedCallbackUrl){
    decodedCallbackUrl = window.location.href;
  }
  const router = useRouter();

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });
  const { setLoginModalOpen } = useLoginModal();

  async function onSubmit(values: LoginInput) {
    try {
      toast.promise(
        signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        }).then(async (result) => {
          if (result?.ok) {
            return result;
          } else {
            throw new Error(result?.error || "Login Failed");
          }
        }),
        {
          loading: "Logging in...",
          success: (data) => {
            if (data) {
              setLoginModalOpen(false);
              return `Welcome Back`;
            }
          },
          error: (error) => error.message || "Failed to login",
        }
      );
    } catch (error) {
      toast.error("Something went wrong. Please try again later");
      console.log("error while login", error);
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email:</FormLabel>
              <FormControl>
                <Input
                  placeholder="Email"
                  className="p-6 rounded-md bg-white"
                  type="eamil"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="inline-flex justify-between items-center w-full">
                <FormLabel>Password:</FormLabel>
                <Link
                  onClick={() => setLoginModalOpen(false)}
                  href="/reset-password"
                  className="font-semibold text-sm underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <FormControl>
                <Input
                  placeholder="Password"
                  className="p-6 rounded-md bg-white"
                  type="password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button
          className="btn-primary w-full mt-2 hover:bg-first"
          type="submit"
        >
          Login
        </button>
      </form>
    </Form>
  );
}

export default LoginForm;
