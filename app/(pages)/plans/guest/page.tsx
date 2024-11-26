"use client";
import React from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ShippingInfo,
  BillingInfo,
  GoogleAutocompleteSuggestion,
  PickupOption,
} from "@/types/main";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { useDebounceValue } from "usehooks-ts";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import {
  billingAddressSchema,
  BillingInput,
  shippingAddressSchema,
  ShippingInput,
} from "@/types/zod/CheckoutSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Alert from "@/components/ui/customAlert";
import { addressAvailability } from "@/stores/addressAvailability";
import useDeliveryInfo from "@/stores/useDeliveryInfo";
import { useFinalOrderStore } from "@/stores/plan/usePlanStore";


function Page() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<
    GoogleAutocompleteSuggestion[]
  >([]);
  const { address ,isAvailable} = addressAvailability();
  const [addressInput, setAddressInput] = useState("");
  const [useShippingForBilling, setUseShippingForBilling] = useState(false);

  const [debouncedInput, setDebouncedInput] = useDebounceValue(
    addressInput,
    500
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPageDataLoading, setIsInitialLoading] = useState(true);
  const {
    setBillingInfo,
    setShippingInfo,
    saveAddressForLater,
    addressInfo,
    setSaveAddressForLater,
  } = useDeliveryInfo();

  const [selectedAddress, setSelectedAddress] = useState<boolean>(false);
  const { items, planType, oneTimeOrder } = useFinalOrderStore();
  const pickupOption = oneTimeOrder?.pickupOption;
  const form = useForm<ShippingInput>({
    resolver: zodResolver(shippingAddressSchema),
  });
  const formBilling = useForm<BillingInput>({
    resolver: zodResolver(billingAddressSchema),
  });



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
    if (debouncedInput && !selectedAddress) {
      fetchSuggestions(debouncedInput);
    } else {
      setSuggestions([]);
    }
  }, [debouncedInput, selectedAddress]);

  useEffect(() => {
   
    if (addressInfo?.shippingInfo?.addressLine1) {
   
      setSelectedAddress(true);
      setAddressInput(addressInfo.shippingInfo.addressLine1 || "");
      form.reset(addressInfo.shippingInfo);
      formBilling.reset(addressInfo.billingInfo);
      form.setValue(
        "deliveryInstructions",
        addressInfo.shippingInfo.deliveryInstructions || ""
      );
      form.setValue(
        "addressLine2",
        addressInfo.shippingInfo.addressLine2 || ""
      );
      formBilling.setValue(
        "addressLine2",
        addressInfo.shippingInfo.addressLine2 || ""
      );
    } else if (isAvailable && address) {
    
      setSelectedAddress(true);
      setAddressInput(address.streetAddress || "");

      form.setValue("addressLine1", address.streetAddress || "");
      form.setValue("city", address.city || "");
      form.setValue("state", address.state || "");
      form.setValue("zipCode", address.zip || "");
      formBilling.setValue("addressLine1", address.streetAddress || "");
      formBilling.setValue("city", address.city || "");
      formBilling.setValue("state", address.state || "");
      formBilling.setValue("zipCode", address.zip || "");
    }
  }, [address, addressInfo, isAvailable]);

  

  async function onSubmit(
    shippingValues: ShippingInput,
    billingValues?: BillingInput
  ) {
    billingValues = billingValues || formBilling.getValues();
    try {
      setError(false);
      setErrorMsg("");
      setLoading(true);

      if (pickupOption !== "PICKUP") {
        const response = await fetch(
          process.env.NEXT_PUBLIC_URL + "/api/autocomplete/check-availability",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              placename: `${shippingValues.addressLine1}, ${shippingValues.city}, ${shippingValues.state}`,
            }),
          }
        );
        const data = await response.json();
        if (!data.success) {
          setError(true);
          setErrorMsg(data.message);
          setLoading(false);
          return;
        }
      }

      setBillingInfo(billingValues);
      setShippingInfo(shippingValues);
      router.push("/plans/guest/checkout");
    } catch (error) {
      setError(true);
      setErrorMsg("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setError(false);
    setErrorMsg("");
  }, [addressInput]);

  return (
    <>
      <div className="p-6">
        <AddNewAddress
          form={form}
          onSubmit={onSubmit}
          formBilling={formBilling}
          useShippingForBilling={useShippingForBilling}
          setUseShippingForBilling={setUseShippingForBilling}
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          addressInput={addressInput}
          setAddressInput={setAddressInput}
          selectedAddress={selectedAddress}
          setSelectedAddress={setSelectedAddress}
          addressForLater={saveAddressForLater}
          setAddressForLater={setSaveAddressForLater}
          pickupOption={pickupOption || "DELIVERY"}
        />
        <div className="mt-3">
          {error && <Alert variant="error" message={errorMsg} />}
        </div>
        <Button
          className="mt-3"
          data-test="continue-to-payment-btn1"
          onClick={() => {
            if(pickupOption === "PICKUP"){
             const shippingValues = form.getValues();
             onSubmit(shippingValues, shippingValues);
            } else {
             form.handleSubmit((shippingValues) => {
               const billingValues = useShippingForBilling
                 ? shippingValues
                 : formBilling.getValues();
               if (!useShippingForBilling) {
                 formBilling.trigger().then((isValid) => {
                   if (isValid) {
                     onSubmit(shippingValues, billingValues);
                   }
                 });
               } else {
                 onSubmit(shippingValues, billingValues);
               }
             })();
            }
           }}
        >
          Continue to Payment
        </Button>
      </div>
    </>
  );
}

