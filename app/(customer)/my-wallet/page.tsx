
import { TransactionsTable } from "./TransactionsTable";
import WalletAmount from "./WalletAmount";

export const metadata = {
  title: "Wallet History",
  description: "History of your wallet transactions.",
};
function WalletHistoryPage() {
  return (
    <div className="container mx-auto p-2">
     <div className="flex justify-between items-center gap-4">
     <div>
     <h1 className="text-2xl font-semibold">My Wallet</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Your wallet balance and transactions.
      </p>
     </div>
     <div className="space-y-1 text-right">
      <h2 className="text-lg font-semibold">Your Balance</h2>
      <WalletAmount />
     </div>
     </div>
      <div className="mt-4">
        <TransactionsTable />
      </div>
    </div>
  );
}

export default WalletHistoryPage;
