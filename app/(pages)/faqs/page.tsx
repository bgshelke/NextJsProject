import FAQs from "@/components/Frontend/FAQs";
import Image from "next/image";
interface Description {
  type: string;
  children: { text: string; type: string }[];
}

interface FaqAttributes {
  Title: string;
  Description: Description[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Faq {
  id: number;
  attributes: FaqAttributes;
}

const fetchFaqs = async (): Promise<Faq[]> => {
  const res = await fetch(process.env.NEXT_PUBLIC_CMS_URL + "/api/faqs", {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const data = await res.json();
  return data.data;
};

async function Page() {
  const faqs = await fetchFaqs();

  return (
    <div className="w-full mx-auto overflow-hidden relative bg-white">
      <Image
        src="/images/gray-pattern.svg"
        className="absolute top-0 left-0 -z-1"
        alt="bg-vector"
        width={500}
        height={500}
      />
      <div className=" max-w-3xl mx-auto relative z-10">
        <FAQs data={faqs} />
      </div>
    </div>
  );
}

export default Page;
