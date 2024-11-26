"use client";
import Link from "next/link";
import React from "react";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";


export default function Navlinks({links}: {links: any}) {
  const pathname = usePathname();
  return (
    <div>
      {links.map((link: any) =>
        link.name === "Logout" ? (
          <button
            key={link.name}
            onClick={() => {
              signOut();
            }}
            className="flex items-center gap-2 px-8 py-3 w-full font-semibold hover:text-white hover:bg-white/10 transition-all"
          >
            {link.icon}
            {link.name}
          </button>
        ) : (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center gap-2 px-8 py-3 font-semibold hover:text-white hover:bg-white/10 transition-all ${
              link.href === pathname ? "bg-white/10" : ""
            }`}
          >
            {link.icon}

            {link.name}
          </Link>
        )
      )}
    </div>
  );
}

export function SheetNavlinks({links}: {links: any}) {
  return (
    <>
      {links.map((link: any) => (
        <Link
          key={link.name}
          href={link.href}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          {link.icon}
          {link.name}
        </Link>
      ))}
    </>
  );
}

