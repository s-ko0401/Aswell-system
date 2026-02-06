import React, { createContext, useContext } from "react";
import { vi } from "vitest";

// APIのモック
export const mockApi = () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
});

// Toastのモック
export const mockToast = () => {
  const toastMock = vi.fn();
  return {
    useToast: () => ({
      toast: toastMock,
    }),
    toastMock,
  };
};

// vaulの問題を回避するためにDrawerをモック化
export const mockDrawer = async () => {
  const DrawerContext = createContext({ open: false });

  const Drawer = ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (
    <DrawerContext.Provider value={{ open }}>
      <div data-testid="drawer-root">{children}</div>
    </DrawerContext.Provider>
  );

  const DrawerContent = ({ children }: { children: React.ReactNode }) => {
    const { open } = useContext(DrawerContext);
    if (!open) return null;
    return (
      <div role="dialog" data-testid="drawer-content">
        {children}
      </div>
    );
  };

  const DrawerTrigger = ({
    children,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>) => {
    if (asChild) {
      return <>{children}</>;
    }
    return <div {...props}>{children}</div>;
  };

  return {
    Drawer,
    DrawerTrigger,
    DrawerContent,
    DrawerHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DrawerTitle: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
    DrawerDescription: ({ children }: { children: React.ReactNode }) => (
      <p>{children}</p>
    ),
    DrawerFooter: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DrawerClose: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DrawerOverlay: () => null,
    DrawerPortal: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
};

// radix-uiの問題を回避し、シンプルな操作を可能にするためにSelectをモック化
export const mockSelect = () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="role-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
  SelectValue: () => null,
});
