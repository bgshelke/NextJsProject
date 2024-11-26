import Image from "next/image";
import ContactForm from "@/components/Frontend/ContactForm";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ImageFormat {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: string | null;
  size: number;
  width: number;
  height: number;
  sizeInBytes: number;
}

interface ImageData {
  id: number;
  attributes: {
    name: string;
    formats: {
      large: ImageFormat;
    };
  };
}

interface ContactContent {
  Title: string;
  Address: string;
  Phone: string;
  Email: string;
  MapURL: string;
  TitleImage: {
    data: ImageData;
  };
}

const fetchContent = async (): Promise<ContactContent> => {
  const res = await fetch(
    process.env.NEXT_PUBLIC_CMS_URL + "/api/contact-page?populate=*",
    {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  const data = await res.json();
  return data?.data?.attributes;
};

async function Page() {
  const content = await fetchContent();

  return (
    <div className="bg-white ">
      <div
        className="bg-black bg-opacity-40 py-16 md:py-32 bg-cover bg-center"
        style={{
          backgroundImage: `url(${content?.TitleImage?.data?.attributes?.formats?.large?.url})`,
        }}
      >
        <div className="container mx-auto mt-4 flex justify-center items-center flex-col gap-6 ">
          <h1 className="text-4xl md:text-6xl font-bold text-white text-center">
            {content.Title || "Contact Us"}
          </h1>

          <Breadcrumb className="">
            <BreadcrumbList className="text-white">
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="hover:text-primary">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">Contact</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 flex flex-col gap-8 p-6 xl:p-0 mb-8">
        <div className="w-full flex flex-col md:flex-row gap-8 justify-center items-center">
          <div className="w-full md:w-1/3 grid grid-cols-1 gap-6 lg:gap-12 ">
            <div className="flex gap-4 items-start">
              <div className="flex items-center bg-green-100 p-4 rounded-full w-fit mx-auto h-fit">
                <Image
                  src="/icons/mapicon.svg"
                  width={25}
                  height={25}
                  alt="Location"
                />
              </div>
              <div className="w-full">
                <h2 className="text-lg font-semibold mt-4 mb-2">Address</h2>
                <p className="text-sm text-muted-foreground">Our Location</p>
                <p className=" text-primary text-sm font-semibold mt-2">
                  {content.Address}
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex items-center bg-green-100 p-4 rounded-full w-fit mx-auto h-fit">
                <Image
                  src="/icons/phoneicon.svg"
                  width={25}
                  height={25}
                  alt="Phone"
                />
              </div>

              <div className="w-full">
                <h2 className="text-lg font-semibold  mb-1">Phone</h2>
                <p className="text-sm text-muted-foreground">
                  Our Phone Number
                </p>
                <p className=" text-primary text-sm font-semibold mt-2">
                  {content.Phone}
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex items-center bg-green-100 p-4 rounded-full w-fit mx-auto h-fit">
                <Image
                  src="/icons/email-icon.svg"
                  width={25}
                  height={25}
                  alt="Email"
                />
              </div>
              <div className="w-full">
                <h2 className="text-lg font-semibold  mb-1">Email</h2>
                <p className="text-sm text-muted-foreground">
                  Our Email Address
                </p>
                <p className=" text-primary text-sm font-semibold mt-2">
                  {content.Email}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/3 p-6 lg:p-12 bg-white border-2 border-gray-100 rounded-sm">
            <h3 className="text-3xl font-semibold mb-3">Send Us Message</h3>
            <p className="mb-6 text-sm text-gray-800">
              Dont hesitate to send messge us, Our team will help you 24/7.
            </p>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page;
