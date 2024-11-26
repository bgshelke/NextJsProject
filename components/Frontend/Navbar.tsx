"use client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { logoUrl, NavLinks } from "@/lib/helper";
import { LogOut, CircleUserRound, ChevronDown } from "lucide-react";
import * as HoverCard from "@radix-ui/react-hover-card";
import Image from "next/image";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useLoginModal } from "@/stores/useOptions";
import { User } from "next-auth";
import useDeliveryInfo from "@/stores/useDeliveryInfo";
import { useFinalOrderStore } from "@/stores/plan/usePlanStore";
import LoginModal from "./(Auth)/Login/LoginModal";

export interface NavbarData {
  data: {
    attributes: {
      topbar: string;
      topbarLink: {
        LinkText: string;
        LinkUrl: string;
      };
    };
  };
}

export default function Navbar({ data }: { data: NavbarData }) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  const { isLoginModalOpen, setLoginModalOpen } = useLoginModal();
  const { clearDeliveryInfo } = useDeliveryInfo();

  const { clearFinalOrder } = useFinalOrderStore();
  return (
    <div className="text-sm font-medium" data-test="navbar">
      <div className="bg-primary fixed top-0 left-0 right-0 z-50 h-20">
        <div className=" text-white py-2.5 px-2 text-center w-full text-xs md:text-sm ">
          <p>
            {data.data.attributes.topbar}-{" "}
            <Link
              href={data.data.attributes.topbarLink.LinkUrl}
              className="text-white underline"
            >
              {data.data.attributes.topbarLink.LinkText}
            </Link>
          </p>
        </div>
        <nav className="bg-white  px-3 lg:px-8  py-2 lg:py-1 flex justify-between items-center w-[95%] lg:w-[90%] shadow-lg rounded-full mx-auto ">
          <Link href="/" data-test="logo-link">
            <Image
              src={logoUrl}
              className="w-[4.5rem] md:w-20 lg:w-24 pl-2 lg:p-1 "
              width={90}
              height={90}
              alt="DabbahWala"
            />
          </Link>
          <button
            className="rounded-full p-3 bg-primary lg:hidden"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </button>
          <div className="text-gray-900 space-x-6 hidden lg:block">
            {NavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className=" text-gray-900 hover:text-second"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/plans">
              <button type="button" className="btn-secondary font-semibold ">
                Order Now
              </button>
            </Link>

            {!session?.user && (
              <button
                className="btn-primary font-semibold "
                data-test="login-button"
                onClick={() => setLoginModalOpen(true)}
              >
                Login/Register
              </button>
            )}

            {session?.user && (
              <DropDownMenu
                user={session?.user as User}
                wallet={0}
                onLoginClick={() => setLoginModalOpen(true)}
                clearFinalOrder={clearFinalOrder}
                clearDeliveryInfo={clearDeliveryInfo}
              />
            )}
          </div>

          <Sheet onOpenChange={setOpen} open={open} data-test="mobile-menu">
            <SheetContent side={"left"} className="text-center">
              <SheetHeader>
                <SheetTitle data-test="logo mobile">
                  <Image
                    src={logoUrl}
                    width={80}
                    height={80}
                    className="mx-auto mt-6"
                    alt="DabbahWala"
                  />
                </SheetTitle>
              </SheetHeader>
              <SheetDescription className="flex flex-col gap-2 mt-6">
                {NavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className=" text-gray-900 hover:text-second text-lg font-semibold"
                    data-test="navbar-link-mobile"
                  >
                    {link.label}
                  </Link>
                ))}

                <Link href="/plans" className="my-3">
                  <button
                    type="button"
                    className="btn-secondary font-semibold  "
                    data-test="order-now-button-mobile"
                  >
                    Order Now
                  </button>
                </Link>

                {!session?.user && (
                  <div className=" " data-test="login-button-mobile">
                    <button
                      className="btn-primary"
                      onClick={() => setLoginModalOpen(true)}
                    >
                      Login/Register
                    </button>
                  </div>
                )}

                {session?.user && (
                  <div className=" ">
                    <DropDownMenu
                      user={session?.user as User}
                      wallet={0}
                      onLoginClick={() => setLoginModalOpen(true)}
                      clearFinalOrder={clearFinalOrder}
                      clearDeliveryInfo={clearDeliveryInfo}
                    />
                  </div>
                )}
              </SheetDescription>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
      <div className="h-[calc(5rem)]"></div>

      <LoginModal />
    </div>
  );
}

