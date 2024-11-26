import { Faq } from "@/app/(pages)/faqs/page";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

function FAQs({ data, className }: { data: Faq[]; className?: string }) {
  return (
    <div className="p-8 md:p-24">
      <h1 className="text-3xl md:text-4xl font-semibold text-center mb-4">
        Frequently Asked
        <span className="text-second dw-underline1"> Questions</span>
      </h1>
      <p className="text-center ">
        We are here to help you with any questions you may have.
      </p>

      <div className="max-w-3xl mx-auto mt-12">
        <Accordion type="single" collapsible className={className}>
          {data?.map((item: any) => (
            <AccordionItem
              value={item.attributes.Title}
              className=" mb-2 border-none "
              key={item.id}
            >
              <AccordionTrigger className="p-4 rounded-full bg-white border text-left font-semibold shadow-sm">
                {item.attributes.Title}
              </AccordionTrigger>
              <AccordionContent className="pt-4 px-4 text-muted-foreground ">
                {item.attributes.Description.map((desc: any, index: any) => (
                  <p key={index}>{desc.children[0].text}</p>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

export default FAQs;
