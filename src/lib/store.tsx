import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Product, Purchase, Sale } from "@/types";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

interface StoreContextType {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  categories: string[];
  addProduct: (p: Omit<Product, "id">) => string;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  addPurchase: (p: Omit<Purchase, "id">) => void;
  updatePurchase: (p: Purchase) => void;
  deletePurchase: (id: string) => void;
  addSale: (s: Omit<Sale, "id" | "profit">) => Sale;
  updateSale: (s: Omit<Sale, "profit">) => void;
  deleteSale: (id: string) => void;
  addCategory: (c: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (c: string) => void;
  getProduct: (id: string) => Product | undefined;
}

const StoreContext = createContext<StoreContextType | null>(null);

const DEFAULT_CATEGORIES = ["Eletrónica", "Roupas", "Alimentos", "Casa", "Outros"];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => load("products", []));
  const [purchases, setPurchases] = useState<Purchase[]>(() => load("purchases", []));
  const [sales, setSales] = useState<Sale[]>(() => load("sales", []));
  const [categories, setCategories] = useState<string[]>(() => load("categories", DEFAULT_CATEGORIES));

  useEffect(() => { localStorage.setItem("products", JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem("purchases", JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem("sales", JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem("categories", JSON.stringify(categories)); }, [categories]);

  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products]);

  const addProduct = (p: Omit<Product, "id">) => { const id = generateId(); setProducts(prev => [...prev, { ...p, id }]); return id; };
  const updateProduct = (p: Product) => setProducts(prev => prev.map(x => x.id === p.id ? p : x));
  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(x => x.id !== id));
    setPurchases(prev => prev.filter(x => x.productId !== id));
    setSales(prev => prev.filter(x => x.productId !== id));
  };

  const addPurchase = (p: Omit<Purchase, "id">) => setPurchases(prev => [...prev, { ...p, id: generateId() }]);
  const updatePurchase = (p: Purchase) => setPurchases(prev => prev.map(x => x.id === p.id ? p : x));
  const deletePurchase = (id: string) => setPurchases(prev => prev.filter(x => x.id !== id));

  const addSale = (s: Omit<Sale, "id" | "profit">) => {
    const product = getProduct(s.productId);
    const costPerUnit = product?.purchasePrice ?? 0;
    const profit = (s.salePrice - costPerUnit) * s.quantity;
    const sale: Sale = { ...s, id: generateId(), profit };
    setSales(prev => [...prev, sale]);
    return sale;
  };
  const updateSale = (s: Omit<Sale, "profit">) => {
    const product = getProduct(s.productId);
    const costPerUnit = product?.purchasePrice ?? 0;
    const profit = (s.salePrice - costPerUnit) * s.quantity;
    setSales(prev => prev.map(x => x.id === s.id ? { ...s, profit } : x));
  };
  const deleteSale = (id: string) => setSales(prev => prev.filter(x => x.id !== id));

  const addCategory = (c: string) => {
    if (!categories.includes(c)) setCategories(prev => [...prev, c]);
  };
  const updateCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || categories.includes(newName.trim())) return;
    setCategories(prev => prev.map(c => c === oldName ? newName.trim() : c));
    // Update products that use this category
    setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName.trim() } : p));
  };
  const deleteCategory = (c: string) => setCategories(prev => prev.filter(x => x !== c));

  return (
    <StoreContext.Provider value={{
      products, purchases, sales, categories,
      addProduct, updateProduct, deleteProduct,
      addPurchase, updatePurchase, deletePurchase,
      addSale, updateSale, deleteSale,
      addCategory, updateCategory, deleteCategory, getProduct,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
