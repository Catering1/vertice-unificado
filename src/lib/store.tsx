import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Product, Purchase, Sale, Expense, VintedOrderStatus } from "@/types";
import { z } from "zod";
import { toast } from "sonner";

const ProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  category: z.string().min(1).max(100),
  purchasePrice: z.number().min(0).max(1000000),
  supplier: z.string().max(200).trim(),
  retailPrice: z.number().min(0).max(1000000),
  condition: z.string().min(1).max(100).trim(),
  warrantyMonths: z.number().int().min(0).max(120),
  description: z.string().max(5000).trim(),
  specifications: z.string().max(3000).trim(),
  photoUrls: z.array(z.string().url()).max(12),
});

const PurchaseSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100000),
  price: z.number().min(0).max(1000000),
  date: z.string(),
  estimatedDeliveryDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  collectionDate: z.string().optional().nullable(),
  orderStatus: z.enum(["not_tracked", "ordered", "shipped", "electronic_verification", "delivered", "received_verified", "return_in_progress", "refund_partial", "refunded", "cancelled"]).optional(),
  orderReference: z.string().max(200).optional().nullable(),
  orderStatusNote: z.string().max(1000).optional().nullable(),
  orderStatusUpdatedAt: z.string().datetime({ offset: true }).optional().nullable(),
  refundReceivedAt: z.string().datetime({ offset: true }).optional().nullable(),
});

const SaleSchema = z.object({
  productId: z.string().uuid(),
  purchaseId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100000),
  salePrice: z.number().min(0).max(1000000),
  date: z.string(),
});

const NON_RECEIPT_STATUSES = new Set(["return_in_progress", "refund_partial", "refunded", "cancelled"]);

