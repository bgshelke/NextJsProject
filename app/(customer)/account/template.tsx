"use client";
import {
  BellIcon,
  CreditCardIcon,
  LockIcon,
  MapPin,
  Menu,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
type navItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
}[];
export default function AccountTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const iconclass = "inline-block mr-[2px] mb-[2px]";
  const navLinks: navItem = [
    {
      name: "General",
      href: "/account",
      icon: <User size={18} className={iconclass} />,
    },
    {
      name: "Change Password",
      href: "/account/change-password",
      icon: <LockIcon size={16} className={iconclass} />,
    },

    {
      name: "Saved Address",
      href: "/account/saved-address",
      icon: <MapPin size={16} className={iconclass} />,
    },
    {
      name: "Notifications",
      href: "/account/manage-notifications",
      icon: <BellIcon size={16} className={iconclass} />,
    },
    {
      name: "Manage Payment & Subscription",
      href: "/account/manage-payment-info",
      icon: <CreditCardIcon size={17} className={iconclass} />,
    },
  ];

  return (
    <>
      <div className="p-4 2xl:p-6">
        <h1 className="text-3xl font-semibold hidden md:block">
          Account Setting
        </h1>
        <div className="flex justify-between items-center md:hidden mb-3">
          <h1 className="text-2xl font-semibold md:hidden">Account Setting</h1>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Menu />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel asChild>
                <Link href="/account">My Profile</Link>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navLinks.map((link, index) => (
                <DropdownMenuItem key={index} asChild>
                  <Link href={link.href}>{link.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="hidden md:flex rounded-md my-5 text-muted-foreground  text-sm ">
          {navLinks.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className={`flex items-center p-3 px-6 gap-2 border-b-2 hover:border-primary text-nowrap ${
                pathname === link.href &&
                "text-primary border-b-2 border-primary"
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
        </div>
        <div>{children}</div>
      </div>
    </>
  );
}
