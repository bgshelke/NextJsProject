import EmailVerification from "@/components/EmailTemplates/templates/EmailVerification";
import prisma from "@/lib/db";
import { sendEmail } from "@/lib/nodemailer";
import { ApiResponse } from "@/lib/response";
import { render } from "@react-email/render";


export async function POST(request: Request) {
  const { email, verifyCode } = await request.json();

  if (!email) {
    return ApiResponse(false, "Email not found", 404);
  }

  const requestUrl = new URL(request.url);

  const resendVerification = requestUrl.searchParams.get("resend");
  if (resendVerification) {
    const verifyCode = Math.floor(100000 + Math.random() * 900000);
    const emailExpirytime = new Date(new Date().getTime() + 60 * 60 * 1000);

    const emailToken = await prisma.emailVerification.update({
      where: {
        email,
      },
      data: {
        token: verifyCode.toString(),
        expires: emailExpirytime,
      },
    });

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    const html = await render(
      EmailVerification({
        username: user?.name ?? email,
        code: verifyCode.toString(),
      })
    );
    await sendEmail(email, "Verify Email", html);

    return ApiResponse(true, "Verification code sent", 200);
  }

  if (!verifyCode) {
    return ApiResponse(false, "Verification code not found", 404);
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        isVerified: true,
        customer: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingUser) {
      return ApiResponse(false, "User not found", 404);
    }

    if (existingUser.isVerified) {
      return ApiResponse(true, "User already verified", 200);
    }

    const emailtoken = await prisma.emailVerification.findUnique({
      where: {
        email,
      },
    });
    //check if token is expired
    if (emailtoken?.expires && emailtoken.expires < new Date()) {
      return ApiResponse(false, "Token expired", 400);
    }

    if (emailtoken?.token === verifyCode) {
      await prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });

      if (existingUser.customer) {
        await prisma.userPreference.create({
          data: {
            customerId: existingUser.customer.id,
          },
        });
      }
      //delete email verification
      await prisma.emailVerification.deleteMany({
        where: { email },
      });
      return ApiResponse(true, "Account verified.", 200);
    }

    return ApiResponse(false, "Invalid verification code", 400);
  } catch (error) {
    console.log("Error while verifying user", error);
    return ApiResponse(false, "Error while verifying user", 500);
  }
}
