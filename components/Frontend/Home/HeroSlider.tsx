"use client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

function HeroSlider({ data }: { data: any }) {
  const router = useRouter();

  return (
    <Carousel
      plugins={[
        Autoplay({
          delay: 8000,
        }),
      ]}
      opts={{ loop: true }}
      className="relative bg-gray-50 bg-[url('/images/bg-vector.svg')] bg-blend-multiply bg-opacity-10  bg-contain bg-center overflow-hidden"
    >
      <Image
        src="/images/slide-vector.png"
        alt="slide"
        width={900}
        height={900}
        className="absolute right-0 bottom-0 w-2/5 md:w-[65%]  object-cover"
      />
      <Image
        src="/images/ecofriendly.png"
        alt="slide"
        width={250}
        height={250}
        className="absolute right-4 md:right-8 bottom-4 md:bottom-8 w-[200px] md:w-[250px] object-contain"
      />
      <CarouselContent>
        {data?.data?.map((slide: any) => {
          const large =
            slide?.attributes?.Image?.data?.attributes?.formats?.large?.url;
          const medium =
            slide?.attributes?.Image?.data?.attributes?.formats?.medium?.url;
          const small =
            slide?.attributes?.Image?.data?.attributes?.formats?.small?.url;
          const imageUrl = large || medium || small || "/images/m3.png";

          return (
            <CarouselItem
              key={slide.id}
              className="w-full relative md:min-h-[75vh] flex items-center py-16 px-12"
            >
              <div
                onClick={() => router.push(slide.attributes.ButtonLink)}
                className="relative container mx-auto flex flex-col-reverse lg:flex-row items-center justify-center gap-8 lg:gap-x-16 z-20"
              >
                <div className="flex items-start flex-col max-md:text-center">
                  <h1 className=" text-3xl md:text-4xl lg:text-5xl xl:text-[3.5rem] lg:leading-snug xl:leading-snug font-bold md:max-w-[600px] text-green-900">
                    {slide.attributes.Heading}
                  </h1>
                  <p className="mt-3 mb-5 max-w-lg text-sm  md:text-base md:leading-7 text-gray-600">
                    {slide.attributes.Description}
                  </p>
                  <div className="md:inline-flex items-center gap-4 max-md:space-y-5 max-md:w-full ">
                    <Link href={slide.attributes.ButtonLink}>
                      <button className="btn-secondary capitalize ">
                        {slide.attributes.ButtonText}
                      </button>
                    </Link>
                    <div>
                      <p className="text-sm  text-muted-foreground italic">
                        Skip or cancel anytime
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <Image
                    src={imageUrl}
                    alt={slide.attributes.Heading || "Slide image"}
                    width={500}
                    height={500}
                    priority
                    className="w-[90%]lg:w-[70%] object-contain"
                  />
                </div>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}

export default HeroSlider;
