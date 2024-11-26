import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      isVerified: string;
      role: "ADMIN" | "CUSTOMER" | "SUPER_ADMIN";
      orders: number;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    isVerified: string;
    role: "ADMIN" | "CUSTOMER" | "SUPER_ADMIN";
    orders: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    isVerified: string;
    role: "ADMIN" | "CUSTOMER" | "SUPER_ADMIN";
  }
}
