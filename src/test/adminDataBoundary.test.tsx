import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AppLayout from "@/components/AppLayout";

const state = vi.hoisted(() => ({ loading: false, error: null as string | null }));
vi.mock("@/lib/store", () => ({ useStore: () => state }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "admin@example.test" }, signOut: vi.fn() }) }));
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(() => { document.body.innerHTML = ""; state.loading = false; state.error = null; vi.unstubAllGlobals(); });

it.each([
  { loading: true, error: null, status: "A carregar os dados do negócio" },
  { loading: false, error: "API indisponível", status: "Não foi possível atualizar" },
  { loading: false, error: null, status: "Exportar dados" },
])("prevents editing/exporting before valid data ($loading, $error)", async ({ loading, error, status }) => {
  Object.assign(state, { loading, error });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MemoryRouter><AppLayout><button>Exportar dados</button></AppLayout></MemoryRouter>));
    expect(container.textContent).toContain(status);
    expect(Array.from(container.querySelectorAll("button")).some(button => button.textContent === "Exportar dados")).toBe(!loading && !error);
  } finally { await act(async () => root.unmount()); }
});
