import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShippingInfo } from '@prisma/client';

interface Address {
    id: string;
    shippingInfo: ShippingInfo;
    addressType: string;
  }
  
interface SavedAddressesTableProps {
  addresses: Address[];
}

const SavedAddressesTable: React.FC<SavedAddressesTableProps> = ({ addresses }) => {
  if (addresses.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4 border-2 border-gray-200 rounded-md">
        No saved addresses
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 mt-4">
      {addresses.map((address) => (
        <div key={address.id} className="bg-white p-4 rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>{address.shippingInfo?.fullName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Phone</TableCell>
                <TableCell>{address.shippingInfo?.phone}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Address</TableCell>
                <TableCell>
                  {address.shippingInfo?.addressLine1}
                  {address.shippingInfo?.addressLine2
                    ? ` ${address.shippingInfo?.addressLine2},`
                    : ""}
                  <br />
                  {address.shippingInfo?.city},
                  {address.shippingInfo?.state} {" "}
                  {address.shippingInfo?.zipCode}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>{address.addressType}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
};

export default SavedAddressesTable;