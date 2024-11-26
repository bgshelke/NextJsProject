import Image from "next/image";

export default function Loading() {
  return (
    <div>
      <div className="flex justify-center items-center h-screen">
        <Image
          src="/logo.svg"
          alt="loading"
          width={100}
          height={100}
          className="animate-pulse"
        />
      </div>
    </div>
  );
}
