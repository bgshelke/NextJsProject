import PickupTable from "./PickupTable";

// import PickupTable from "./PickupTable";
export const metadata = {
  title: "Pickup Orders",
  description: "Manage your pickup orders",
};
function page() {
  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-bold">Pickup Orders</h1>
        <p className="text-sm text-gray-500">Manage your pickup orders</p>
      </div>
      <PickupTable />
    </div>
  );
}

export default page;
