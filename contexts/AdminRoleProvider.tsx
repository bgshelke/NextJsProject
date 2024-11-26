"use client";
import { Permission } from "@prisma/client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface AdminRolesContextType {
  permissions: string[];
  setPermissions: (permissions: Permission[]) => void;
}

const AdminRolesContext = createContext<AdminRolesContextType | undefined>(
  undefined
);

export const AdminRolesProvider: React.FC<{
  children: ReactNode;
  initialPermissions: Permission[];
}> = ({ children, initialPermissions }) => {
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);

  return (
    <AdminRolesContext.Provider value={{ permissions, setPermissions }}>
      {children}
    </AdminRolesContext.Provider>
  );
};

export const useAdminRoles = () => {
  const context = useContext(AdminRolesContext);
  if (context === undefined) {
    throw new Error("useAdminRoles must be used within an AdminRolesProvider");
  }
  return context;
};