function DropDownMenu({
  user,
  wallet,
  onLoginClick,
  clearFinalOrder,
  clearDeliveryInfo,
}: {
  user: User;
  wallet: number;
  onLoginClick: () => void;
  clearFinalOrder: () => void;
  clearDeliveryInfo: () => void;
}) {
  const linkWithRole = (role: User["role"]) => {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      const adminLinks = [
        {
          label: "Dashboard",
          href: "/admin",
        },
        {
          label: "Deliveries",
          href: "/admin/delivery",
        },
        {
          label: "Area & Zones",
          href: "/admin/area",
        },
        {
          label: "Users",
          href: "/admin/users",
        },
      ];
      return adminLinks;
    } else {
      const userLinks = [
        {
          label: "My Subscription",
          href: "/my-subscription",
        },
        {
          label: "My Account",
          href: "/account",
        },
        
        {
          label: "My Wallet",
          href: "/my-wallet",
        },
      ];
      return userLinks;
    }
    return [];
  };

  const handleLogout = () => {
    signOut({
      callbackUrl: "/",
      redirect: true,
    });
    clearDeliveryInfo();
    clearFinalOrder();
  };

  return (
    <HoverCard.Root openDelay={0} defaultOpen={false}>
      <HoverCard.Trigger>
        <button className="bg-white border-2 border-gray-200 rounded-full p-3 px-5 flex items-center justify-around gap-2">
          <CircleUserRound size="17" /> My Account
          <ChevronDown size="16" />
        </button>
      </HoverCard.Trigger>
      <HoverCard.Content
        className="data-[side=bottom]:animate-slideUpAndFade data-[side=right]:animate-slideLeftAndFade data-[side=left]:animate-slideRightAndFade data-[side=top]:animate-slideDownAndFade w-[250px] max-md:text-sm max-md:text-gray-900 max-md:font-medium  max-md:text-left rounded-md bg-white p-5 shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] data-[state=open]:transition-all"
        sideOffset={5}
      >
        <span className="font-semibold mb-2 text-gray-500">Welcome Back!</span>
        {!user && (
          <button
            className="bg-primary p-2.5 px-4 text-white rounded-md mt-2 w-full"
            onClick={onLoginClick}
          >
            Login/Register
          </button>
        )}
        <ul className="space-y-2 mt-3">
          {linkWithRole(user?.role).map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          {user && (
            <li className="mt-3 border-t border-gray-100 pt-3">
              <button
                className="w-full text-left flex items-center gap-2 justify-between"
                onClick={handleLogout}
              >
                Logout <LogOut size="16" />
              </button>
            </li>
          )}
        </ul>
        <HoverCard.Arrow className="fill-white" />
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

export function MenuIcon() {
  return (
    <svg
      width="20"
      height="19"
      viewBox="0 0 24 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.36844 0.973755H10.3947C10.8204 0.973755 11.2287 1.14288 11.5298 1.44392C11.8308 1.74497 12 2.15327 12 2.57901C12 3.00475 11.8308 3.41305 11.5298 3.71409C11.2287 4.01514 10.8204 4.18426 10.3947 4.18426H2.36844C1.9427 4.18426 1.5344 4.01514 1.23335 3.71409C0.932308 3.41305 0.763184 3.00475 0.763184 2.57901C0.763184 2.15327 0.932308 1.74497 1.23335 1.44392C1.5344 1.14288 1.9427 0.973755 2.36844 0.973755ZM13.6052 13.8158H21.6315C22.0572 13.8158 22.4655 13.9849 22.7666 14.286C23.0676 14.587 23.2367 14.9953 23.2367 15.421C23.2367 15.8468 23.0676 16.2551 22.7666 16.5561C22.4655 16.8572 22.0572 17.0263 21.6315 17.0263H13.6052C13.1795 17.0263 12.7712 16.8572 12.4701 16.5561C12.1691 16.2551 12 15.8468 12 15.421C12 14.9953 12.1691 14.587 12.4701 14.286C12.7712 13.9849 13.1795 13.8158 13.6052 13.8158ZM2.36844 7.39477H21.6315C22.0572 7.39477 22.4655 7.56389 22.7666 7.86494C23.0676 8.16598 23.2367 8.57428 23.2367 9.00002C23.2367 9.42576 23.0676 9.83406 22.7666 10.1351C22.4655 10.4362 22.0572 10.6053 21.6315 10.6053H2.36844C1.9427 10.6053 1.5344 10.4362 1.23335 10.1351C0.932308 9.83406 0.763184 9.42576 0.763184 9.00002C0.763184 8.57428 0.932308 8.16598 1.23335 7.86494C1.5344 7.56389 1.9427 7.39477 2.36844 7.39477Z"
        fill="#FEFEFE"
      />
    </svg>
  );
}
