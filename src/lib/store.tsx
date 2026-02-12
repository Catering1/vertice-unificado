import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Product, Purchase, Sale } from "@/types";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  category: z.string().min(1).max(100),
  purchasePrice: z.number().min(0).max(1000000),
  supplier: z.string().max(200).trim(),
});

const PurchaseSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100000),
  price: z.number().min(0).max(1000000),
  date: z.string(),
});

const SaleSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100000),
  salePrice: z.number().min(0).max(1000000),
  date: z.string(),
});

interface StoreContextType {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  categories: string[];
  loading: boolean;
  addProduct: (p: Omit<Product, "id">) => Promise<string>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addPurchase: (p: Omit<Purchase, "id">) => Promise<void>;
  updatePurchase: (p: Purchase) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  addSale: (s: Omit<Sale, "id" | "profit">) => Promise<Sale>;
  updateSale: (s: Omit<Sale, "profit">) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addCategory: (c: string) => Promise<void>;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (c: string) => Promise<void>;
  getProduct: (id: string) => Product | undefined;
}

const StoreContext = createContext<StoreContextType | null>(null);

const DEFAULT_CATEGORIES = ["Eletrónica", "Roupas", "Alimentos", "Casa", "Outros"];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data when user changes
  useEffect(() => {
    if (!user) {
      setProducts([]); setPurchases([]); setSales([]); setCategories([]);
      setLoading(false);
      return;
    }
    const fetchAll = async () => {
      setLoading(true);
      const [prodRes, purchRes, saleRes, catRes] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id),
        supabase.from("purchases").select("*").eq("user_id", user.id),
        supabase.from("sales").select("*").eq("user_id", user.id),
        supabase.from("categories").select("*").eq("user_id", user.id),
      ]);

      setProducts((prodRes.data ?? []).map(r => ({
        id: r.id, name: r.name, category: r.category, purchasePrice: Number(r.purchase_price), supplier: r.supplier,
      })));
      setPurchases((purchRes.data ?? []).map(r => ({
        id: r.id, productId: r.product_id, quantity: r.quantity, price: Number(r.price), date: r.date,
      })));
      setSales((saleRes.data ?? []).map(r => ({
        id: r.id, productId: r.product_id, quantity: r.quantity, salePrice: Number(r.sale_price), profit: Number(r.profit), date: r.date,
      })));

      const cats = (catRes.data ?? []).map(r => r.name as string);
      if (cats.length === 0) {
        // Seed default categories
        const inserts = DEFAULT_CATEGORIES.map(name => ({ user_id: user.id, name }));
        await supabase.from("categories").insert(inserts as any);
        setCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(cats);
      }
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products]);

  const addProduct = async (p: Omit<Product, "id">): Promise<string> => {
    const validated = ProductSchema.parse(p);
    const { data, error } = await supabase.from("products").insert({
      user_id: user!.id, name: validated.name, category: validated.category, purchase_price: validated.purchasePrice, supplier: validated.supplier,
    } as any).select().single();
    if (error) throw error;
    const newProd: Product = { id: data.id, name: data.name, category: data.category, purchasePrice: Number(data.purchase_price), supplier: data.supplier };
    setProducts(prev => [...prev, newProd]);
    return data.id;
  };

  const updateProduct = async (p: Product) => {
    await supabase.from("products").update({
      name: p.name, category: p.category, purchase_price: p.purchasePrice, supplier: p.supplier,
    } as any).eq("id", p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts(prev => prev.filter(x => x.id !== id));
    setPurchases(prev => prev.filter(x => x.productId !== id));
    setSales(prev => prev.filter(x => x.productId !== id));
  };

  const addPurchase = async (p: Omit<Purchase, "id">) => {
    const validated = PurchaseSchema.parse(p);
    const { data, error } = await supabase.from("purchases").insert({
      user_id: user!.id, product_id: validated.productId, quantity: validated.quantity, price: validated.price, date: validated.date,
    } as any).select().single();
    if (error) throw error;
    setPurchases(prev => [...prev, { id: data.id, productId: data.product_id, quantity: data.quantity, price: Number(data.price), date: data.date }]);
  };

  const updatePurchase = async (p: Purchase) => {
    await supabase.from("purchases").update({
      product_id: p.productId, quantity: p.quantity, price: p.price, date: p.date,
    } as any).eq("id", p.id);
    setPurchases(prev => prev.map(x => x.id === p.id ? p : x));
  };

  const deletePurchase = async (id: string) => {
    await supabase.from("purchases").delete().eq("id", id);
    setPurchases(prev => prev.filter(x => x.id !== id));
  };

  const addSale = async (s: Omit<Sale, "id" | "profit">): Promise<Sale> => {
    const validated = SaleSchema.parse(s);
    const product = getProduct(validated.productId);
    const costPerUnit = product?.purchasePrice ?? 0;
    const profit = (validated.salePrice - costPerUnit) * validated.quantity;
    const { data, error } = await supabase.from("sales").insert({
      user_id: user!.id, product_id: validated.productId, quantity: validated.quantity, sale_price: validated.salePrice, profit, date: validated.date,
    } as any).select().single();
    if (error) throw error;
    const sale: Sale = { id: data.id, productId: data.product_id, quantity: data.quantity, salePrice: Number(data.sale_price), profit: Number(data.profit), date: data.date };
    setSales(prev => [...prev, sale]);
    return sale;
  };

  const updateSale = async (s: Omit<Sale, "profit">) => {
    const product = getProduct(s.productId);
    const costPerUnit = product?.purchasePrice ?? 0;
    const profit = (s.salePrice - costPerUnit) * s.quantity;
    await supabase.from("sales").update({
      product_id: s.productId, quantity: s.quantity, sale_price: s.salePrice, profit, date: s.date,
    } as any).eq("id", s.id);
    setSales(prev => prev.map(x => x.id === s.id ? { ...s, profit } : x));
  };

  const deleteSale = async (id: string) => {
    await supabase.from("sales").delete().eq("id", id);
    setSales(prev => prev.filter(x => x.id !== id));
  };

  const addCategory = async (c: string) => {
    if (categories.includes(c)) return;
    await supabase.from("categories").insert({ user_id: user!.id, name: c } as any);
    setCategories(prev => [...prev, c]);
  };

  const updateCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || categories.includes(newName.trim())) return;
    const trimmed = newName.trim();
    await supabase.from("categories").update({ name: trimmed } as any).eq("user_id", user!.id).eq("name", oldName);
    setCategories(prev => prev.map(c => c === oldName ? trimmed : c));
    // Update products with old category
    await supabase.from("products").update({ category: trimmed } as any).eq("user_id", user!.id).eq("category", oldName);
    setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: trimmed } : p));
  };

  const deleteCategory = async (c: string) => {
    await supabase.from("categories").delete().eq("user_id", user!.id).eq("name", c);
    setCategories(prev => prev.filter(x => x !== c));
  };

  return (
    <StoreContext.Provider value={{
      products, purchases, sales, categories, loading,
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
