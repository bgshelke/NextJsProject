import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { WalletProvider } from "@/contexts/WalletContext";
import Providers from "./providers";
import { KitchensProvider } from "@/contexts/KitchenContext";
import { DwConfigProvider } from "@/contexts/DwConfigProvider";
import { ItemProvider } from "@/contexts/ItemContext";
import Navbar, { NavbarData } from "@/components/Frontend/Navbar";
import Footer from "@/components/Frontend/Footer";
import { Toaster } from "sonner";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/options";
import { getDwConfig, getItems, getOpenHours } from "./_serverActions/main";
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});


export const metadata: Metadata = {
  title: "Dabbahwala",
  description:
    "Dabbahwala is a platform for delivering authentic Indian cuisine to your doorstep.",
};


async function getNavbarData() {
  const res = await fetch(
    process.env.NEXT_PUBLIC_CMS_URL + "/api/dabbah-wala?populate=*",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const data: NavbarData = await res.json();
  if (!data) {
    return {
      data: {
        attributes: {
          topbar:
            "Subscriber Exclusive: Enjoy Free Delivery on Weekly Orders Over $100!",
          topbarLink: {
            LinkText: "Order Now",
            LinkUrl: "/plans",
          },
        },
      },
    };
  }
  return data;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const session = await getServerSession(authOptions);
  const items = await getItems();
  const openHours = await getOpenHours();
  const navbarData = await getNavbarData();
  const dwConfig = await getDwConfig();
 

  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`}
      >
       <Providers session={session}>
          <WalletProvider>
            <KitchensProvider>
              <DwConfigProvider dwConfig={dwConfig?.data || null}>
                <ItemProvider items={items?.data || []}>
                  <Navbar data={navbarData} />
                  {children}
                  <Footer />
                </ItemProvider>
              </DwConfigProvider>
              <Toaster richColors position="bottom-center" />
            </KitchensProvider>
          </WalletProvider>
        </Providers>
      </body>
    </html>
  );
}
