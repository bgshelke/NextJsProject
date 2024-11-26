import { z, object, string, number, array } from "zod";

export const OurMenuSchema = object({
  description: string().optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, `Item is required`),
        itemName: z.string().min(1, `Name is required`),
      })
    )
    .min(1, "At least one name is required"),
  thumbnail: z
    .any()
    .refine((files) => files?.length == 1, "Image is required.")
    .refine((files) => files?.[0]?.size <= 5000000, `Max file size is 5MB.`)
    .refine(
      (files) =>
        files?.[0]?.type === "image/jpeg" ||
        files?.[0]?.type === "image/jpg" ||
        files?.[0]?.type === "image/png",
      { message: "File must be a .jpeg or .jpg or .png" }
    ),
  date: z.string().min(1, { message: "Date is required." }),
});

export const OurMenuEditSchema = OurMenuSchema.extend({
  thumbnail: z
    .any()
    .optional()
    .refine(
      (files) => {
        if (!files || files.length === 0) return true; 
        if (files.length !== 1) return false; 
        return files[0]?.size <= 5000000; 
      },
      `Max file size is 5MB.`
    )
    .refine(
      (files) => {
        if (!files || files.length === 0) return true; 
        if (files.length !== 1) return false;
        return ["image/jpeg", "image/jpg", "image/png"].includes(files[0]?.type);
      },
      { message: "File must be a .jpeg or .jpg or .png" }
    ),
});

export type OurMenuInputSchema = z.infer<typeof OurMenuSchema>;

const PlanType = z.enum(["MEAL", "CURRY"]);
const MealPreference = z.enum(["VEG", "NON_VEG"]);
const UnitType = z.enum(["OZ", "PCS"]);

export const MenuItemsSchema = z.object({
  item: z
    .string()
    .min(4, { message: "Item must be at least 4 characters long" })
    .max(150, { message: "Item must be less than 150 characters long" })
    .transform((item) => item.trim()),
  price: z
    .string()
    .min(1, { message: "Price must be at least 1 character long" })
    .max(3, { message: "Price must be less than 3 characters long" })
    .regex(/^[0-9]+$/, { message: "Price must only contain numbers" }),
  planType: z.array(PlanType),
  mealPreference: MealPreference,
  unit: z
    .string()
    .min(1, { message: "OZ must be at least 1 character long" })
    .max(3, { message: "OZ must be less than 3 characters long" })
    .regex(/^[0-9]+$/, { message: "OZ must only contain numbers" }),
  unitType: UnitType,
  thumbnail: z
    .any()
    .optional()
    .refine((files) => !files || files.length === 1, "Image is required.")
    .refine(
      (files) => !files || files[0]?.size <= 5000000,
      "Max file size is 5MB."
    )
    .refine(
      (files) =>
        !files ||
        ["image/jpeg", "image/jpg", "image/png"].includes(files[0]?.type),
      { message: "File must be a .jpeg or .jpg or .png" }
    ),
});

export const MenuItemsCreateSchema = MenuItemsSchema.extend({
  thumbnail: z
    .any()
    .refine((files) => files?.length == 1, "Image is required.")
    .refine((files) => files?.[0]?.size <= 5000000, `Max file size is 5MB.`)
    .refine(
      (files) =>
        files?.[0]?.type === "image/jpeg" ||
        files?.[0]?.type === "image/jpg" ||
        files?.[0]?.type === "image/png",
      { message: "File must be a .jpeg or .jpg or .png" }
    ),
});

export type MenuItemsInput = z.infer<typeof MenuItemsSchema>;
export type MenuItemsCreateInput = z.infer<typeof MenuItemsCreateSchema>;

export const timeSlotSchema = z.object({
  timeStart: z.string({
    required_error: "Please Enter Time Start.",
  }),
  timeEnd: z.string({
    required_error: "Please Enter Time End.",
  }),
});

export type TimeSlotInput = z.infer<typeof timeSlotSchema>;

export const openHoursSchema = z.object({
  openTime: z.string(),
  closeTime: z.string(),
});

export type OpenHoursInput = z.infer<typeof openHoursSchema>;

export const planSettingsSchema = z.object({
  deliveryFees: z
    .string()
    .min(0, { message: "Delivery fees must be at least 0" })
    .max(3, { message: "Delivery fees must be less than 3 digits" })
    .regex(/^[0-9]+$/, { message: "Delivery fees must only contain numbers" }),
  maxAmountForFreeDelivery: z
    .string()
    .min(0, { message: "Max amount for free delivery must be at least 0" })
    .max(3, {
      message: "Max amount for free delivery must be less than 3 digits",
    })
    .regex(/^[0-9]+$/, {
      message: "Max amount for free delivery must only contain numbers",
    }),
  disableActionAndEmailToSend: z
    .string()
    .min(0, { message: "Disable action and email to send must be at least 0" })
    .max(3, {
      message: "Disable action and email to send must be less than 3 digits",
    })
    .regex(/^[0-9]+$/, {
      message: "Disable action and email to send must only contain numbers",
    }),
  timeForPreparing: z
    .string()
    .min(0, { message: "Time for preparing must be at least 0" })
    .max(3, { message: "Time for preparing must be less than 3 digits" })
    .regex(/^[0-9]+$/, {
      message: "Time for preparing must only contain numbers",
    }),
  minQtyOfItem: z
    .string()
    .min(0, { message: "Min qty of item must be at least 0" })
    .max(3, { message: "Min qty of item must be less than 3 digits" })
    .regex(/^[0-9]+$/, {
      message: "Min qty of item must only contain numbers",
    }),
  maxQtyOfItem: z
    .string()
    .min(0, { message: "Max qty of item must be at least 0" })
    .max(3, { message: "Max qty of item must be less than 3 digits" })
    .regex(/^[0-9]+$/, {
      message: "Max qty of item must only contain numbers",
    }),
  loopMenu: z
    .enum(['4', '5', '6'])
    .transform(Number)
    .refine((value) => value === 4 || value === 5 || value === 6, {
      message: "Loop menu must be 4, 5, or 6",
    }),
    timeToStopAction: z.string({
      required_error: "Please Enter Time Start.",
    }),
});

export type PlanSettingsInput = z.infer<typeof planSettingsSchema>;

export const KitchenSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "Kitchen name is required.",
    })
    .transform((name) => name.trim()),
  address: z.string().min(1, {
    message: "Kitchen address is required.",
  }),
  phone: z.string().min(1, { message: "Phone number is required" }),
  email: z
    .string()
    .min(1, {
      message: "Kitchen email is required.",
    })
    .email({ message: "Kitchen email is invalid." }),
  isDefault: z.boolean().optional(),
});

export type KitchenInput = z.infer<typeof KitchenSchema>;
