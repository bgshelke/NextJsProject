import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { authOptions } from "../api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";

import {
  Bell,
  Clock7,
  CreditCard,
  LayoutGrid,
  LogOut,
  User,
  Utensils,
} from "lucide-react";
import Navlinks, { SheetNavlinks } from "./_components/NavLinks";

const NavLink = [
  // {
  //   name: "Dashboard",
  //   icon: <LayoutGrid className="h-4 w-4" />,
  //   href: "/dashboard",
  // },
  {
    name: "My Subscription",
    icon: <Utensils className="h-4 w-4" />,
    href: "/my-subscription",
  },

  {
    name: "Our Menu",
    icon: <Utensils className="h-4 w-4" />,
    href: "/our-menu",
  },
  {
    name: "My Account",
    icon: <User className="h-4 w-4" />,
    href: "/account",
  },
  {
    name: "Notifications",
    icon: <Bell className="h-4 w-4" />,
    href: "/notifications",
  },
  {
    name: "Order History",
    icon: <Clock7 className="h-4 w-4" />,
    href: "/order-history",
  },
  {
    name: "Wallet History",
    icon: <CreditCard className="h-4 w-4" />,
    href: "/my-wallet",
  },
  {
    name: "Logout",
    icon: <LogOut className="h-4 w-4" />,
    href: "#",
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "CUSTOMER") {
    redirect("/login");
  }

  if (session.user.orders < 1) {
   
    redirect("/plans");
      }

  return (
    <>
      
      <div className="bg-gray-50">
        <div className="container  mx-auto grid min-h-screen   lg:grid-cols-[280px_1fr] mt-12">
          <div className="hidden lg:block bg-primary text-white pt-5">
            <Navlinks links={NavLink} />
          </div>

          <div className="">
            <header className="flex lg:hidden w-full justify-between min-w-full">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 ">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                  <nav className="grid gap-4 text-lg font-medium">
                    <Link href="/" className="py-4">
                      <Image
                        src="/logo.svg"
                        alt="Logo"
                        width={60}
                        height={60}
                        className="mx-auto"
                      />
                    </Link>
                    <SheetNavlinks links={NavLink} />
                  </nav>
                </SheetContent>
              </Sheet>
            </header>
            <main className="flex flex-1 flex-col gap-4 lg:gap-6 md:p-4 md:mt-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
