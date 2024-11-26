"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logoUrl } from "@/lib/helper";
import Image from "next/image";
import { useState } from "react";
import SocialLogin from "./SocialLogin";
import Link from "next/link";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import LoginForm from "./LoginForm";
import { useLoginModal } from "@/stores/useOptions";
function LoginModal() {
  const {isLoginModalOpen, setLoginModalOpen} = useLoginModal();
  
  return (
    <Dialog open={isLoginModalOpen} onOpenChange={setLoginModalOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>
              Enter your email below to login to your account
            </DialogDescription>
          </VisuallyHidden>

          <div className="text-center space-y-3 max-w-lg mx-auto mb-4">
            <Image
              src={logoUrl}
              alt="logo"
              width={80}
              height={80}
              className="mx-auto"
            />
            <h1 className="text-2xl font-semibold">
              <span className="text-second dw-underline1">Welcome</span> Back
            </h1>
            <p className="text-gray-700 text-sm max-w-[250px] mx-auto">
              Enter your email below to login to your account
            </p>
          </div>
          <LoginForm />

          <div className="pt-2 text-center text-sm ">
            Don&apos;t have an account?{" "}
            <Link
              href="/plans"
              className="underline"
              onClick={() => setLoginModalOpen(false)}
            >
              Sign up
            </Link>
          </div>
          <SocialLogin />
          <div className="bg-primary roate-x-50 absolute blur-3xl h-12 w-40 opacity-70 top-4"></div>
          <div className="bg-first roate-x-50 absolute blur-3xl h-12 w-40 opacity-70 right-0 top-4"></div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default LoginModal;

