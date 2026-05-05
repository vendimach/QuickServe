import { supabase } from "@/integrations/supabase/client";

export interface OlaPlace {
  label: string;
  line1: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat: number;
  lng: number;
  place_id?: string;
  secondary?: string;
}

interface AutocompleteResponse {
  results?: OlaPlace[];
  error?: string;
}

interface ReverseResponse {
  result?: OlaPlace | null;
  error?: string;
}

export const olaAutocomplete = async (input: string): Promise<OlaPlace[]> => {
  const { data, error } = await supabase.functions.invoke<AutocompleteResponse>("ola-maps", {
    body: { action: "autocomplete", input },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.results ?? [];
};

export const olaReverseGeocode = async (
  lat: number,
  lng: number,
): Promise<OlaPlace | null> => {
  const { data, error } = await supabase.functions.invoke<ReverseResponse>("ola-maps", {
    body: { action: "reverse", lat, lng },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.result ?? null;
};
