import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Package, Wand2, Loader2, Search, Upload } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

const PAGE_SIZE = 50;

interface Props {
  products: Product[];
  totalCount: number;
  page: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export default function ProductGrid({ products, totalCount, page, onPageChange, onRefresh }: Props) {
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "", price: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Image search modal state
  const [imageModal, setImageModal] = useState<{ product: Product; searchTerm: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ url: string; thumbnail: string | null } | null>(null);
  const [savingImage, setSavingImage] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({ name: p.name, category: p.category ?? "", price: p.price?.toString() ?? "" });
  };

  const handleSave = async () => {
    if (!editProduct) return;
    setSaving(true);
    const priceVal = editForm.price ? parseFloat(editForm.price.replace(",", ".")) : null;
    const { error } = await supabase
      .from("products")
      .update({ name: editForm.name, category: editForm.category, price: priceVal })
      .eq("id", editProduct.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto atualizado!" });
      setEditProduct(null);
      onRefresh();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto excluído!" });
      onRefresh();
    }
  };

  // Open image modal (for wand click or thumbnail click)
  const openImageModal = (product: Product) => {
    setSearchResult(null);
    setImageModal({ product, searchTerm: product.name });
  };

  // Search using Serper
  const handleSearch = async () => {
    if (!imageModal) return;

    setSearching(true);
    setSearchResult(null);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          query: imageModal.searchTerm,
          ean: imageModal.product.ean,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        toast({ title: "Erro na busca", description: data.error || "Erro desconhecido", variant: "destructive" });
        return;
      }

      if (data.imageUrl) {
        setSearchResult({ url: data.imageUrl, thumbnail: data.thumbnail });
      } else {
        toast({ title: "Nenhuma imagem encontrada", description: "Tente editar o termo de busca ou faça upload manual." });
      }
    } catch {
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  // Download preview image and store in Supabase Storage
  const handleSaveImageUrl = async (url: string) => {
    if (!imageModal) return;
    setSavingImage(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          productId: imageModal.product.id,
          sourceImageUrl: url,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.imageUrl) {
        toast({ title: "Erro ao salvar imagem", description: data.error || "Falha ao gravar no Storage", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("products")
        .update({ image_url: data.imageUrl })
        .eq("id", imageModal.product.id);

      if (error) {
        toast({ title: "Erro ao salvar imagem", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Imagem salva no Storage!" });
        setImageModal(null);
        setSearchResult(null);
        onRefresh();
      }
    } catch {
      toast({ title: "Erro de conexão", description: "Não foi possível salvar a imagem.", variant: "destructive" });
    } finally {
      setSavingImage(false);
    }
  };

  // Handle manual file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageModal) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${imageModal.product.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("products")
      .update({ image_url: publicUrl })
      .eq("id", imageModal.product.id);

    if (updateError) {
      toast({ title: "Erro ao salvar", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Imagem enviada com sucesso!" });
      setImageModal(null);
      setSearchResult(null);
      onRefresh();
    }
    setUploading(false);
    // Reset file input
    e.target.value = "";
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produtos Cadastrados
            <span className="text-sm font-normal text-muted-foreground">({totalCount})</span>
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  Nenhum produto cadastrado ainda.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image_url ? (
                      <button onClick={() => openImageModal(p)} className="focus:outline-none" title="Clique para trocar a foto">
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all" />
                      </button>
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openImageModal(p)} title="Buscar Foto">
                        <Wand2 className="h-4 w-4 text-primary" />
                      </Button>
                      <label title="Upload Manual" className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            // Set modal context for upload without opening modal
                            setImageModal({ product: p, searchTerm: p.name });
                            handleFileUpload(e);
                          }}
                        />
                      </label>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination>
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => onPageChange(page - 1)} href="#" />
                  </PaginationItem>
                )}
                {getPageNumbers().map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === page} onClick={() => onPageChange(p)} href="#">
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext onClick={() => onPageChange(page + 1)} href="#" />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Preço</Label>
              <Input value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} placeholder="0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Search & Upload Modal */}
      <Dialog open={!!imageModal} onOpenChange={(open) => { if (!open) { setImageModal(null); setSearchResult(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar Imagem</DialogTitle>
          </DialogHeader>
          {imageModal && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Produto: <span className="font-medium text-foreground">{imageModal.product.name}</span>
              </p>

              {/* Editable search field */}
              <div className="flex gap-2">
                <Input
                  value={imageModal.searchTerm}
                  onChange={(e) => setImageModal((prev) => prev ? { ...prev, searchTerm: e.target.value } : null)}
                  placeholder="Termo de busca..."
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching || !imageModal.searchTerm.trim()} className="shrink-0">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" /> Pesquisar</>}
                </Button>
              </div>

              {/* Search result preview */}
              {searchResult && (
                <div className="space-y-3">
                  <div className="flex justify-center rounded-lg border bg-muted p-2">
                    <img
                      src={searchResult.url}
                      alt={imageModal.product.name}
                      className="max-h-64 rounded object-contain"
                      onError={() => toast({ title: "Erro ao carregar imagem", variant: "destructive" })}
                    />
                  </div>
                  <Button onClick={() => handleSaveImageUrl(searchResult.url)} disabled={savingImage} className="w-full">
                    {savingImage ? "Salvando..." : "✅ Usar esta imagem"}
                  </Button>
                </div>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Manual upload */}
              <label className="flex items-center justify-center gap-2 w-full h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer transition-colors text-sm text-muted-foreground hover:text-foreground">
                {uploading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</>
                ) : (
                  <><Upload className="h-5 w-5" /> Fazer upload manual</>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImageModal(null); setSearchResult(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
