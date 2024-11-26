import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
export default async function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "ADMIN") {
    redirect("/admin");
  }
  if (session?.user.role === "CUSTOMER") {
    redirect("/");
  }

  return (
    <div className="w-full overflow-hidden relative  lg:min-h-screen  bg-white  bg-[url('/images/bg-vector.svg')] bg-contain bg-right-bottom">
      <Image
        src="/images/gray-pattern.svg"
        className="absolute top-0 left-0"
        alt="bg-vector"
        width={500}
        height={500}
      />
      <Image
        src="/images/gray-pattern.svg"
        className="absolute top-0 left-0 "
        alt="bg-vector"
        width={500}
        height={500}
      />
      <Image
        src="/images/discount48095388.png"
        className="absolute bottom-24 left-16 max-md:hidden"
        alt="bg-vector"
        width={100}
        height={100}
      />
      <div className="flex flex-col justify-center items-center w-full relative z-40 p-12 lg:p-16">
        {children}
      </div>
    </div>
  );
}
