import Image from "next/image";
import Link from "next/link";

export default function HowItWorks() {
  return (
    <>
      <div className="p-6 md:p-20 relative bg-white" id="how-it-works">
        <Image
          src="/images/bg-vector.svg"
          className="absolute top-0 left-0 "
          width={500}
          height={500}
          alt="vector bg"
        />
        <div className="relative z-30">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-semibold mb-2">
              How it <span className="text-second dw-underline1">works</span>
            </h1>
            <p>
              A simple 3 steps to have an authentic Indian cuisine from
              Dabbahwala
            </p>
          </div>
          <div className="worksteps md:max-w-2xl mx-auto">
            <ul>
              <li>
                <div className="content">
                  <Image
                    src={"/images/step1.png"}
                    width={250}
                    height={250}
                    alt="step 1"
                  />
                </div>
                <div className="pointstep">
                  <Image
                    src="/icons/step-one-icon.svg"
                    width={40}
                    height={40}
                    alt="step 1"
                  />
                </div>
                <div className="date">
                  <h2 className="text-xl font-semibold mb-2">
                    Choose your plan
                  </h2>
                  <p className="text-sm md:text-base text-gray-600">
                    Explore our weekly menu and choose your preferred dishes,
                    delivery date, and time. Remember, we accept orders up to 4
                    hours before your selected delivery time.
                  </p>
                </div>
              </li>
              <li>
                <div className="content">
                  <Image
                    src={"/images/step-2.png"}
                    width={250}
                    height={250}
                    alt="step 2"
                  />
                </div>
                <div className="pointstep">
                  <Image
                    src="/icons/step-two-icon.svg"
                    width={40}
                    height={40}
                    alt="step 2"
                  />
                </div>
                <div className="date text-right">
                  <h2 className="text-xl font-semibold mb-2">
                    Sign up with us
                  </h2>
                  <p className="text-sm md:text-base text-gray-600">
                    If you&apos;re new to ordering, provide us with your basic
                    details. This helps us ensure smooth communication and
                    access for your convenience.
                  </p>
                </div>
              </li>
              <li>
                <div className="content">
                  <Image
                    src={"/images/step-3.png"}
                    width={280}
                    height={280}
                    alt="step 3"
                  />
                </div>
                <div className="pointstep">
                  <Image
                    src="/icons/step-three-icon.svg"
                    width={40}
                    height={40}
                    alt="step 3"
                  />
                </div>
                <div className="date">
                  <h2 className="text-xl font-semibold mb-2">Checkout</h2>
                  <p className="text-sm md:text-base text-gray-600">
                    We accept prepayment orders only, seamlessly integrated with
                    secure payment systems for your convenience. Your details
                    are always protected.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center">
          <Link href="/our-menu">
            <button className="btn-secondary">See Menu</button>
          </Link>
        </div>
      </div>
    </>
  );
}
