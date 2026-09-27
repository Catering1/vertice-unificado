export interface Product {
  id: string;
  name: string;
  category: string;
  purchasePrice: number | null;
  supplier: string;
  retailPrice: number;
  condition: string;
  warrantyMonths: number;
  description: string;
  specifications: string;
  photoUrls: string[];
  inventoryUse?: "business" | "personal";
  storeVisible?: boolean;
  sourceRef?: string;
  sourceData?: Record<string, unknown>;
}

export interface Purchase {
  id: string;
  productId: string;
  quantity: number;
  price: number | null;
  date: string;
}

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  salePrice: number;
  date: string;
  profit: number | null;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}
