import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

interface AddressContextValue {
  addresses: SavedAddress[];
  loading: boolean;
  defaultAddress: SavedAddress | null;
  refresh: () => Promise<void>;
  addAddress: (a: Omit<SavedAddress, "id">) => Promise<SavedAddress | null>;
  updateAddress: (id: string, patch: Partial<Omit<SavedAddress, "id">>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
}

const AddressContext = createContext<AddressContextValue | null>(null);

export const AddressProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("saved_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses((data ?? []) as SavedAddress[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAddress: AddressContextValue["addAddress"] = async (a) => {
    if (!user) return null;
    if (a.is_default) {
      await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    const { data, error } = await supabase
      .from("saved_addresses")
      .insert({ ...a, user_id: user.id })
      .select("*")
      .single();
    if (error) throw error;
    await refresh();
    return data as SavedAddress;
  };

  const updateAddress: AddressContextValue["updateAddress"] = async (id, patch) => {
    if (!user) return;
    if (patch.is_default) {
      await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    await supabase.from("saved_addresses").update(patch).eq("id", id);
    await refresh();
  };

  const deleteAddress: AddressContextValue["deleteAddress"] = async (id) => {
    await supabase.from("saved_addresses").delete().eq("id", id);
    await refresh();
  };

  const setDefault: AddressContextValue["setDefault"] = async (id) => {
    if (!user) return;
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
    await refresh();
  };

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  return (
    <AddressContext.Provider
      value={{ addresses, loading, defaultAddress, refresh, addAddress, updateAddress, deleteAddress, setDefault }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddresses = () => {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddresses must be used inside AddressProvider");
  return ctx;
};
