import { withAuth } from "next-auth/middleware";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const url = req.nextUrl.clone();
    const token = req.nextauth.token;
    if (url.pathname.startsWith("/admin") && token?.role !== "ADMIN" && token?.role !== "SUPER_ADMIN") {
      return notFound();
    }
    if (url.pathname.startsWith("/api/admin") && token?.role !== "ADMIN" && token?.role !== "SUPER_ADMIN") {
      return notFound();
    }
    if (url.pathname.startsWith("/plans/checkout") && token?.role !== "CUSTOMER") {
      url.pathname = "/plans/register";
      return NextResponse.redirect(url);
    }
    if (url.pathname.startsWith("/dashboard") && token?.role !== "CUSTOMER") {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (url.pathname.startsWith("/api/customer") && (!token || (token.role !== "CUSTOMER"))) {
      return notFound();
    }
    return NextResponse.next();
  },

  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages:{
      signOut:"/"
    }
    
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/my-subscription/:path*",
    "/api/customer/:path*",
    "/my-orders/:path*",
    "/dashboard/:path*",
    "/plans/checkout/:path*",
  ],
};
