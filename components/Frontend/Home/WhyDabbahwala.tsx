import Image from "next/image";

function WhyDabbahwala() {
  return (
    <div className="bg-primary/5 py-16  mx-auto lg:px-12">
      <h2 className="text-3xl md:text-4xl font-semibold text-center mb-6">
        Why Dabbah<span className="dw-underline1">wala</span>
      </h2>
      <p className=" text-center max-w-sm mx-auto">
        Discover the convenience of freshly cooked meals delivered right to your
        doorstep.
      </p>

      <div className="flex flex-col md:flex-row justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-16">
          <div className="text-center ">
            <Image
              src="/icons/cookingfood.svg"
              width="60"
              height="60"
              alt="Sames day cooked food"
              className="mx-auto mb-4"
            />
            <h3 className="font-semibold my-2 text-primary">
            Same Day Cooked Food
            </h3>
            <p className="text-sm text-gray-800/70 max-w-[250px] mx-auto">
            Enjoy freshly cooked meals delivered on the same day.  

            </p>
          </div>
          <div className="text-center">
            <Image
              src="/icons/deliveryman.svg"
              width="60"
              height="60"
              alt="Delivered at your doorstep"
              className="mx-auto mb-4"
            />
            <h3 className="font-semibold my-2 text-primary">
              Delivered At Your Doorstep
            </h3>
            <p className="text-sm text-gray-800/70 max-w-[250px] mx-auto">
            Experience the convenience of doorstep delivery.
            </p>
          </div>
        </div>

        <Image
          src="/images/m3.png"
          alt="Why Dabbahwala"
          width="600"
          height={"600"}
        />

        <div className="flex flex-col items-center justify-center gap-16">
          <div className="text-center">
            <Image
              src="/icons/customizable.svg"
              width="60"
              height="60"
              alt="Customizable"
              className="mx-auto mb-4"
            />
            <h3 className="font-semibold my-2 text-primary">
            Customizable Meal Plan
            </h3>
            <p className="text-sm text-gray-800/70 max-w-[250px] mx-auto">
              Tailor your meals to suit your dietary needs.
            </p>
          </div>
          <div className="text-center">
            <Image
              src="/icons/discount.svg"
              width="60"
              height="60"
              alt="Affordable"
              className="mx-auto mb-4"
            />
            <h3 className="font-semibold my-2 text-primary">Affordable</h3>
            <p className="text-sm text-gray-800/70 max-w-[250px] mx-auto">
            Enjoy quality meals at affordable prices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhyDabbahwala;
