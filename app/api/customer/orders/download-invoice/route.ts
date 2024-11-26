import prisma from "@/lib/db";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { stripe } from "@/lib/stripe";
import { ApiResponse } from "@/lib/response";

export async function POST(req: Request) {
  try {
    const { invoiceId } = await req.json();
    console.log("invoiceId", invoiceId);
    const user = await getServerSession(authOptions);

    if (!user) {
      return ApiResponse(false, "Unauthorized", 401);
    }

    if (user.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: user.user.id,
        email: user.user.email,
      },
    });

    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    const invoice = await stripe.invoices.retrieve(invoiceId);

    if (!invoice) {
      return ApiResponse(false, "Invoice not available", 404);
    }

    if (invoice.customer_email !== customer.email) {
      return ApiResponse(false, "Invoice not available", 404);
    }

    if (!invoiceId) {
      return ApiResponse(false, "Invoice ID is required", 400);
    }

    return ApiResponse(true, "Invoice Available", 200, invoice.invoice_pdf);
  } catch (error) {
    console.log("Error downloading invoice", error);
    return ApiResponse(false, "Internal Server Error", 500);
  }
}
