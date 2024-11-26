import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import prisma from "@/lib/db";
import Credentials from "next-auth/providers/credentials";
import { getRandomCustomerId } from "@/lib/helper";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGEL_CLIENT_SECRET as string,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      authorize: async (credentials): Promise<any> => {
        const user = await prisma.user.findUnique({
          where: {
            email: credentials?.email,
          },
        });
   
        if (!user) {
          throw new Error("Invalid credentials");
        } else {
          const customer = await prisma.customer.findUnique({
            where: {
              userId: user.id,
              user: {
                role: "CUSTOMER",
              },
            },
          });
          if(!customer){
            throw new Error("Invalid credentials");
          }
          if(user.isVerified === false){
            throw new Error("Please verify your email.");
          }
          if(!customer.password){
            throw new Error("Invalid credentials");
          }
          if (customer) {
            const pwMatch = bcrypt.compareSync(
              credentials?.password as string,
              customer.password as string
            );
            if (pwMatch) {
              return user;
            }
            throw new Error("Invalid credentials");
          }

          const admin = await prisma.admin.findUnique({
            where: {
              userId: user.id,
              isVerified: true,
              user: {
                role: { in: ["ADMIN", "SUPER_ADMIN"] },
              },
            },
          });

          if (admin) {
            const pwMatch = bcrypt.compareSync(
              credentials?.password as string,
              admin.password as string
            );
            if (pwMatch) {
              return user;
            }
            throw new Error("Invalid credentials");
          }
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/",
  },
  callbacks: {

    // async redirect({ url, baseUrl, }) {
    //   url.includes("return=true") ? url.replace("return=true", "/plans/checkout/") : baseUrl;
    //   return baseUrl;
    // },

    async signIn({ user, account }) {
      if (account?.provider !== "credentials") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account?.provider as string,
                providerAccountId: account?.providerAccountId as string,
              },
            },
            update: {
              userId: existingUser.id,
            },
            create: {
              userId: existingUser.id,
              provider: account?.provider as string,
              providerAccountId: account?.providerAccountId as string,
              type: account?.type as string,
              refresh_token: account?.refresh_token as string,
              access_token: account?.access_token as string,
              expires_at: account?.expires_at as number,
              token_type: account?.token_type as string,
              scope: account?.scope as string,
              id_token: account?.id_token as string,
              session_state: account?.session_state as string,
            },
          });
        } else {
          // Create a new user and link the OAuth account
          const newUser = await prisma.user.create({
            data: {
              name: user.name,
              email: user.email,
              isVerified: true,
              image: user.image,
              role: "CUSTOMER",
            },
          });

          const customer = await prisma.customer.create({
            data: {
              userId: newUser.id,
              email: newUser.email as string,
              firstName: user.name?.split(" ")[0] ?? "",
              lastName: user.name?.split(" ").slice(1).join(" ") ?? "",
              googleId:
                account?.provider === "google"
                  ? account?.providerAccountId
                  : undefined,
              appleId:
                account?.provider === "apple"
                  ? account?.providerAccountId
                  : undefined,
              customerUniqueId: getRandomCustomerId(),
            },
          });
          await prisma.userPreference.create({
            data: {
              customerId: customer.id,
            },
          });
          await prisma.account.create({
            data: {
              userId: newUser.id,
              provider: account?.provider as string,
              providerAccountId: account?.providerAccountId as string,
              type: account?.type as string,
              refresh_token: account?.refresh_token as string,
              access_token: account?.access_token as string,
              expires_at: account?.expires_at as number,
              token_type: account?.token_type as string,
              scope: account?.scope as string,
              id_token: account?.id_token as string,
              session_state: account?.session_state as string,
            },
          });
        }
      }

      return true;
    },
    async session({ session, token }) {
      const ordersCount = await prisma.order.count({
        where: {
          customer: {
            userId: token.id,
          },
        },
      });

      session.user = {
        id: token.id,
        name: token.name,
        email: token.email,
        isVerified: token.isVerified,
        role: token.role,
        orders: ordersCount || 0,
      };
      return session;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.isVerified = user.isVerified;
        token.role = user.role;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
};
