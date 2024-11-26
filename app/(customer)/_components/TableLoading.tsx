import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

type propsType = {
  colsLength: number;
};

function TableSkeleton(props: propsType) {
  const colsLength = props.colsLength;
  return (
    <TableRow className="w-full">
      <TableCell colSpan={colsLength} className="h-24 text-center">
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full" />
      </TableCell>
    </TableRow>
  );
}

export function NoDataTable(props: propsType) {
  const colsLength = props.colsLength;
  return (
    <TableRow>
      <TableCell colSpan={colsLength} className="h-24 text-center">
        No Data.
      </TableCell>
    </TableRow>
  );
}

export default TableSkeleton;
