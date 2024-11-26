import logo from "@/public/logo.svg";
import { BillingInfo } from "@/types/main";

export const logoUrl = logo.src;

export const NavLinks = [
  {
    label: "About Us",
    href: "/about-us",
  },
  {
    label: "Our Menu",
    href: "/our-menu",
  },
  {
    label: "Our Plan",
    href: "/plans",
  },
  {
    label: "FAQs",
    href: "/faqs",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export const MINIMUM_CHARGE_AMOUNT = 0.5;

export const kitchen = {
  name: "Dabbahwala",
  phone: "9876543210",
  address: "123, Main Street, New York, NY 10001",
};

export function getRandomCustomerId() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const randomNum = String(Math.floor(100 + Math.random() * 90));
  const incrementNumber = String(Math.floor(1000 + Math.random() * 90));
  return `${year}${incrementNumber}${randomNum}${day}${randomNum}`;
}

export function generateOrderId() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const randomNum = String(Math.floor(100 + Math.random() * 900));
  const incrementNumber = String(Math.floor(1000 + Math.random() * 90));
  return `${year}${incrementNumber}${randomNum}${day}${randomNum}`;
}

export function generateTransactionId() {
  return (
    "TXN" +
    Math.floor(100000 + Math.random() * 900000) +
    new Date().getMilliseconds()
  );
}

export const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function getPricingLabel(price: number) {
  return price.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export async function getTaxRate(total: number, address: BillingInfo) {

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_URL + "/api/checkout/calculate-tax",
      {
        method: "POST",
        body: JSON.stringify({
          total: total,
          address: address,
        }),
      }
    );
    const data = await response.json();
    if (data.success) {
      const taxRate = parseFloat(data.data.tax_rate);
      const amountToPay = total + (total * taxRate) / 100;
      const totalAfterTax = Math.round(amountToPay * 100) / 100;
      return { taxRate, totalAfterTax };
    } else {
      throw new Error("Failed to calculate tax");
    }
  } catch (error) {
    console.log(error);
    throw new Error("Failed to calculate tax");
  }
}
