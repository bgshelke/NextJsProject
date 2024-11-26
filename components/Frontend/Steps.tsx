"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

function Steps() {
  const pathname = usePathname();

  type step = {
    step: number;
    title: string;
    url: string;
  };

  const newStep = [
    {
      step: 1,
      title: "Select Plan",
      url: "/plans",
    },
    {
      step: 2,
      title: "Register",
      url: "/plans/register",
    },

    {
      step: 3,
      title: "Checkout",
      url: "/plans/checkout",
    },
  ];

  return (
    <ol
      className="flex items-center w-11/12 min-w-[400px]  text-xs text-gray-900 font-medium sm:text-base pt-4 mx-auto"
      data-test="steps"
    >
      {newStep.map((step: step) => {
        return (
          <li
            key={step.step}
            className={`flex relative  ${
              step.step === 3
                ? ""
                : "after:content-[''] w-full after:w-full after:h-0.5  after:inline-block after:absolute after:left-[1.5rem] md:after:left-[1.2rem] after:top-4 md:after:top-5 after:border-t-2 after:border-primary"
            }`}
          >
            <div className="block whitespace-nowrap z-10">
              <Link href={step.url}>
                <span
                  className={`w-8 h-8 ${
                    pathname === step.url || pathname === "/plans/checkout"
                      ? "bg-primary text-white border-primary"
                      : "bg-white "
                  } border-2 border-gray-200 rounded-full flex justify-center items-center mx-auto mb-2 text-base font-semibold text-primary  lg:w-10 lg:h-10`}
                >
                  {step.step}
                </span>{" "}
                <span className="text-sm">{step.title}</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default Steps;
