"use client";
import React, { useEffect, useState } from "react";

import CheckAddressAvailability from "./CheckAddressAvailability";
import { addressAvailability } from "@/stores/addressAvailability";
import { X } from "lucide-react";

export function scrollToSection() {
  const element = document.getElementById("check-availablity");
  if (element) {
    window.scrollTo({
      top: element.offsetTop - 100,
      behavior: "smooth",
    });
  }
}

function AutoFixedAddress() {
  const [isBoxOpen, setIsBoxOpen] = useState(false);
  const { isAvailable } = addressAvailability();
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    scrollToSection();
  };

  useEffect(() => {
    if (isAvailable) {
      setIsBoxOpen(false);
    } else {
      setIsBoxOpen(true);
    }
  }, [isAvailable]);

  return (
    <div
      className={`bg-white p-6 py-16 ${
        isBoxOpen && isVisible
          ? "fixed bottom-0 w-full  z-[50] availblity-box"
          : ""
      }`}
      id="check-availablity"
    >
      <h1 className="text-3xl md:text-4xl font-semibold text-center mb-8">
        See if we are serving in your area
      </h1>
      <div className="max-w-4xl mx-auto">
        <CheckAddressAvailability styleSuggestions=" bottom-12 " />
      </div>
      {!isAvailable && isVisible && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 hover:rotate-90 transition-transform"
        >
          <X className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default AutoFixedAddress;
