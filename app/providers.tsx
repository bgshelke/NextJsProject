"use client";

import { DayMenuProvider } from "@/contexts/DayMenuProvider";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import NextTopLoader from "nextjs-toploader";
import { ReactNode } from "react";
type ProvidersProps = {
  session?: Session | null;
  children: ReactNode;
};

export default function Providers({ session, children }: ProvidersProps) {
  return (
    <SessionProvider session={session}>

        <DayMenuProvider>
          <NextTopLoader color="#F48220" zIndex={2000} />

          {children}
        </DayMenuProvider>
    
    </SessionProvider>
  );
}
