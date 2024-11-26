import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChefHat, HandPlatter, MapPinned, Menu, Package, Settings, Soup, TicketPercent } from "lucide-react";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { authOptions } from "../api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";

import Navlinks, { SheetNavlinks } from "@/components/Frontend/NavLinks";
import {
  LayoutGrid,
  LogOut,
  User,
  Utensils,
} from "lucide-react";

import { AdminRolesProvider } from "@/contexts/AdminRoleProvider";
import prisma from "@/lib/db";

const NavLink = [
  {
    name: "Dashboard",
    icon: <LayoutGrid className="h-4 w-4" />,
    href: "/admin/",
  },
  {
    name: "Customers",
    icon: <User className="h-4 w-4" />,
    href: "/admin/customers",
  },
  {
    name: "Weekly Menu",
    icon: <Utensils className="h-4 w-4" />,
    href: "/admin/menu",
  },
  {
    name: "Menu Items",
    icon: <Soup className="h-4 w-4" />,
    href: "/admin/menu/items",
  },
  {
    name: "Deliveries",
    icon: <Package className="h-4 w-4" />,
    href: "/admin/deliveries",
  },
  {
    name: "Pickup Orders",
    icon: <HandPlatter className="h-4 w-4" />,
    href: "/admin/pickup-orders",
  },

  {
    name: "Area & Zones",
    icon: <MapPinned className="h-4 w-4" />,
    href: "/admin/area-zone",
  },
  {
    name: "Coupons",
    icon: <TicketPercent className="h-4 w-4" />,
    href: "/admin/coupons",
  },
  {
    name: "Settings",
    icon: <Settings className="h-4 w-4" />,
    href: "/admin/settings",
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
  if (!session) {
    redirect("/");
  }

  const findAdmin = await prisma.user.findUnique({
    where: {
      id: session?.user?.id,
      isVerified: true,
    },
    select: {
      admin: {
        select: {
          permissions: true,
        },
      },
    },
  });

  if (!findAdmin) {
    redirect("/");
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
            <main className="flex flex-1 flex-col gap-4 lg:gap-6 md:p-4 md:mt-4">
              <AdminRolesProvider
                initialPermissions={findAdmin?.admin?.permissions || []}
              >
                {children}
              </AdminRolesProvider>
            </main>
          </div>
        </div>
      </div>

    </>
  );
}
