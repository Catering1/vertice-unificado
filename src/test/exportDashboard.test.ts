import ExcelJS from "exceljs";
import { afterEach, expect, it, vi } from "vitest";
import { exportDashboardXlsx } from "@/lib/exportDashboard";
import type { Product, Purchase, Sale } from "@/types";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("exports a readable workbook with expenses and unknown costs preserved", async () => {
  const product: Product = { id: "product", name: "Unidade de teste", category: "Eletrónica", purchasePrice: null, supplier: "", retailPrice: 100, condition: "Usado", warrantyMonths: 0, description: "", specifications: "", photoUrls: [] };
  const purchases: Purchase[] = [{ id: "purchase", productId: product.id, quantity: 1, price: null, date: "", orderStatus: "received_verified", orderReference: "PRIVATE-REFERENCE" }];
  const sales: Sale[] = [{ id: "sale", productId: product.id, purchaseId: "purchase", quantity: 1, salePrice: 100, profit: null, date: "" }];
  let output: Blob | undefined;
  vi.stubGlobal("URL", { createObjectURL: (blob: Blob) => { output = blob; return "blob:test"; }, revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await exportDashboardXlsx(purchases, sales, [product], () => product, [{ id: "expense", description: "Embalagem", category: "Eletrónica", amount: 4, date: "2026-10-09" }]);
  expect(click).toHaveBeenCalledOnce();
  expect(output?.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(output!);
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(["Dashboard", "Compras", "Vendas", "Despesas"]);
  expect(workbook.getWorksheet("Compras")!.getCell("E2").value).toBeNull();
  expect(workbook.getWorksheet("Vendas")!.getCell("E2").value).toBeNull();
  expect(workbook.getWorksheet("Despesas")!.getCell("C2").value).toBe(4);
  const rows = workbook.getWorksheet("Dashboard")!.getSheetValues();
  expect(rows.some(row => Array.isArray(row) && row[1] === "Vendas sem custo" && row[2] === 1)).toBe(true);
  expect(JSON.stringify(workbook.model)).not.toContain("PRIVATE-REFERENCE");
});