export default Page;

function AddNewAddress({
  form,
  onSubmit,
  formBilling,
  useShippingForBilling,
  setUseShippingForBilling,
  suggestions,
  setSuggestions,
  addressInput,
  setAddressInput,
  setSelectedAddress,
  pickupOption,
}: {
  form: any;
  onSubmit: any;
  formBilling: any;
  useShippingForBilling: any;
  setUseShippingForBilling: any;
  suggestions: any;
  setSuggestions: any;
  addressInput: any;
  setAddressInput: any;
  selectedAddress: any;
  setSelectedAddress: any;
  addressForLater: boolean;
  setAddressForLater: any;
  editMode?: boolean;
  pickupOption: PickupOption;
}) {
  const inputclass = "p-2.5 rounded-md border border-gray-300";

  const handleSelectOption = (suggestion: GoogleAutocompleteSuggestion) => {
    setSelectedAddress(true);

    form.setValue("addressLine1", suggestion.structured_formatting.main_text);
    setAddressInput(suggestion.structured_formatting.main_text);

    form.setValue("city", suggestion.details.city);
    form.setValue("state", suggestion.details.state);
    form.setValue("zipCode", suggestion.details.zip);

    formBilling.setValue(
      "addressLine1",
      suggestion.structured_formatting.main_text
    );
    formBilling.setValue("city", suggestion.details.city);
    formBilling.setValue("state", suggestion.details.state);
    formBilling.setValue("zipCode", suggestion.details.zip);
    setSuggestions([]);
  };
  return (
    <div>
     <h1 className="text-lg font-semibold mb-3">
        {pickupOption === "PICKUP"
          ? "Enter Your Information"
          : "Delivery information"}
      </h1>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit((shippingValues: ShippingInfo) =>
              onSubmit(shippingValues)
            )();
          }}
          className="space-y-8"
        >
          <div>
            <div className="grid md:grid-cols-2 gap-2 md:gap-3">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Full Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={inputclass}
                        placeholder="Full Name"
                        type="text"
                        data-test="full-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <>
                    <FormItem className="relative">
                      <FormLabel>
                        Phone <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <div className="bg-white font-semibold rounded-s-md flex items-center p-2">
                            +1
                          </div>
                          <Input
                            className={inputclass}
                            placeholder="E.g +19543214567"
                            type="tel"
                            {...field}
                            data-test="phone"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>
                      Street Address <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={inputclass}
                        placeholder="Street Address"
                        type="text"
                        value={addressInput}
                        onChange={(e) => {
                          setAddressInput(e.target.value);
                          // setSelectedOption(false);
                          form.setValue("addressLine1", e.target.value);
                          setSelectedAddress(false);
                          // setIsAddressFromLocalStorage(false);
                          // setAddressforCoupon(e.target.value);
                          // removeDiscount();
                        }}
                        data-test="street-address"
                      />
                    </FormControl>
                    {suggestions.length > 0 && (
                      <ul className="bg-white p-1 shadow-md rounded-md w-full  text-sm absolute top-14 z-10">
                        {suggestions.map(
                          (suggestion: GoogleAutocompleteSuggestion) => (
                            <li
                              key={suggestion.place_id}
                              onClick={() => handleSelectOption(suggestion)}
                              className="p-2 cursor-pointer hover:bg-gray-100"
                            >
                              {suggestion.description}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Apt number / suite{" "}
                      <span className="text-gray-400 text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={inputclass}
                        placeholder="Apt number / suite"
                        type="text"
                        {...field}
                        data-test="apt-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-3 mt-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      City <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={inputclass}
                        placeholder="City"
                        type="text"
                        {...field}
                        data-test="city"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      State <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={inputclass}
                        placeholder="State"
                        type="text"
                        {...field}
                        data-test="state"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Zip Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={inputclass}
                        placeholder="Zip Code"
                        type="text"
                        {...field}
                        data-test="zip-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Collapsible>
              <CollapsibleTrigger className="font-semibold mt-3 text-primary text-sm">
                + Delivery Instructions
              </CollapsibleTrigger>
              <CollapsibleContent>
                <FormField
                  control={form.control}
                  name="deliveryInstructions"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormControl>
                        <Textarea
                          className={"p-6 rounded-lg"}
                          placeholder="Delivery Instructions"
                          {...field}
                          data-test="delivery-instructions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </form>
      </Form>

      {pickupOption === "DELIVERY" && (
        <div className="mt-6">
          <h1 className="text-lg font-semibold mb-3">Billing information</h1>
          <Form {...formBilling}>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="sameinfo"
              data-test="same-info"
              onCheckedChange={(e: boolean) => {
                setUseShippingForBilling(e);
                if (e) {
                  const shippingValues = form.getValues();
                  formBilling.reset(shippingValues);
                }
              }}
            />
            <label
              htmlFor="sameinfo"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Use same as shipping info
            </label>
          </div>

          {!useShippingForBilling && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                formBilling.handleSubmit((billingValues: BillingInfo) =>
                  onSubmit(form.getValues(), billingValues)
                )();
              }}
              className="space-y-8"
            >
              <div className="grid md:grid-cols-2 gap-3">
                <FormField
                  control={formBilling.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Full Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputclass}
                          placeholder="Full Name"
                          type="text"
                          {...field}
                          data-test="full-name-billing"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formBilling.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Street Address <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputclass}
                          placeholder="Address"
                          type="text"
                          {...field}
                          data-test="street-address-billing"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formBilling.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Apt number / suite{" "}
                        <span className="text-gray-400 text-xs">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputclass}
                          placeholder="Apt number / suite"
                          type="text"
                          {...field}
                          data-test="apt-number-billing"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formBilling.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        City <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputclass}
                          placeholder="City"
                          type="text"
                          {...field}
                          data-test="city-billing"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formBilling.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        State <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputclass}
                          placeholder="State"
                          type="text"
                          {...field}
                          data-test="state-billing"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formBilling.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Zip Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputclass}
                          placeholder="Zip Code"
                          type="text"
                          {...field}
                          data-test="zip-code-billing"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          )}
          </Form>
        </div>
      )}
    </div>
  );
}
