import OrderSkeleton from "./OrderSkeleton";

export default function LoadingOrder() {
  return (
    <div className="w-full">
      <OrderSkeleton />
      <OrderSkeleton />
    </div>
  );
}
  