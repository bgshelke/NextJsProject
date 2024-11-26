
import { renderRichText } from "@/components/ui/renderRichText";
import { RichTextBlock } from "@/types/main";
import { notFound } from "next/navigation";

const fetchContent = async (): Promise<any> => {
  const res = await fetch(
    process.env.NEXT_PUBLIC_CMS_URL + "/api/terms?populate=*",
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
  if (!content) return notFound();
  return (
    <div className="max-w-6xl mx-auto my-16 md:mt-20 px-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">{content.Title}</h1>
      {content.Content.map((block: RichTextBlock, index: number) =>
        renderRichText(block, index)
      )}
    </div>
  );
}

export default Page;