const ExpenseSchema = z.object({
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  amount: z.number().finite().min(0.01).max(1000000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

interface StoreContextType {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  error: string | null;
  categories: string[];
  loading: boolean;
  addProduct: (p: Omit<Product, "id">) => Promise<string>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addPurchase: (p: Omit<Purchase, "id">) => Promise<void>;
  updatePurchase: (p: Purchase) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  addSale: (s: Omit<Sale, "id" | "profit"> & { purchasePrice?: number }) => Promise<Sale>;
  updateSale: (s: Omit<Sale, "profit"> & { purchasePrice?: number }) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addCategory: (c: string) => Promise<void>;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (c: string) => Promise<void>;
  getProduct: (id: string) => Product | undefined;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data when user changes
  useEffect(() => {
    if (!user) {
      setProducts([]); setPurchases([]); setSales([]); setCategories([]); setExpenses([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // Read every page; Supabase otherwise truncates at 1,000 rows.
        async function allRows(table: "products" | "purchases" | "sales" | "categories" | "expenses") {
          const rows = [];
          for (let start = 0; ; start += 500) {
            const result = await supabase.from(table).select("*").eq("user_id", user!.id).order("id").range(start, start + 499);
            if (result.error) throw result.error;
            rows.push(...result.data);
            if (result.data.length < 500) break;
          }
          return rows;
        }
        const [prods, purchs, sold, cats, costs] = await Promise.all([
          allRows("products"), allRows("purchases"), allRows("sales"), allRows("categories"), allRows("expenses"),
        ]);
        if (cancelled) return;
        setProducts(prods.map(r => ({
          id: r.id, name: r.name, category: r.category, purchasePrice: r.purchase_price == null ? null : Number(r.purchase_price), supplier: r.supplier,
          retailPrice: Number(r.retail_price ?? 0), condition: r.condition ?? "Verificado",
          warrantyMonths: Number(r.warranty_months ?? 0), description: r.description ?? "",
          specifications: r.specifications ?? "", photoUrls: r.photo_urls ?? [],
          inventoryUse: r.inventory_use ?? "business", storeVisible: r.store_visible ?? true,
          sourceRef: r.source_ref, sourceData: r.source_data ?? {},
        })));
        setPurchases(purchs.map(r => ({id: r.id, productId: r.product_id, quantity: r.quantity, price: r.price == null ? null : Number(r.price), date: r.date ?? "", estimatedDeliveryDate: r.estimated_delivery_date ?? null, deliveryDate: r.delivery_date ?? null, collectionDate: r.collection_date ?? null, orderStatus: (r.order_status ?? "not_tracked") as VintedOrderStatus, orderReference: r.order_reference ?? "", orderStatusNote: r.order_status_note ?? "", orderStatusUpdatedAt: r.order_status_updated_at ?? null, refundReceivedAt: r.refund_received_at ?? null})));
        setSales(sold.map(r => ({id: r.id, productId: r.product_id, purchaseId: r.purchase_id, quantity: r.quantity, salePrice: Number(r.sale_price), profit: r.profit == null ? null : Number(r.profit), date: r.date ?? ""})));
        setExpenses(costs.map(r => ({id: r.id, category: r.category, description: r.description, amount: Number(r.amount), date: r.date ?? ""})));
        const names = cats.map(r => r.name);
        setCategories(names);
      } catch {
        if (!cancelled) { setError("Não foi possível carregar todos os dados. Atualize a página para tentar novamente."); toast.error("Erro ao carregar os dados"); }
      } finally { if (!cancelled) setLoading(false); }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [user]);

  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products]);

  const addProduct = async (p: Omit<Product, "id">): Promise<string> => {
    const validated = ProductSchema.parse(p);
    const { data, error } = await supabase.from("products").insert({
      user_id: user!.id, name: validated.name, category: validated.category, purchase_price: validated.purchasePrice, supplier: validated.supplier,
      retail_price: validated.retailPrice, condition: validated.condition, warranty_months: validated.warrantyMonths,
      description: validated.description, specifications: validated.specifications, photo_urls: validated.photoUrls,
      inventory_use: p.inventoryUse ?? "business", store_visible: p.storeVisible ?? true,
    } as any).select().single();
    if (error) throw error;
    const row = data as any;
    const newProd: Product = { id: row.id, name: row.name, category: row.category, purchasePrice: Number(row.purchase_price), supplier: row.supplier, retailPrice: Number(row.retail_price ?? 0), condition: row.condition ?? "Verificado", warrantyMonths: Number(row.warranty_months ?? 0), description: row.description ?? "", specifications: row.specifications ?? "", photoUrls: row.photo_urls ?? [], inventoryUse: row.inventory_use, storeVisible: row.store_visible };
    setProducts(prev => [...prev, newProd]);
    return data.id;
  };

  const updateProduct = async (p: Product) => {
    const { error } = await supabase.from("products").update({
      name: p.name, category: p.category, purchase_price: p.purchasePrice, supplier: p.supplier,
      retail_price: p.retailPrice, condition: p.condition, warranty_months: p.warrantyMonths,
      description: p.description, specifications: p.specifications, photo_urls: p.photoUrls,
      inventory_use: p.inventoryUse ?? "business", store_visible: p.storeVisible ?? true,
    } as any).eq("id", p.id);
    if (error) throw error;
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    setProducts(prev => prev.filter(x => x.id !== id));
    setPurchases(prev => prev.filter(x => x.productId !== id));
    setSales(prev => prev.filter(x => x.productId !== id));
  };

  const addPurchase = async (p: Omit<Purchase, "id">) => {
    const validated = PurchaseSchema.parse(p);
    const requestedStatus = validated.orderStatus ?? "not_tracked";
    const orderStatus = validated.collectionDate && !NON_RECEIPT_STATUSES.has(requestedStatus)
      ? "received_verified" as const
      : requestedStatus;
    const orderStatusUpdatedAt = validated.orderStatusUpdatedAt ?? (orderStatus === "not_tracked" ? null : new Date().toISOString());
    const { data, error } = await supabase.from("purchases").insert({
      user_id: user!.id, product_id: validated.productId, quantity: validated.quantity, price: validated.price, date: validated.date, estimated_delivery_date: validated.estimatedDeliveryDate || null, delivery_date: validated.deliveryDate || null, collection_date: validated.collectionDate || null,
      order_status: orderStatus, order_reference: validated.orderReference?.trim() || null, order_status_note: validated.orderStatusNote?.trim() || null, order_status_updated_at: orderStatusUpdatedAt,
      refund_received_at: validated.refundReceivedAt || null,
    } as any).select().single();
    if (error) throw error;
    setPurchases(prev => [...prev, { id: data.id, productId: data.product_id, quantity: data.quantity, price: data.price == null ? null : Number(data.price), date: data.date ?? "", estimatedDeliveryDate: data.estimated_delivery_date ?? null, deliveryDate: data.delivery_date ?? null, collectionDate: data.collection_date ?? null, orderStatus: data.order_status as VintedOrderStatus, orderReference: data.order_reference ?? "", orderStatusNote: data.order_status_note ?? "", orderStatusUpdatedAt: data.order_status_updated_at, refundReceivedAt: data.refund_received_at }]);
  };

  const updatePurchase = async (p: Purchase) => {
    const validated = PurchaseSchema.parse(p);
    const previous = purchases.find(x => x.id === p.id);
    const requestedStatus = validated.orderStatus ?? previous?.orderStatus ?? "not_tracked";
    const orderReference = validated.orderReference === undefined ? (previous?.orderReference ?? "") : validated.orderReference;
    const orderStatusNote = validated.orderStatusNote === undefined ? (previous?.orderStatusNote ?? "") : validated.orderStatusNote;
    const deliveryDate = validated.deliveryDate === undefined ? (previous?.deliveryDate ?? null) : validated.deliveryDate;
    const estimatedDeliveryDate = validated.estimatedDeliveryDate === undefined ? (previous?.estimatedDeliveryDate ?? null) : validated.estimatedDeliveryDate;
    const collectionDate = validated.collectionDate === undefined ? (previous?.collectionDate ?? null) : validated.collectionDate;
    const orderStatus = collectionDate && !NON_RECEIPT_STATUSES.has(requestedStatus)
      ? "received_verified" as const
      : requestedStatus;
    const refundReceivedAt = validated.refundReceivedAt === undefined ? (previous?.refundReceivedAt ?? null) : validated.refundReceivedAt;
    const statusChanged = orderStatus !== (previous?.orderStatus ?? "not_tracked")
      || (orderStatusNote?.trim() || "") !== (previous?.orderStatusNote?.trim() || "");
    const orderStatusUpdatedAt = statusChanged ? new Date().toISOString() : (validated.orderStatusUpdatedAt ?? previous?.orderStatusUpdatedAt ?? null);
    const { error } = await supabase.from("purchases").update({
      product_id: p.productId, quantity: p.quantity, price: p.price, date: p.date || null, estimated_delivery_date: estimatedDeliveryDate || null, delivery_date: deliveryDate || null, collection_date: collectionDate || null,
      order_status: orderStatus, order_reference: orderReference?.trim() || null, order_status_note: orderStatusNote?.trim() || null, order_status_updated_at: orderStatusUpdatedAt,
      refund_received_at: refundReceivedAt,
    } as any).eq("id", p.id);
    if (error) throw error;
    // A single purchase identifies the unit's cost unambiguously. Legacy products
    // with several purchases retain their existing sale costs until reconciled.
    if (purchases.filter(x => x.id === p.id).length === 1) {
      for (const sale of sales.filter(s=>s.purchaseId===p.id)) {
        const profit=p.price == null ? null : (sale.salePrice-p.price)*sale.quantity;
        const {error:saleError}=await supabase.from("sales").update({profit}).eq("id",sale.id);
        if (saleError) throw saleError;
        setSales(prev=>prev.map(s=>s.id===sale.id ? {...s,profit} : s));
      }
    }
    setPurchases(prev => prev.map(x => x.id === p.id ? {...p, estimatedDeliveryDate, deliveryDate, collectionDate, orderStatus, orderReference: orderReference?.trim() || "", orderStatusNote: orderStatusNote?.trim() || "", orderStatusUpdatedAt, refundReceivedAt} : x));
  };

  const deletePurchase = async (id: string) => {
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) throw error;
    setPurchases(prev => prev.filter(x => x.id !== id));
  };

  const addSale = async (s: Omit<Sale, "id" | "profit"> & { purchasePrice?: number }): Promise<Sale> => {
    const { purchasePrice, ...saleInput } = s;
    const validated = SaleSchema.parse(saleInput);
    const purchase = purchases.find(p => p.id === validated.purchaseId && p.productId === validated.productId);
    if (!purchase) throw new Error("A compra selecionada não corresponde ao artigo.");
    const alreadySold = sales.filter(existing => existing.purchaseId === purchase.id).reduce((sum, existing) => sum + existing.quantity, 0);
    if (alreadySold + validated.quantity > purchase.quantity) throw new Error("Esta compra não tem unidades disponíveis para registar a venda.");
    const costPerUnit = typeof purchasePrice === "number" && !Number.isNaN(purchasePrice)
      ? purchasePrice
      : (purchase.price ?? null);
    const profit = costPerUnit == null ? null : (validated.salePrice - costPerUnit) * validated.quantity;
    const { data, error } = await supabase.from("sales").insert({
      user_id: user!.id, product_id: validated.productId, purchase_id: validated.purchaseId, quantity: validated.quantity, sale_price: validated.salePrice, profit, date: validated.date,
    } as any).select().single();
    if (error) throw error;
    const sale: Sale = { id: data.id, productId: data.product_id, purchaseId: data.purchase_id, quantity: data.quantity, salePrice: Number(data.sale_price), profit: data.profit == null ? null : Number(data.profit), date: data.date ?? "" };
    setSales(prev => [...prev, sale]);
    return sale;
  };

  const updateSale = async (s: Omit<Sale, "profit"> & { purchasePrice?: number }) => {
    const { purchasePrice, ...saleInput } = s;
    const validated = SaleSchema.parse(saleInput);
    const purchase = purchases.find(p => p.id === validated.purchaseId && p.productId === validated.productId);
    if (!purchase) throw new Error("A compra selecionada não corresponde ao artigo.");
    const alreadySold = sales.filter(existing => existing.purchaseId === purchase.id && existing.id !== validated.id).reduce((sum, existing) => sum + existing.quantity, 0);
    if (alreadySold + validated.quantity > purchase.quantity) throw new Error("Esta compra não tem unidades disponíveis para registar a venda.");
    const costPerUnit = typeof purchasePrice === "number" && !Number.isNaN(purchasePrice)
      ? purchasePrice
      : (purchase.price ?? null);
    const profit = costPerUnit == null ? null : (saleInput.salePrice - costPerUnit) * saleInput.quantity;
    const { error } = await supabase.from("sales").update({
      product_id: saleInput.productId, purchase_id: saleInput.purchaseId, quantity: saleInput.quantity, sale_price: saleInput.salePrice, profit, date: saleInput.date || null,
    } as any).eq("id", saleInput.id);
    if (error) throw error;
    setSales(prev => prev.map(x => x.id === saleInput.id ? { ...saleInput, profit } : x));
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) throw error;
    setSales(prev => prev.filter(x => x.id !== id));
  };

  const addExpense = async (expense: Omit<Expense, "id">) => {
    const validated = ExpenseSchema.parse(expense);
    const { data, error } = await supabase.from("expenses").insert({
      user_id: user!.id, category: validated.category, description: validated.description,
      amount: validated.amount, date: validated.date,
    }).select("id,category,description,amount,date").single();
    if (error) throw error;
    setExpenses(previous => [...previous, { id: data.id, category: data.category, description: data.description, amount: Number(data.amount), date: data.date ?? "" }]);
  };

  const updateExpense = async (expense: Expense) => {
    const validated = ExpenseSchema.extend({ date: z.union([ExpenseSchema.shape.date, z.literal("")]) }).parse(expense);
    const { data, error } = await supabase.from("expenses").update({
      category: validated.category, description: validated.description,
      amount: validated.amount, date: validated.date || null,
    }).eq("id", expense.id).eq("user_id", user!.id).select("id,category,description,amount,date").single();
    if (error) throw error;
    setExpenses(previous => previous.map(item => item.id === data.id
      ? { id: data.id, category: data.category, description: data.description, amount: Number(data.amount), date: data.date ?? "" }
      : item));
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user!.id).select("id").single();
    if (error) throw error;
    setExpenses(previous => previous.filter(item => item.id !== id));
  };

  const addCategory = async (c: string) => {
    if (categories.includes(c)) return;
    const { error } = await supabase.from("categories").insert({ user_id: user!.id, name: c } as any);
    if (error) throw error;
    setCategories(prev => [...prev, c]);
  };

  const updateCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || categories.includes(newName.trim())) return;
    const trimmed = newName.trim();
    const { error } = await supabase.from("categories").update({ name: trimmed } as any).eq("user_id", user!.id).eq("name", oldName);
    if (error) throw error;
    setCategories(prev => prev.map(c => c === oldName ? trimmed : c));
    // Update products with old category
    const { error: productError } = await supabase.from("products").update({ category: trimmed } as any).eq("user_id", user!.id).eq("category", oldName);
    if (productError) throw productError;
    const { error: expenseError } = await supabase.from("expenses").update({category:trimmed}).eq("user_id",user!.id).eq("category",oldName);
    if (expenseError) throw expenseError;
    setExpenses(prev => prev.map(e => e.category === oldName ? {...e,category:trimmed} : e));
    setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: trimmed } : p));
  };

  const deleteCategory = async (c: string) => {
    const { error } = await supabase.from("categories").delete().eq("user_id", user!.id).eq("name", c);
    if (error) throw error;
    setCategories(prev => prev.filter(x => x !== c));
  };

  return (
    <StoreContext.Provider value={{
      products, purchases, sales, expenses, categories, loading, error,
      addProduct, updateProduct, deleteProduct,
      addPurchase, updatePurchase, deletePurchase,
      addSale, updateSale, deleteSale, addExpense, updateExpense, deleteExpense,
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
