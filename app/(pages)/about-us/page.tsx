
import { renderRichText } from "@/components/ui/renderRichText";
import { RichTextBlock } from "@/types/main";
import Image from "next/image";
interface AboutContent {
  PageTitle: string;
  TitleDescription: string;
  TitleImage: {
    data: {
      attributes: {
        url: string;
        formats: {
          large: {
            url: string;
          };
        };
      };
    };
  };
  Content: RichTextBlock[];
}
const fetchContent = async (): Promise<AboutContent> => {
  const res = await fetch(
    process.env.NEXT_PUBLIC_CMS_URL + "/api/about?populate=*",
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
  const titleImageUrl =
    content?.TitleImage?.data?.attributes?.formats?.large?.url;
  return (
    <div className="">
      <div
        className="bg-black bg-opacity-50 p-8 md:p-24 bg-cover bg-center"
        style={{ backgroundImage: `url(${titleImageUrl})` }}
      >
        <div className="max-w-7xl mx-auto mt-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {content.PageTitle}
          </h1>
          <p className="text-white md:text-xl">{content.TitleDescription}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 container mx-auto p-8 ">
        <Image src="/images/m3.png" width={500} height={500} alt="About" />

        <div className="content-center">
          {content.Content.map((block: RichTextBlock, index: number) => (
            <div key={index} className="mb-4">
              {renderRichText(block, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Page;
