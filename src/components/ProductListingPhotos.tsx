import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { undoToast } from "@/lib/undoToast";

const BUCKET = "product-listing-photos";
const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_DIMENSION = 2048;

type ListingPhoto = { name: string; path: string; signedUrl: string; createdAt: string };

function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "fotografia.jpg";
}

async function toListingJpeg(file: File): Promise<File> {
  let source: Blob = file;
  const isHeic = /image\/(hei[cf])/.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (isHeic) {
    const convert = (await import("heic2any")).default;
    const converted = await convert({ blob: file, toType: "image/jpeg", quality: 0.95 });
    source = Array.isArray(converted) ? converted[0] : converted;
  }

  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar esta fotografia.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível converter a fotografia.")), "image/jpeg", 0.88));
    const baseName = safeFileName(file.name.replace(/\.[^.]+$/, ""));
    return new File([jpeg], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

export default function ProductListingPhotos({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const storage = supabase.storage.from(BUCKET);
    const { data, error: listError } = await storage.list(productId, {
      limit: MAX_PHOTOS,
      sortBy: { column: "created_at", order: "asc" },
    });
    if (listError) {
      setError("Não foi possível carregar as fotos. Confirma a ligação e tenta novamente.");
      setLoading(false);
      return;
    }
    const files = (data ?? []).filter(file => file.id && file.name);
    const paths = files.map(file => `${productId}/${file.name}`);
    const { data: signedData, error: signedError } = await storage.createSignedUrls(paths, 60 * 60);
    if (signedError) {
      setError("Não foi possível verificar as fotos. Confirma a ligação e tenta novamente.");
      setLoading(false);
      return;
    }
    setPhotos(files.flatMap((file, index) => {
      const signedUrl = signedData?.[index]?.signedUrl;
      return signedUrl ? [{ name: file.name, path: paths[index], signedUrl, createdAt: file.created_at ?? "" }] : [];
    }));
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    if (photos.length + files.length > MAX_PHOTOS) {
      toast.error(`Podes guardar até ${MAX_PHOTOS} fotos por produto.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    let uploaded = 0;
    const uploadedPaths: string[] = [];
    const storage = supabase.storage.from(BUCKET);
    for (const file of files) {
      try {
        const inferredTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" };
        const mime = file.type.toLowerCase() || inferredTypes[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
        if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(mime)) throw new Error("Formato não suportado. Usa JPEG, PNG, WebP ou HEIC.");
        if (file.size > MAX_FILE_SIZE) throw new Error("Cada foto original deve ter no máximo 25 MB.");
        const source = file.type === mime ? file : new File([file], file.name, { type: mime, lastModified: file.lastModified });
        const optimized = await toListingJpeg(source);
        const path = `${productId}/${crypto.randomUUID()}-${optimized.name}`;
        const { error: uploadError } = await storage.upload(path, optimized, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
        if (uploadError) throw uploadError;
        uploaded += 1;
        uploadedPaths.push(path);
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Não foi possível carregar uma das fotografias.";
        toast.error(`${file.name}: ${message}`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
    await refresh();
    if (uploaded > 0) undoToast(`${uploaded} ${uploaded === 1 ? "fotografia guardada" : "fotografias guardadas"} para este produto.`, async () => {
      const { error: removeError } = await storage.remove(uploadedPaths);
      if (removeError) throw removeError;
      await refresh();
    });
    setUploading(false);
  }

  async function deletePhoto(photo: ListingPhoto) {
    if (!window.confirm("Queres eliminar esta fotografia guardada para anúncios?")) return;
    const storage = supabase.storage.from(BUCKET);
    const { data: backup, error: downloadError } = await storage.download(photo.path);
    if (downloadError || !backup) { toast.error("Não foi possível preparar a anulação da fotografia."); return; }
    const { error: removeError } = await storage.remove([photo.path]);
    if (removeError) {
      toast.error("Não foi possível eliminar a fotografia.");
      return;
    }
    await refresh();
    undoToast("Fotografia eliminada.", async () => {
      const { error: restoreError } = await storage.upload(photo.path, backup, { contentType: backup.type || "image/jpeg", cacheControl: "31536000", upsert: false });
      if (restoreError) throw restoreError;
      await refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" className="min-h-11 w-full justify-center gap-1.5" onClick={() => setOpen(true)} aria-label={`Gerir fotos para anúncios de ${productName}`}>
        <Camera className="h-4 w-4" /> Adicionar ou gerir fotos {photos.length > 0 && <span>({photos.length})</span>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fotos próprias para anúncios</DialogTitle>
            <DialogDescription>{productName}. Estas fotos ficam privadas e separadas das fotografias Vinted e da montra pública.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Até {MAX_PHOTOS} fotos por produto. Antes do envio são reduzidas para 2048 px e convertidas para JPEG, mantendo boa qualidade para OLX e carregando muito mais depressa. Limite do ficheiro original: 25 MB.
            </div>
            <div>
              <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" aria-label="Escolher fotografias" onChange={event => void uploadFiles(event.target.files)} />
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading || photos.length >= MAX_PHOTOS} className="min-h-11 gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "A carregar…" : "Adicionar fotos do telemóvel"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Ao abrir no telemóvel, escolhe várias fotografias de uma vez. Não incluas IMEI, número de série, faturas, etiquetas ou dados pessoais.</p>
            {loading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> A verificar fotos…</div> : error ? <p role="alert" className="text-sm text-destructive">{error}</p> : photos.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Ainda não adicionaste fotos próprias a este produto.</p> : (
              <div className="space-y-2">
                <p className="text-sm font-medium">{photos.length} {photos.length === 1 ? "fotografia guardada" : "fotografias guardadas"}</p>
                {photos.map((photo, index) => (
                  <div key={photo.path} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                    <a href={photo.signedUrl} data-listing-photo={index + 1} className="hidden" aria-hidden="true" tabIndex={-1}>Fotografia {index + 1}</a>
                    <span className="text-sm text-muted-foreground">Fotografia {index + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => void deletePhoto(photo)} aria-label={`Eliminar foto ${index + 1}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end"><Button type="button" variant="ghost" className="gap-2" onClick={() => setOpen(false)}><X className="h-4 w-4" /> Fechar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
