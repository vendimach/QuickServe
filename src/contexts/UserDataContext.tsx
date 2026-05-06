import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
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

  // Track whether addresses have ever been loaded successfully — so background
  // refreshes (after add/update/delete) don't flash a full-page spinner.
  const addressesLoadedRef = useRef(false);

  const refreshAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      addressesLoadedRef.current = false;
      return;
    }
    // Show the spinner only on the true initial load. Subsequent refreshes
    // update the list in place with no flash.
    if (!addressesLoadedRef.current) setLoadingAddresses(true);
    const { data, error } = await supabase
      .from("saved_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setLoadingAddresses(false);
    if (!error && data) {
      // Replace — never merge — to drop any rows the user just deleted.
      setAddresses(data as SavedAddress[]);
      addressesLoadedRef.current = true;
    }
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
    // Auto-default rule: if there is currently no default address (either
    // because this is the first ever, or every existing one was created
    // without is_default), the new row must become the default. Caller can
    // still force is_default=true explicitly.
    const noExistingDefault = !addresses.some((x) => x.is_default);
    const isFirst = addresses.length === 0;
    const shouldBeDefault = a.is_default ?? (isFirst || noExistingDefault);
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
        is_default: shouldBeDefault,
      })
      .select()
      .single();
    if (error) throw error;
    // If we just promoted this address to default, demote everyone else so
    // there's only one default at a time. Done as a separate UPDATE because
    // we need the new row's id.
    if (shouldBeDefault && data) {
      await supabase
        .from("saved_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", data.id);
    }
    await refreshAddresses();
    return data as SavedAddress;
  };

  const updateAddress: UserDataValue["updateAddress"] = async (id, patch) => {
    const { error } = await supabase.from("saved_addresses").update(patch).eq("id", id);
    if (error) throw error;
    // If this update set is_default=true, demote every other row.
    if (patch.is_default === true && user) {
      await supabase
        .from("saved_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", id);
    }
    await ensureDefaultExists();
    await refreshAddresses();
  };

  const deleteAddress: UserDataValue["deleteAddress"] = async (id) => {
    const { error } = await supabase.from("saved_addresses").delete().eq("id", id);
    if (error) throw error;
    // After a delete, if the row that was default just disappeared, promote
    // the oldest remaining address so the user always has a default.
    await ensureDefaultExists();
    await refreshAddresses();
  };

  const setDefaultAddress: UserDataValue["setDefaultAddress"] = async (id) => {
    if (!user) return;
    // unset others, set this one
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
    await refreshAddresses();
  };

  /**
   * Make sure exactly one address is marked default. Called after add/update/
   * delete operations so the invariant holds even if the caller forgot to
   * pass is_default. Cheap when already satisfied (single SELECT).
   */
  const ensureDefaultExists = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_addresses")
      .select("id, is_default, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as Array<{ id: string; is_default: boolean }>;
    if (rows.length === 0) return;
    if (rows.some((r) => r.is_default)) return;
    // No row has is_default=true → promote the oldest one.
    const oldest = rows[0];
    await supabase
      .from("saved_addresses")
      .update({ is_default: true })
      .eq("id", oldest.id);
  }, [user]);

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