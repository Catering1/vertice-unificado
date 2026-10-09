import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductPage from "@/pages/ProductPage";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
const product = {
  id: "unit", title: "Samsung Galaxy S26+", category: "Eletrónica",
  condition: "Verificado", warranty_months: 0, retail_price: 649,
  image_url: "https://example.com/unit.jpg", photo_urls: ["https://example.com/unit.jpg"],
  description: "Unidade confirmada de 512 GB, cor preta.",
  specifications: "Armazenamento: 512 GB\nCor: preta",
  availability_status: "coming_soon", stock_quantity: 1,
};
async function render() {
  await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/produto/unit"]}><Routes><Route path="/produto/:id" element={<ProductPage />} /></Routes></MemoryRouter></QueryClientProvider>));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  rpc.mockReset();
  rpc.mockResolvedValue({ data: [product], error: null });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); vi.unstubAllGlobals(); });
describe("public product uses the dashboard's exact unit", () => {
  it("shows confirmed capacity and price without obsolete catalogue data", async () => {
    await render();
    expect(host.textContent).toContain("512 GB");
    expect(host.textContent).toContain("649");
    expect(host.textContent).not.toContain("128 GB");
    expect(host.textContent).not.toContain("Estado: Verificado");
    expect(host.querySelector("img")?.getAttribute("src")).toBe(product.image_url);
    expect(host.querySelector('a[href*="produto=unit"]')).not.toBeNull();
  });
  it("does not invent a price, unit description or photos when they are missing", async () => {
    rpc.mockResolvedValue({ data: [{ ...product, retail_price: 0, description: "", specifications: "", photo_urls: [], image_url: null }], error: null });
    await render();
    expect(host.textContent).toContain("Sob consulta");
    expect(host.textContent).toContain("Fotografia em preparação");
    expect(host.textContent).not.toContain("128 GB");
    expect(host.querySelector("img")).toBeNull();
  });
  it("distinguishes an API failure from a sold unit and lets the customer retry", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("API unavailable") });
    await render();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Não foi possível carregar");
    expect(host.textContent).not.toContain("já não está disponível");
    rpc.mockResolvedValue({ data: [product], error: null });
    await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });
    expect(host.textContent).toContain("512 GB");
  });
  it("reports a sold or withdrawn unit when a successful query no longer includes it", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await render();
    expect(host.textContent).toContain("já não está disponível");
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});

