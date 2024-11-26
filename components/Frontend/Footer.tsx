import Image from "next/image";
import Link from "next/link";

const fetchContent = async (): Promise<any> => {
  const res = await fetch(
    process.env.NEXT_PUBLIC_CMS_URL + "/api/socials?populate=*",
    {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  const data = await res.json();
  return data?.data;
};



const paymentMethods = [
  {
    src: "/icons/visa.svg",
    alt: "visa",
  },
  {
    src: "/icons/mastercard.svg",
    alt: "mastercard",
  },
  {
    src: "/icons/amex.svg",
    alt: "amex",
  },
  {
    src: "/icons/discover.svg",
    alt: "discover",
  },
];

async function Footer() {
  const socials = (await fetchContent()) || [];
  return (
    <>
      <div className="relative text-sm bg-green-950 text-white">
        <footer className="footer mt-auto w-full max-w-[85rem] pt-8 md:pt-16 pb-5 px-8 lg:px-24 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5  gap-8 mb-10">
            <div className="col-span-full lg:col-span-1 max-w-md:mb-8">
              <Image
                src="/logo.svg"
                alt="Logo"
                height={80}
                width={80}
                className="mb-4"
              />
              <p className="mt-3   text-gray-300">
                Delivering the authentic taste of India to your doorstep.{" "}
              </p>
              <div className="flex gap-4 mt-4">
                {socials.map((social: any) => (
                  <Link href={social.attributes.url} passHref key={social.id}>
                    <div className="bg-green-500 rounded-full p-2 hover:bg-green-800 transition">
                      <Image
                        src={social.attributes.icon.data.attributes.url}
                        height={20}
                        width={20}
                        alt={social.attributes.Title.toLowerCase()}
                        className="filter hover:invert w-4 h-4"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold uppercase">Explore</h4>
              <div className="mt-3 grid space-y-3  ">
                <p>
                  <Link href="/about-us">About Us</Link>
                </p>
                <p>
                  <Link href="/our-menu">Our Menu</Link>
                </p>
                <p>
                  <Link href="/plans">Plans & Pricing</Link>
                </p>
                <p>
                  <Link href="/#how-it-works">How it works</Link>
                </p>
              </div>
            </div>

            <div>
              <h4 className="  font-semibold    uppercase">Connect</h4>
              <div className="mt-3 grid space-y-3  ">
                <p>
                  <Link href="/contact">Contact Us</Link>
                </p>

                <p>
                  <Link href="/faqs">FAQs</Link>
                </p>
              </div>
            </div>

            <div>
              <h4 className="  font-semibold    uppercase">Legal</h4>
              <div className="mt-3 grid space-y-3  ">
                <p>
                  <Link href="/terms">Terms</Link>
                </p>
                <p>
                  <Link href="/privacy-policy">Privacy Policy</Link>
                </p>
                <p>
                  <Link href="/shipping-policy">Shipping Policy</Link>
                </p>
              </div>
            </div>

            <div>
              <h4 className="  font-semibold    uppercase">Payment Methods</h4>
              <div className="mt-3 grid space-y-3  ">
                <div className="gap-x-2 grid grid-cols-2 justify-start items-center w-fit">
                  

                  {paymentMethods.map((method,index) => (
                    <Image
                      key={method.alt + "index"}
                      src={method.src}
                      height={55}
                      width={55}
                      alt={method.alt}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-white items-center text-center">
            <p>Copyright © 2024 DabbahWala | All rights reserved.</p>
          </div>
        </footer>

        <Image
          src="/images/leaf.png"
          width={100}
          height={100}
          alt="Leaf"
          className="h-auto w-10 absolute bottom-6 right-6"
        />
      </div>
    </>
  );
}

export default Footer;
