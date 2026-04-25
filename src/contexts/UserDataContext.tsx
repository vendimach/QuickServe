import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
}

export interface PaymentMethod {
  id: string;
  kind: "card" | "upi" | "wallet" | "cod";
  label: string;
  last4?: string | null;
  brand?: string | null;
  upi_id?: string | null;
  is_default: boolean;
}

interface UserDataValue {
  addresses: SavedAddress[];
  defaultAddress: SavedAddress | null;
  loadingAddresses: boolean;
  refreshAddresses: () => Promise<void>;
  addAddress: (a: Omit<SavedAddress, "id" | "is_default"> & { is_default?: boolean }) => Promise<SavedAddress | null>;
  updateAddress: (id: string, patch: Partial<SavedAddress>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;

  paymentMethods: PaymentMethod[];
  refreshPayments: () => Promise<void>;
  addPaymentMethod: (p: Omit<PaymentMethod, "id" | "is_default"> & { is_default?: boolean }) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  setDefaultPayment: (id: string) => Promise<void>;
}

const UserDataContext = createContext<UserDataValue | null>(null);

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const refreshAddresses = useCallback(async () => {
    if (!user) return setAddresses([]);
    setLoadingAddresses(true);
    const { data, error } = await supabase
      .from("saved_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setLoadingAddresses(false);
    if (!error && data) setAddresses(data as SavedAddress[]);
  }, [user]);

  const refreshPayments = useCallback(async () => {
    if (!user) return setPaymentMethods([]);
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setPaymentMethods(data as PaymentMethod[]);
  }, [user]);

  useEffect(() => {
    refreshAddresses();
    refreshPayments();
  }, [refreshAddresses, refreshPayments]);

  const addAddress: UserDataValue["addAddress"] = async (a) => {
    if (!user) return null;
    const isFirst = addresses.length === 0;
    const { data, error } = await supabase
      .from("saved_addresses")
      .insert({
        user_id: user.id,
        label: a.label,
        line1: a.line1,
        city: a.city ?? null,
        state: a.state ?? null,
        pincode: a.pincode ?? null,
        latitude: a.latitude ?? null,
        longitude: a.longitude ?? null,
        is_default: a.is_default ?? isFirst,
      })
      .select()
      .single();
    if (error) throw error;
    await refreshAddresses();
    return data as SavedAddress;
  };

  const updateAddress: UserDataValue["updateAddress"] = async (id, patch) => {
    const { error } = await supabase.from("saved_addresses").update(patch).eq("id", id);
    if (error) throw error;
    await refreshAddresses();
  };

  const deleteAddress: UserDataValue["deleteAddress"] = async (id) => {
    const { error } = await supabase.from("saved_addresses").delete().eq("id", id);
    if (error) throw error;
    await refreshAddresses();
  };

  const setDefaultAddress: UserDataValue["setDefaultAddress"] = async (id) => {
    if (!user) return;
    // unset others, set this one
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
    await refreshAddresses();
  };

  const addPaymentMethod: UserDataValue["addPaymentMethod"] = async (p) => {
    if (!user) return;
    const isFirst = paymentMethods.length === 0;
    const { error } = await supabase.from("payment_methods").insert({
      user_id: user.id,
      kind: p.kind,
      label: p.label,
      last4: p.last4 ?? null,
      brand: p.brand ?? null,
      upi_id: p.upi_id ?? null,
      is_default: p.is_default ?? isFirst,
    });
    if (error) throw error;
    await refreshPayments();
  };

  const deletePaymentMethod: UserDataValue["deletePaymentMethod"] = async (id) => {
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) throw error;
    await refreshPayments();
  };

  const setDefaultPayment: UserDataValue["setDefaultPayment"] = async (id) => {
    if (!user) return;
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("payment_methods").update({ is_default: true }).eq("id", id);
    await refreshPayments();
  };

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  return (
    <UserDataContext.Provider
      value={{
        addresses,
        defaultAddress,
        loadingAddresses,
        refreshAddresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        paymentMethods,
        refreshPayments,
        addPaymentMethod,
        deletePaymentMethod,
        setDefaultPayment,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used inside UserDataProvider");
  return ctx;
};