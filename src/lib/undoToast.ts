import { toast } from "sonner";

export function undoToast(message: string, undo: () => Promise<void>) {
  toast.success(message, {
    duration: 12_000,
    action: {
      label: "Anular",
      onClick: () => void (async () => {
        try {
          await undo();
          toast.success("Alteração anulada");
        } catch {
          toast.error("Não foi possível anular a alteração.");
        }
      })(),
    },
  });
}
