import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PublicProduct = Database["public"]["Functions"]["get_public_store_products"]["Returns"][number];

export function usePublicProducts() {
  return useQuery({
    queryKey: ["public-products"],
    queryFn: async (): Promise<PublicProduct[]> => {
      const { data, error } = await supabase.rpc("get_public_store_products");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
