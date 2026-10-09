import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";
import Purchases from "@/pages/Purchases";

const mock = vi.hoisted(() => ({
  user: { id: "10000000-0000-4000-8000-000000000001" },
  rows: {} as Record<string, Record<string, unknown>[]>,
  writes: [] as { table: string; operation: string; fields: Record<string, unknown> }[],
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from(table: string) {
      let operation = "";
      let fields: Record<string, unknown> = {};
      const filters: Record<string, unknown> = {};
      const run = () => {
        mock.writes.push({ table, operation, fields });
        if (operation === "insert") {
          const row = { id: "90000000-0000-4000-8000-" + String(mock.writes.length).padStart(12, "0"), ...fields };
          mock.rows[table].push(row);
          return row;
        }
        const matched = mock.rows[table].filter(row => Object.entries(filters).every(([key, value]) => row[key] === value));
        if (operation === "update") matched.forEach(row => Object.assign(row, fields));
        if (operation === "delete") mock.rows[table] = mock.rows[table].filter(row => !matched.includes(row));
        return matched[0];
      };
      const builder = {
        select() { return builder; },
        eq(key: string, value: unknown) { filters[key] = value; return builder; },
        order() { return builder; },
        range(start: number, end: number) { return Promise.resolve({ data: mock.rows[table].slice(start, end + 1), error: null }); },
        insert(value: Record<string, unknown>) { operation = "insert"; fields = value; return builder; },
        update(value: Record<string, unknown>) { operation = "update"; fields = value; return builder; },
        delete() { operation = "delete"; return builder; },
        single() { return Promise.resolve({ data: run(), error: null }); },
        then(resolve: (result: { data: Record<string, unknown>; error: null }) => unknown) { return Promise.resolve(resolve({ data: run(), error: null })); },
      };
      return builder;
    },
  },
}));

const productId = "20000000-0000-4000-8000-000000000001";
const receivedId = "30000000-0000-4000-8000-000000000001";
const incomingId = "30000000-0000-4000-8000-000000000002";
let root: Root;
let host: HTMLDivElement;
let store: ReturnType<typeof useStore>;
function Probe() { store = useStore(); return null; }
async function mount(showPurchases = false) {
  await act(async () => root.render(<MemoryRouter><StoreProvider><Probe />{showPurchases && <Purchases />}</StoreProvider></MemoryRouter>));
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} });
  mock.writes = [];
  mock.rows = {
    products: [{ id: productId, name: "Equipamento de teste", category: "Eletrónica", purchase_price: 100, supplier: "", inventory_use: "business", photo_urls: [] }],
    purchases: [
      { id: receivedId, product_id: productId, quantity: 1, price: 100, date: "2026-10-01", order_status: "received_verified", order_reference: "PRIVATE-REFERENCE", collection_date: null },
      { id: incomingId, product_id: productId, quantity: 1, price: null, date: null, order_status: "shipped", order_reference: "PRIVATE-INCOMING" },
    ],
    sales: [{ id: "40000000-0000-4000-8000-000000000001", product_id: productId, purchase_id: receivedId, quantity: 1, sale_price: 150, profit: 50, date: "2026-10-03" }],
    categories: [{ id: "category", name: "Eletrónica" }],
    expenses: [],
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await mount();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

describe("dashboard persistence and purchase identity", () => {
  it("edits a fully sold unit without counting the sale twice", async () => {
    await act(async () => store.updateSale({ ...store.sales[0], salePrice: 180 }));
    expect(store.sales[0].profit).toBe(80);
    expect(mock.rows.sales[0].sale_price).toBe(180);
  });
  it("rejects a new sale of an incoming unit before writing", async () => {
    await expect(store.addSale({ productId, purchaseId: incomingId, quantity: 1, salePrice: 150, date: "2026-10-09" })).rejects.toThrow("receção");
    expect(mock.writes).toHaveLength(0);
  });
  it("rejects selling an exhausted purchase before writing", async () => {
    await expect(store.addSale({ productId, purchaseId: receivedId, quantity: 1, salePrice: 150, date: "2026-10-09" })).rejects.toThrow("unidades disponíveis");
    expect(mock.writes).toHaveLength(0);
  });
  it("preserves private references and receipt when editing other purchase fields", async () => {
    const purchase = store.purchases[0];
    await act(async () => store.updatePurchase({ ...purchase, price: 110, orderReference: undefined }));
    expect(store.purchases[0].orderReference).toBe("PRIVATE-REFERENCE");
    expect(store.purchases[0].orderStatus).toBe("received_verified");
    expect(store.sales[0].profit).toBe(40);
  });
  it("preserves unknown costs and undated historical purchases instead of inventing zero", async () => {
    await act(async () => store.updatePurchase({ ...store.purchases[1], orderStatusNote: "Atualização privada" }));
    expect(store.purchases[1].price).toBeNull();
    expect(store.purchases[1].date).toBe("");
    expect(store.purchases[1].orderReference).toBe("PRIVATE-INCOMING");
  });
  it("creates, edits and deletes an expense with the same persisted identity", async () => {
    await act(async () => store.addExpense({ category: "Eletrónica", description: "Portes", amount: 5, date: "2026-10-09" }));
    const expense = store.expenses[0];
    await act(async () => store.updateExpense({ ...expense, amount: 8 }));
    expect(store.expenses[0].amount).toBe(8);
    await act(async () => store.deleteExpense(expense.id));
    expect(store.expenses).toHaveLength(0);
    expect(mock.rows.expenses).toHaveLength(0);
  });
  it("opens and saves a received purchase without downgrading it or showing the reference", async () => {
    await mount(true);
    const button = host.querySelector<HTMLButtonElement>('button[aria-label="Editar Equipamento de teste"]')!;
    await act(async () => button.click());
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('[aria-label="Estado de receção"]')?.textContent).toBe("Recebido");
    expect(document.body.textContent).not.toContain("PRIVATE-REFERENCE");
    const save = Array.from(dialog.querySelectorAll("button")).find(button => button.textContent === "Guardar compra")!;
    await act(async () => save.click());
    expect(store.purchases[0].orderStatus).toBe("received_verified");
    expect(store.purchases[0].orderReference).toBe("PRIVATE-REFERENCE");
  });
  it("shows only the sales of the selected purchase, even with the same product", async () => {
    await mount(true);
    const buttons = host.querySelectorAll<HTMLButtonElement>('button[aria-label="Editar Equipamento de teste"]');
    await act(async () => buttons[1].click());
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).not.toContain("Vendas deste produto");
    expect(dialog.textContent).not.toContain("PRIVATE-INCOMING");
  });
  it("refreshes external changes on focus and reads past the first 1000 purchases", async () => {
    const categories = store.categories;
    mock.rows.purchases = Array.from({ length: 1001 }, (_, index) => ({ ...mock.rows.purchases[1], id: `purchase-${index}` }));
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(store.purchases).toHaveLength(1001);
    expect(store.categories).toBe(categories);
  });
});
