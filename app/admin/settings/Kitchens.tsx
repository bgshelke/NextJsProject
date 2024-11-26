"use client";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { KitchenSchema } from "@/types/zod/AdminSchema";
  import { KitchenInput } from "@/types/zod/AdminSchema";
import { Kitchen } from "@prisma/client";
import { useKitchens } from "@/contexts/KitchenContext";
// import { useKitchenStore } from "@/stores/kitchenStore";

function Kitchens() {
  const {kitchens,setKitchens}= useKitchens();
  const [isUpdating, setIsUpdating] = useState(false);
  const [editKitchenId, setEditKitchenId] = useState<string | null>(null);
  const [deletingKitchenId, setDeletingKitchenId] = useState<string | null>(
    null
  );
  const form = useForm<KitchenInput>({
    resolver: zodResolver(KitchenSchema),
  });

  async function onSubmit(values: KitchenInput) {
    setIsUpdating(true);
    try {
      const method = editKitchenId ? "PUT" : "POST";
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + `/api/admin/settings/kitchen/`,
        {
          method,
          body: JSON.stringify({ ...values, id: editKitchenId }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const res = await response.json();
      setIsUpdating(false);
      if (res.success) {
        toast.success(res.message);
        form.reset({ name: "", address: "", phone: "", email: "" });
        setEditKitchenId(null);

        setKitchens((prevKitchens:Kitchen[]) => {
          if (method === "PUT") {
            return prevKitchens.map((kitchen:Kitchen) =>
              kitchen.id === editKitchenId ? res.data : kitchen
            );
          } else {
            return [...prevKitchens, res.data];
          }
        });
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      setIsUpdating(false);
      console.log(error);
      toast.error("Error adding/updating kitchen. Please try again.");
    }
  }

  const handleEdit = (id: string) => {
    const kitchen = kitchens.find((k:Kitchen) => k.id === id);
    if (kitchen) {
      form.setValue("name", kitchen.name);
      form.setValue("address", kitchen.address);
      form.setValue("phone", kitchen.phone);
      form.setValue("email", kitchen.email);
      setEditKitchenId(id);
    }
  };

  const handleDelete = async (id: string) => {
    setIsUpdating(true);
    setDeletingKitchenId(id);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + `/api/admin/settings/kitchen`,
        {
          method: "DELETE",
          body: JSON.stringify({ id }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const res = await response.json();
      setIsUpdating(false);
      setDeletingKitchenId(null);
      if (res.success) {
        toast.success(res.message);
        setKitchens((prevKitchens:Kitchen[]) => prevKitchens.filter((k) => k.id !== id));
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      setIsUpdating(false);
      setDeletingKitchenId(null);
      console.log(error);
      toast.error("Error deleting kitchen. Please try again.");
    }
  };

  return (
  <>
   <h2 className="text-xl font-semibold tracking-tight">
        Pickup Locations
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Here you can manage the pickup locations.
      </p>

    <div className="flex items-start justify-between gap-6 mt-4">
      <div className="w-full md:w-2/3">
        <div className="flex flex-col gap-4  rounded-md">
          {kitchens.map((kitchen:Kitchen) => (
            <div
              key={kitchen.id}
              className="flex items-center p-4 justify-between text-sm bg-white border-2 border-primary rounded-md"
            >
              <div className="space-y-1">
                <p className="font-semibold">
                  {kitchen.name} | {kitchen.phone}{" "}
                  {kitchen.isDefault && (
                    <Badge className="bg-green-600 text-white">Default</Badge>
                  )}
                </p>
                <p>{kitchen.address}</p>
                <p>{kitchen.email}</p>
              </div>
              <div className="flex items-start gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEdit(kitchen.id)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(kitchen.id)}
                  disabled={kitchen.isDefault || isUpdating}
                >
                  {deletingKitchenId === kitchen.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border p-6 rounded-md  w-full md:w-1/3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {editKitchenId ? "Edit Pickup Location" : "Add Pickup Location"}
          </h2>
          {editKitchenId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditKitchenId(null)}
            >
              Cancel Edit
            </Button>
          )}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Location Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Pickup Location Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. 123 Main St, Anytown, USA, 30001"
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
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isUpdating}>
              {!deletingKitchenId && isUpdating
                ? editKitchenId
                  ? "Updating Pickup Location..."
                  : "Adding Pickup Location..."
                : editKitchenId
                ? "Update Pickup Location"
                : "Add Pickup Location"}
            </Button>
          </form>
        </Form>
        <p className="text-sm text-muted-foreground mt-4">
          You can&apos;t delete the default pickup location.
        </p>
      </div>
    </div>
  </>
  );
}

export default Kitchens;
