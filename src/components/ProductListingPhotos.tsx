import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Camera, Download, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

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
  const [downloading, setDownloading] = useState(false);
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
      setError("Não foi possível carregar as fotos. Confirma a ligação e tenta novamente.");
      setLoading(false);
      return;
    }
    const signed = files.map((file, index) => {
      const signedUrl = signedData?.[index]?.signedUrl;
      if (!signedUrl) return null;
      return { name: file.name, path: paths[index], signedUrl, createdAt: file.created_at ?? "" } satisfies ListingPhoto;
    });
    setPhotos(signed.filter((photo): photo is ListingPhoto => photo !== null));
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
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Não foi possível carregar uma das fotografias.";
        toast.error(`${file.name}: ${message}`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
    await refresh();
    if (uploaded > 0) toast.success(`${uploaded} ${uploaded === 1 ? "fotografia guardada" : "fotografias guardadas"} para este produto.`);
    setUploading(false);
  }

  async function deletePhoto(photo: ListingPhoto) {
    if (!window.confirm("Queres eliminar esta fotografia guardada para anúncios?")) return;
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([photo.path]);
    if (removeError) {
      toast.error("Não foi possível eliminar a fotografia.");
      return;
    }
    await refresh();
    toast.success("Fotografia eliminada.");
  }

  async function downloadZip() {
    if (!photos.length) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const storage = supabase.storage.from(BUCKET);
      for (const [index, photo] of photos.entries()) {
        const { data, error: downloadError } = await storage.download(photo.path);
        if (downloadError || !data) throw downloadError ?? new Error("Falhou a transferência de uma fotografia.");
        const fileName = photo.name.replace(/^[0-9a-f-]{36}-/i, "");
        zip.file(`${String(index + 1).padStart(2, "0")}-${fileName}`, data);
      }
      const archive = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(archive);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFileName(productName)}-fotos-OLX.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast.error("Não foi possível preparar o ficheiro ZIP das fotografias.");
    } finally {
      setDownloading(false);
    }
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
            <div className="flex flex-wrap gap-2">
              <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" aria-label="Escolher fotografias" onChange={event => void uploadFiles(event.target.files)} />
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading || photos.length >= MAX_PHOTOS} className="min-h-11 gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "A carregar…" : "Adicionar fotos do telemóvel"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void downloadZip()} disabled={downloading || photos.length === 0} className="min-h-11 gap-2">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descarregar fotos para OLX
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Ao abrir no telemóvel, escolhe várias fotografias de uma vez. Não incluas IMEI, número de série, faturas, etiquetas ou dados pessoais.</p>
            {loading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> A carregar fotos…</div> : error ? <p role="alert" className="text-sm text-destructive">{error}</p> : photos.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Ainda não adicionaste fotos próprias a este produto.</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <div key={photo.path} className="relative overflow-hidden rounded-md border bg-muted">
                    <img src={photo.signedUrl} alt={`${productName}, foto ${index + 1}`} className="aspect-square w-full object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute right-2 top-2 h-8 w-8" onClick={() => void deletePhoto(photo)} aria-label={`Eliminar foto ${index + 1}`}>
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
