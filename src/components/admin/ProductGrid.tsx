import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Package, Wand2, Loader2, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

const PAGE_SIZE = 50;
const DAILY_LIMIT = 100;

function getTodayKey() {
  return `img_search_count_${new Date().toISOString().slice(0, 10)}`;
}

function getDailyCount(): number {
  return parseInt(localStorage.getItem(getTodayKey()) || "0", 10);
}

function incrementDailyCount(): number {
  const key = getTodayKey();
  const next = getDailyCount() + 1;
  localStorage.setItem(key, String(next));
  return next;
}

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

  // Image search state
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ productId: string; productName: string; url: string } | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [dailyCount, setDailyCount] = useState(getDailyCount());

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({ name: p.name, category: p.category, price: p.price?.toString() ?? "" });
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

  const handleSearchImage = async (product: Product) => {
    if (getDailyCount() >= DAILY_LIMIT) {
      toast({ title: "Limite diário atingido", description: `Você já fez ${DAILY_LIMIT} buscas hoje.`, variant: "destructive" });
      return;
    }

    setSearchingId(product.id);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: product.name, ean: product.ean }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        toast({ title: "Erro na busca", description: data.error || "Erro desconhecido", variant: "destructive" });
        return;
      }

      const newCount = incrementDailyCount();
      setDailyCount(newCount);

      if (data.imageUrl) {
        setImagePreview({ productId: product.id, productName: product.name, url: data.imageUrl });
      } else {
        toast({ title: "Nenhuma imagem encontrada", description: `Não foi possível encontrar uma imagem para "${product.name}".` });
      }
    } catch (e) {
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
    } finally {
      setSearchingId(null);
    }
  };

  const handleSaveImage = async () => {
    if (!imagePreview) return;
    setSavingImage(true);
    const { error } = await supabase
      .from("products")
      .update({ image_url: imagePreview.url })
      .eq("id", imagePreview.productId);
    if (error) {
      toast({ title: "Erro ao salvar imagem", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Imagem salva!" });
      setImagePreview(null);
      onRefresh();
    }
    setSavingImage(false);
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Buscas Hoje: <span className={dailyCount >= DAILY_LIMIT ? "text-destructive font-bold" : "font-semibold text-foreground"}>{dailyCount}</span>/{DAILY_LIMIT}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right w-36">Ações</TableHead>
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
                      <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSearchImage(p)}
                        disabled={searchingId === p.id}
                        title="Buscar Foto"
                      >
                        {searchingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4 text-primary" />
                        )}
                      </Button>
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

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Imagem encontrada</DialogTitle>
          </DialogHeader>
          {imagePreview && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Produto: <span className="font-medium text-foreground">{imagePreview.productName}</span></p>
              <div className="flex justify-center rounded-lg border bg-muted p-2">
                <img
                  src={imagePreview.url}
                  alt={imagePreview.productName}
                  className="max-h-64 rounded object-contain"
                  onError={() => toast({ title: "Erro ao carregar imagem", variant: "destructive" })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImagePreview(null)}>Cancelar</Button>
            <Button onClick={handleSaveImage} disabled={savingImage}>
              {savingImage ? "Salvando..." : "Salvar Foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
