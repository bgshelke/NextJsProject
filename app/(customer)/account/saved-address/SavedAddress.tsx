"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GoogleAutocompleteSuggestion, SavedAddressType } from "@/types/main";
import { Ellipsis } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  billingAddressSchema,
  BillingInput,
  shippingAddressSchema,
  ShippingInput,
} from "@/types/zod/CheckoutSchema";
import { useDebounceValue } from "usehooks-ts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Alert from "@/components/ui/customAlert";
import { Textarea } from "@/components/ui/textarea";
import { fetcher } from "@/lib/helper";
import { toast } from "sonner";


function SavedAddressForm() {
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [suggestions, setSuggestions] = useState<
    GoogleAutocompleteSuggestion[]
  >([]);
  const [addressType, setAddressType] = useState("HOME");
  const [addressInput, setAddressInput] = useState("");
  const [useShippingForBilling, setUseShippingForBilling] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [useEditMode, setUseEditMode] = useState(false);
  const [debouncedInput] = useDebounceValue(addressInput, 500);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<boolean>(false);

  const form = useForm<ShippingInput>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      deliveryInstructions: "",
    },
  });
  const formBilling = useForm<BillingInput>({
    resolver: zodResolver(billingAddressSchema),
  });

  useEffect(() => {
    if (debouncedInput && !selectedAddress) {
      fetchSuggestions(debouncedInput);
    } else {
      setSuggestions([]);
    }
  }, [debouncedInput, selectedAddress]);
  const { data, mutate, isLoading } = useSWR(
    `/api/customer/profile/saved-address`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const savedAddress = data?.data;
  const isAddressLoading = isLoading || !data;

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

  const handleEditAddress = (address: SavedAddressType) => {
    setSelectedAddress(false);
    setShowAddressForm(true);
    setUseEditMode(true);
    setSelectedAddressId(address.id);

    setAddressInput(address?.shippingInfo?.addressLine1 || "");
    setSelectedAddress(false);
    const { id: shippingId, ...shippingValues }: any = address.shippingInfo;
    const { id: billingId, ...billingValues }: any = address.billingInfo;

    form.reset({
      ...shippingValues,
      deliveryInstructions: address.shippingInfo.deliveryInstructions || "",
      addressLine2: address.shippingInfo.addressLine2 || "",
    });
    form.setValue(
      "deliveryInstructions",
      address.shippingInfo.deliveryInstructions || ""
    );
    formBilling.reset({
      ...billingValues,
      addressLine2: address.billingInfo.addressLine2 || "",
    });
    setAddressType(address.addressType);
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      setDeleting(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/customer/profile/saved-address`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: addressId }),
        }
      );

      const data = await response.json();
      setDeleting(false);

      if (data.success) {
        toast.success(data.message);
        mutate();
      } else {
       toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again later.");
      setDeleting(false);
    }
  };

  async function onSubmit(
    shippingValues: ShippingInput,
    billingValues?: BillingInput
  ) {
    billingValues = billingValues || formBilling.getValues();
    try {
      setError(false);
      setErrorMsg("");
      setLoading(true);

   
      if (useEditMode) {
        const originalAddress = savedAddress.find((addr: any) => addr.id === selectedAddressId);
        
        const isShippingChanged = Object.keys(shippingValues).some(key => 
          shippingValues[key as keyof ShippingInput] !== originalAddress?.shippingInfo[key as keyof ShippingInput]
        );
        
        const isBillingChanged = Object.keys(billingValues).some(key => 
          billingValues[key as keyof BillingInput] !== originalAddress?.billingInfo[key as keyof BillingInput]
        );
  
        if (!isShippingChanged && !isBillingChanged) {
            toast.info("No changes were made to the address.");
          setUseEditMode(false);
          setShowAddressForm(false);
          setLoading(false);
          return;
        }
      }
  
      const checkAvailabilityResponse = await fetch(
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
      const checkAvailabilityData = await checkAvailabilityResponse.json();
      setLoading(false);
      if (checkAvailabilityData.success) {
        const response = await fetch(
          process.env.NEXT_PUBLIC_URL + "/api/customer/profile/saved-address",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: selectedAddressId,
              addressType: addressType,
              isDefault: false,
              shippingInfo: shippingValues,
              billingInfo: billingValues,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          setShowAddressForm(false);
              toast.success(data.message);
          mutate();

          form.reset();
          formBilling.reset();
          setSelectedAddressId(null);
          setSelectedAddress(false);
        } else {
          setError(true);
          setErrorMsg(data.message);
          toast.error(data.message);
        }
      } else {
        setError(true);
        setErrorMsg(checkAvailabilityData.message);
        toast.error(checkAvailabilityData.message);
      }
    } catch (error) {
      setError(true);
      setErrorMsg("Something went wrong. Please try again later.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  const inputclass = "p-2 rounded-md border border-gray-300";

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-1 justify-between items-center mb-3">
        <div>
          <h1 className="text-xl font-semibold">Saved Address</h1>
          <p className="text-sm text-gray-500 mt-2 mb-6">
            Manage your saved addresses to make your shopping experience faster
            and easier.
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => {
            setShowAddressForm(!showAddressForm);
            setUseEditMode(false);
          }}
        >
          Add New Address
        </Button>
      </div>

      {isAddressLoading && (
        <div className="text-center text-base border-2 border-primary rounded-sm p-6">
          Please wait...
        </div>
      )}

      {!isAddressLoading && savedAddress?.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {savedAddress.map((address: any) => (
            <div
              className="relative rounded-md border-2 p-6 bg-white"
              key={address.id}
            >
              <div className="bg-primary text-white w-fit px-2 py-1 rounded-sm  font-semibold text-xs mb-2">
                {address.addressType}
              </div>
              <div className="text-sm ">
                <p className="font-semibold text-base mb-2">
                  {address.shippingInfo.fullName}
                </p>
                <p>{address.shippingInfo.addressLine1}</p>
                <p>{address.shippingInfo.addressLine2}</p>

                <p className="">
                  {address.shippingInfo.city}, {address.shippingInfo.state},{" "}
                  <span className="font-semibold">
                    {address.shippingInfo.zipCode}
                  </span>
                </p>
                <p className="text-sm mt-3 font-semibold">
                  Phone: {address.shippingInfo.phone}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="absolute top-2 right-2">
                    <Ellipsis size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleEditAddress(address)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteAddress(address.id)}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {savedAddress?.length === 0 && !showAddressForm && (
        <div className="text-center text-gray-500 py-12 border-2 border-primary rounded-sm">
          <p>No saved address found.</p>
          <Button
            variant="link"
            className="underline text-primary hover:text-primary/80"
            onClick={() => setShowAddressForm(true)}
          >
            Add New Address
          </Button>
        </div>
      )}

      {showAddressForm && (
        <div className="mt-4 bg-white p-6 rounded-md">
          <h1 className="text-lg font-semibold mb-3">Shipping information</h1>
          <>
            <p className="text-sm font-semibold mb-2">Select Address Type</p>
            <RadioGroup
              defaultValue={addressType || "HOME"}
              onValueChange={(value) => setAddressType(value)}
              className="flex items-center space-x-2 mb-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="HOME" id="r1" />
                <Label htmlFor="r1">Home</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="WORK" id="r2" />
                <Label htmlFor="r2">Work</Label>
              </div>
            </RadioGroup>
          </>
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit((shippingValues: ShippingInput) =>
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
                            <Input
                              className={inputclass}
                              placeholder="Phone"
                              type="number"
                              {...field}
                            />
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
                              setSelectedAddress(false);
                              setAddressInput(e.target.value);
                              form.setValue("addressLine1", e.target.value);
                            }}
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

          <div className="mt-6">
            <h1 className="text-lg font-semibold mb-3">Billing information</h1>
            <Form {...formBilling}>
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="sameinfo"
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
                  onSubmit={formBilling.handleSubmit(
                    (billingValues: BillingInput) =>
                      onSubmit(form.getValues(), billingValues)
                  )}
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
                            Street Address{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={inputclass}
                              placeholder="Address"
                              type="text"
                              {...field}
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

          <div className="mt-3 mb-3">
            {error && <Alert variant="error" message={errorMsg} />}
          </div>

          <Button
            disabled={isLoading}
            onClick={() => {
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
            }}
          >
            {loading
              ? useEditMode
                ? "Updating..."
                : "Saving..."
              : useEditMode
              ? "Update Address"
              : "Save Address"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default SavedAddressForm;
