"use client";
import Steps from "@/components/Frontend/Steps";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ResponseType } from "@/types/main";
import {
  EmailVerificationSchema,
  SignupInput,
  SignupSchema,
} from "@/types/zod/AuthSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useFinalOrderStore } from "@/stores/plan/usePlanStore";
import { User } from "lucide-react";
import SocialLogin from "@/components/Frontend/(Auth)/Login/SocialLogin";
import { useLoginModal } from "@/stores/useOptions";
function RegisterPage() {
  const [showVerification, setShowVerification] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [timer, setTimer] = useState(60);
  const [registering, setRegistering] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimeout, setResendTimeout] = useState(false);
  const { setLoginModalOpen } = useLoginModal();
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnUrl = searchParams.get("return");

  const session = useSession();
  const { planType } = useFinalOrderStore();
  if (
    session.status === "authenticated" &&
    session.data?.user.role === "CUSTOMER"
  ) {
    if (returnUrl) {
      router.push("/plans/checkout");
    } else {
      router.push("/");
    }
  }

  const form = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
  });

  const verificationForm = useForm<z.infer<typeof EmailVerificationSchema>>({
    resolver: zodResolver(EmailVerificationSchema),
  });

  async function onSubmit(data: SignupInput) {
    setRegistering(true);
    const signupPromise = new Promise((resolve, reject) => {
      fetch(process.env.NEXT_PUBLIC_URL + "/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then(async (response) => {
          setRegistering(false);
          const res = await response.json();
          if (response.ok) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("return", "true");
            resolve(res);
          } else {
            reject(new Error(res.message || "Failed to sign up"));
          }
        })
        .catch((error) => {
          console.log(error);

          reject(new Error("Error while creating Account: " + error.message));
          setRegistering(false);
        });
    });

    toast.promise(signupPromise as Promise<ResponseType>, {
      loading: "Creating Account...",
      success: (res) => {
        setShowVerification(true);
        setTimeout(() => {
          toast("Please verify your account.");
        }, 2500);
        return res.message;
      },
      error: (error) => error.message,
    });

    signupPromise.catch((error) =>
      console.error("Error while creating Account", error)
    );
  }

  async function onVerify(data: z.infer<typeof EmailVerificationSchema>) {
    setVerifying(true);
    const verifyPromise = new Promise((resolve, reject) => {
      fetch(process.env.NEXT_PUBLIC_URL + "/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          email: form.getValues("email"),
          verifyCode: data.verifyCode,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then(async (response) => {
          setVerifying(false);
          const res = await response.json();
          if (response.ok) {
            const LoginResponse = await signIn("credentials", {
              email: form.getValues("email"),
              password: form.getValues("password"),
            });
            if (LoginResponse?.ok) {
              resolve(res);
              toast.success("Account Verified.");
            }
          } else {
            toast.error("Please login to your account.");
            setLoginModalOpen(true);
            reject(new Error(res.message || "Failed to verify your account"));
          }
        })
        .catch((error) => {
          reject(new Error("Error while verifying account: " + error.message));
        })
        .finally(() => {
          setVerifying(false);
        
        });
    });

    toast.promise(verifyPromise as Promise<ResponseType>, {
      loading: "Verifying Your Account...",
      success: (res) => {
        return res.message;
      },
      error: (error) => error.message,
    });

    verifyPromise.catch((error) =>
      console.error("Error while verifying your account", error)
    );
  }

  async function resendVerificationCode() {
    setResending(true);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/auth/verify?resend=true",
        {
          method: "POST",
          body: JSON.stringify({
            email: form.getValues("email"),
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const res: ResponseType = await response.json();
      setResending(false);
      if (!res.success) {
        toast.error(res.message || "Error while resending verification code");
      } else {
        toast.success(res.message);
        setResendTimeout(true);
        setTimer(60);
        const interval = setInterval(() => {
          setTimer((prevTimer) => {
            if (prevTimer <= 1) {
              clearInterval(interval);
              setResendTimeout(false);
              return 60;
            }
            return prevTimer - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.log("error while resending verification code", error);
      setResending(false);
      toast.error("Error while resending verification code");
    }
  }

  return (
    <div>
      <div className="text-center space-y-3 max-w-lg mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold">
          Create Your <span className="text-second dw-underline1">Account</span>
        </h1>
        <p className="text-gray-700 max-w-xs mx-auto">
          Fill out the form below to create your account and start your journey
          with us.
        </p>
        <Steps />
      </div>

      {showVerification ? (
        <div className="max-w-md mx-auto mt-4 border bg-white p-6 rounded-lg">
          <h2 className="text-xl font-semibold">Verify your email</h2>
          <p className="mt-2 mb-4 text-gray-700">
            Please check your email for the verification code we sent.
          </p>
          <Form {...verificationForm}>
            <form
              onSubmit={verificationForm.handleSubmit(onVerify)}
              className="space-y-3"
            >
              <FormField
                control={verificationForm.control}
                name="verifyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code:</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter 6 Digit Verification Code:"
                        {...field}
                        className="p-6 rounded-md  bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                className="btn-primary text-sm"
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify Account"}
              </button>
              <div>
                Didn&apos;t receive a code?{" "}
                <button
                  disabled={resendTimeout || resending}
                  className={`${
                    resendTimeout ? "text-gray-800" : "text-second"
                  } font-semibold mt-1`}
                  type="button"
                  onClick={resendVerificationCode}
                >
                  {resendTimeout ? `Resend (${timer}s)` : "Resend"}
                </button>
              </div>
            </form>
          </Form>
        </div>
      ) : (
        <div className="max-w-sm mx-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4  "
            >
              <div className="grid  gap-x-4 gap-y-3 grid-cols-2 w-full">
                <FormField
                  control={form.control}
                  name="firstname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        First Name:<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="First Name"
                          {...field}
                          className="p-6 rounded-md  bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Last Name:<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Last Name"
                          {...field}
                          className="p-6 rounded-md  bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email:<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Email"
                        {...field}
                        className="p-6 rounded-md  bg-white"
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
                    <FormLabel>
                      Password:<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Password"
                        type="password"
                        {...field}
                        className="p-6 rounded-md  bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                className="btn-primary text-sm max-sm:w-full"
                disabled={registering}
              >
                {registering ? "Creating Account" : "Create Account"}
              </button>
              <p className=" text-sm text-gray-700">
                Already have an account?{" "}
                <button
                  className="font-semibold text-second"
                  onClick={() => setLoginModalOpen(true)}
                  type="button"
                >
                  Login
                </button>
              </p>
            </form>
          </Form>

          <div className="mt-2 ">
            <SocialLogin />
            {planType === "ONETIME" && (
              <button
                onClick={() => {
                  router.push("/plans/guest");
                }}
                className="w-full mb-3 rounded-full flex items-center justify-center border p-3 border-gray-300 hover:bg-gray-100 font-medium text-sm"
              >
                <User
                  fill="black"
                  strokeWidth={0}
                  size={18}
                  className="mr-[5px] text-white rounded-full border-2 border-black"
                />
                Continue as Guest
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterPage;
