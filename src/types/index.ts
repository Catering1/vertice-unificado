export interface Product {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  supplier: string;
  retailPrice: number;
  condition: string;
  warrantyMonths: number;
  description: string;
  specifications: string;
  photoUrls: string[];
}

export interface Purchase {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  date: string;
}

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  salePrice: number;
  date: string;
  profit: number;
}
