import FAQs from "@/components/Frontend/FAQs";
import HeroSlider from "@/components/Frontend/Home/HeroSlider";
import HowItWorks from "@/components/Frontend/Home/HowItWorks";
import WhyDabbahwala from "@/components/Frontend/Home/WhyDabbahwala";
import { Faq } from "./(pages)/faqs/page";
import AutoFixedAddress from "@/components/Frontend/AutoFixedAddress";
async function getSlidesData() {
  const res = await fetch(
    process.env.NEXT_PUBLIC_CMS_URL + "/api/carousels?populate=*",
    {
      cache: "no-store",
    }
  );
  const data = await res.json();
  return data;
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

export default async function Home() {
  const slidesData = await getSlidesData();
  const faqs = await fetchFaqs();

  return (
    <>
      <HeroSlider data={slidesData} />
      <AutoFixedAddress />
      <WhyDabbahwala />
      <HowItWorks />
      <FAQs data={faqs} />
    </>
  );
}
