"use client";

import { useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { toast, Toaster } from "sonner";
import { GoogleAutocompleteSuggestion } from "@/types/main";
import { usePathname } from "next/navigation";
import { addressAvailability } from "@/stores/addressAvailability";
import { scrollToSection } from "./AutoFixedAddress";

function CheckAddressAvailability({
  styleSuggestions,
}: {
  styleSuggestions?: string;
}) {
  const pathname = usePathname();
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useDebounceValue(input, 500);
  const { isAvailable, selectedAddress, setAvailability } =
    addressAvailability();
  const [checking, setChecking] = useState(false);
  const [selectedInput, setSelectedInput] =
    useState<GoogleAutocompleteSuggestion | null>(null);
  const [selectedOption, setSelectedOption] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [hideForm, setHideForm] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const fetchSuggestions = async (input: string) => {
    const response = await fetch(
      process.env.NEXT_PUBLIC_URL + "/api/autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      }
    );
    const data = await response.json();

    if (data.success) {
      setSuggestions(data.data);
    } else {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    if (debouncedInput && !selectedOption) {
      fetchSuggestions(debouncedInput);
    } else {
      setSuggestions([]);
    }
  }, [debouncedInput, selectedOption]);

  const handleCheckAvailability = async () => {
    setChecking(true);
    setHideForm(false);
    if (input.length === 0) {
      setChecking(false);
      setError(true);
      setMessage("Please enter a valid address");
      return;
    }
    const response = await fetch(
      process.env.NEXT_PUBLIC_URL + "/api/autocomplete/check-availability",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ placename: input }),
      }
    );

    const res = await response.json();
    setChecking(false);
    if (res.success) {
      setAvailability({
        selectedAddress: selectedInput?.description || input,
        isAvailable: true,
        address: {
          streetAddress:
            selectedInput?.structured_formatting.main_text || input,
          city: selectedInput?.details.city || "",
          state: selectedInput?.details.state || "",
          zip: selectedInput?.details.zip || "",
        },
      });
      setSuggestions([]);
      scrollToSection();
      setMessage(res.message);
      setError(false);
    } else {
      setError(true);
      setMessage(res.message);
      setAvailability({
        selectedAddress: null,
        isAvailable: false,
      });
      setHideForm(true);
    }
  };

  const changeAddress = () => {
    setAvailability({
      selectedAddress: null,
      isAvailable: false,
      address: {},
    });
    setHideForm(false);
    setError(false);
    setMessage("");
  };

  useEffect(() => {
    if (isAvailable && selectedAddress) {
      setSelectedOption(true);
      setInput(selectedAddress);
    }
  }, [isAvailable, selectedAddress]);

  return (
    <>
      <div className=" w-full mt-1 flex flex-col md:flex-row gap-2 text-sm">
        <div className="relative w-full">
          <div
            className={`flex  ${
              pathname === "/" && "max-sm:flex-col"
            } items-center gap-2 `}
          >
            <input
              type="text"
              value={input}
              id="address"
              disabled={isAvailable}
              onChange={(e) => {
                setInput(e.target.value);
                setSelectedOption(false);
              }}
              placeholder="1230 Peachtree Road Northeast, Atlanta, GA, USA"
              className="bg-white p-3 border border-gray-300 rounded-md w-full disabled:cursor-not-allowed disabled:opacity-50"
            />
            {!isAvailable && (
              <button
                onClick={handleCheckAvailability}
                data-test="check-availability-btn"
                className="bg-primary text-white rounded-md max-sm:w-full  text-nowrap hover:bg-first transition py-3 px-8"
              >
                {checking
                  ? "Please wait..."
                  : pathname === "/"
                  ? "Check Availability"
                  : "Check"}
              </button>
            )}
            {isAvailable && (
              <button
                onClick={changeAddress}
                className="bg-primary text-white rounded-md text-nowrap max-sm:w-full hover:bg-first transition py-3 px-8 "
              >
                Change
              </button>
            )}
          </div>

          {suggestions.length > 0 && (
            <ul
              className={`bg-white p-1 shadow-md rounded-md w-full  text-sm absolute  z-[1000] ${
                styleSuggestions ? styleSuggestions : "top-12"
              }`}
            >
              {suggestions.map((suggestion: GoogleAutocompleteSuggestion) => (
                <li
                  key={suggestion.place_id}
                  onClick={() => {
                    setSelectedInput(suggestion);
                    setInput(suggestion.description);
                    setSuggestions([]);
                    setSelectedOption(true);
                  }}
                  className="p-2 cursor-pointer hover:bg-gray-100"
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="text-red-600 font-semibold text-sm">{message}</p>
          )}
          {isAvailable && (
            <div className="text-green-600 text-sm mt-2 font-semibold">
              We are available at your location.
            </div>
          )}
        </div>
      </div>
      <CheckAvailabilityPopup
        open={hideForm}
        setOpen={setHideForm}
        address={input}
        setHideForm={setHideForm}
        hideForm={hideForm}
        setIsEmailSubmitting={setIsEmailSubmitting}
        isEmailSubmitting={isEmailSubmitting}
      />
    </>
  );
}

export default CheckAddressAvailability;

export function CheckAvailabilityPopup({
  open,
  setOpen,
  address,
  setHideForm,
  hideForm,
  isEmailSubmitting,
  setIsEmailSubmitting,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  address: string;
  setHideForm: React.Dispatch<React.SetStateAction<boolean>>;
  hideForm: boolean;
  isEmailSubmitting: boolean;
  setIsEmailSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const userwithdifferentareaSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email" }),
    address: z.string().optional(),
  });
  const form = useForm<z.infer<typeof userwithdifferentareaSchema>>({
    resolver: zodResolver(userwithdifferentareaSchema),
  });

  async function onSubmit(values: z.infer<typeof userwithdifferentareaSchema>) {
    values.address = address;

    try {
      setIsEmailSubmitting(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/autocomplete/get-notified",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setHideForm(false);
      } else {
        toast(data.message);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again later");
    } finally {
      setIsEmailSubmitting(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Sorry we are not available at your location!
          </DialogTitle>
        </DialogHeader>
        <div>
          {hideForm && (
            <p className="font-medium text-sm text-gray-600 my-2">
              Please enter your email we will inform you when we are available
              at your location.
            </p>
          )}
          {hideForm && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">
                  {isEmailSubmitting ? "Please wait..." : "Submit"}
                </Button>
              </form>
            </Form>
          )}

          {!hideForm && (
            <div className="text-sm text-gray-600 max-sm:text-center">
              We will notify you when we are available at your location.
              <br />
              <Button
                onClick={() => {
                  setOpen(false);
                  setHideForm(false);
                }}
                className="mt-2"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
