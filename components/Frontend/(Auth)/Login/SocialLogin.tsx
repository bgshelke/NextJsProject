import { AppleIcon, GoogleIcon } from "@/components/ui/LogoIcon";
import { useRedirectStore } from "@/stores/useOptions";
import { signIn } from "next-auth/react";
import React from "react";
import { toast } from "sonner";

function SocialLogin() {

  const googleLogin = async () => {
    try {
      const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";
      await signIn("google", {
        redirect: false,
        callbackUrl,
      });
     
    } catch (error) {
      toast.error("Login Failed");
    }
  };

  return (
    <div>
      <div className="mt-2">
        <div className="py-3 mb-2 flex items-center text-xs text-gray-400 uppercase before:flex-1 before:border-t before:border-gray-200 before:me-6 after:flex-1 after:border-t after:border-gray-200 after:ms-6">
          Or
        </div>

        <button
          onClick={googleLogin}
          className="w-full mb-3 rounded-full flex items-center justify-center border p-3 border-gray-300 hover:bg-gray-100 font-medium text-sm"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <button className="w-full mb-3 rounded-full flex items-center justify-center border p-3 border-gray-300 hover:bg-gray-100 font-medium text-sm">
          <AppleIcon />
          Sign in with Apple
        </button>
      </div>
    </div>
  );
}

export default SocialLogin;
