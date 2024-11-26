import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Coupon {
  id: string;
  code: string;
  discountAmount: number | null;
  discountPercentage: number | null;
  isActive: boolean;
}

interface CouponsTableProps {
  coupons: Coupon[];
}

const CouponsTable: React.FC<CouponsTableProps> = ({ coupons }) => {
  if (coupons.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4 border-2 border-gray-200 rounded-md">
        No coupons used
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 mt-4">
      <div className="bg-white p-4 rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coupon</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell>{coupon.code}</TableCell>
                <TableCell>
                  {coupon.discountAmount
                    ? `$${coupon.discountAmount}`
                    : `${coupon.discountPercentage}%`}
                </TableCell>
                <TableCell>
                  {coupon.isActive ? "Active" : "Inactive"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CouponsTable;