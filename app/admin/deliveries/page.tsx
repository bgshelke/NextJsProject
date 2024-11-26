import DeliveriesTable from "./DeliveriesTable";
export const metadata = {
  title: "Deliveries",
  description: "Manage your deliveries & orders",
};
function page() {
  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="text-sm text-gray-500">Manage your deliveries & orders</p>
      </div>
      <DeliveriesTable />
    </div>
  );
}

export default page;
