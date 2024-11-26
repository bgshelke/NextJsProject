import { ScrollArea } from "@/components/ui/scroll-area";

import MenuItemsTable from "./MenuItemsTable";

export default function MenuItemsPage() {
  return (
    <ScrollArea className="h-full ">
      <div className="flex-1 space-y-4 p-4 md:p-8 ">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight">Menu Items</h2>
          <p className="text-sm text-muted-foreground">
            You can add, edit, or delete menu items here.
          </p>
        </div>
        <div>
          <MenuItemsTable />
        </div>
      </div>
    </ScrollArea>
  );
}
