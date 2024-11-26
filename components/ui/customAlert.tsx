import { CircleAlert, CircleCheck } from "lucide-react";

export default function Alert({ variant, message ,className}: { variant: "success" | "error" | "default", message: string, className?: string}) {
  if (variant === "error") {
    return (
      <div className={`bg-destructive text-white p-4  text-sm rounded-md flex items-center gap-2 font-medium ${className}`}>
        <CircleAlert size={17} /> {message}
      </div>
    );
  } 
  if (variant === "success") {
    return (
      <div className={`bg-green-700 text-white p-4  text-sm rounded-md flex items-center gap-2 font-medium ${className}`}>
        <CircleCheck size={17} /> {message}
      </div>
    );
  } 

  if (variant === "default") {
    return (
      <div className={`bg-white text-gray-800 p-4  text-sm rounded-md flex items-center gap-2 font-medium ${className}`}>
    {message}
      </div>
    );
  }
  else {
    return (
      <></>
    );
  }
}
