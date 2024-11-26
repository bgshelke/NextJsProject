import { KitchensProvider } from "@/contexts/KitchenContext";
import OrderHistoryTable from "./OrderHistoryTable";


export const metadata = {
  title: "Order History",
  description: "View your order history.",
};
function Page() {

  return (
    <div>
      <div>
      <h1 className="text-2xl font-semibold">Order History</h1>
      <p className="text-sm text-muted-foreground">
        History of your orders.
        </p>
        <div className="mt-4">
          <KitchensProvider>
            <OrderHistoryTable />
          </KitchensProvider>
        </div>
      </div>
    </div>
  );
}

export default Page;
