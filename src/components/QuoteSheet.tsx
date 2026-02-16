import { useState } from "react";
import { Minus, Plus, Trash2, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const QuoteSheet = () => {
  const { items, updateQuantity, removeItem, totalItems } = useCart();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [seller, setSeller] = useState("sem-vendedor");

  const isValid = items.length > 0 && name.trim().length > 0 && company.trim().length > 0;

  const sellerNames: Record<string, string> = {
    "sem-vendedor": "",
    saulo: "Saulo",
    sara: "Sara",
    outro: "",
  };

  const handleSend = () => {
    if (!isValid) return;

    const sellerGreeting = sellerNames[seller]
      ? `Olá, ${sellerNames[seller]}! 👋`
      : "Olá! 👋";

    const itemsList = items
      .map((item) => `📦 ${item.quantity} x ${item.name}`)
      .join("\n");

    const safeName = encodeURIComponent(name.trim()).slice(0, 200);
    const safeCompany = encodeURIComponent(company.trim()).slice(0, 200);

    const message = `${sellerGreeting} Aqui é ${name.trim()} da empresa ${company.trim()}. Gostaria de receber o orçamento para estes itens:\n\n${itemsList}\n\nAguardo o retorno com valores e disponibilidade.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full">
      <SheetHeader>
        <SheetTitle className="text-foreground">Solicitar Orçamento</SheetTitle>
        <SheetDescription>
          {totalItems > 0
            ? `${totalItems} ${totalItems === 1 ? "item" : "itens"} na sua lista`
            : "Sua lista está vazia"}
        </SheetDescription>
      </SheetHeader>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6 space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Adicione produtos do catálogo para montar sua cotação.
          </p>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card"
          >
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-md bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-11 h-11 object-contain"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() =>
                  item.quantity <= 1
                    ? removeItem(item.id)
                    : updateQuantity(item.id, item.quantity - 1)
                }
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Diminuir quantidade"
              >
                {item.quantity <= 1 ? (
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="w-7 text-center text-sm font-bold tabular-nums text-foreground">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Customer form */}
      <div className="mt-6 space-y-3 border-t border-border pt-5">
        <div className="space-y-1.5">
          <Label htmlFor="quote-name" className="text-xs font-medium text-foreground">
            Seu Nome *
          </Label>
          <Input
            id="quote-name"
            placeholder="Digite seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote-company" className="text-xs font-medium text-foreground">
            Nome da Empresa *
          </Label>
          <Input
            id="quote-company"
            placeholder="Digite o nome da empresa"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            maxLength={100}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote-seller" className="text-xs font-medium text-foreground">
            Vendedor
          </Label>
          <Select value={seller} onValueChange={setSeller}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sem-vendedor">Sem vendedor</SelectItem>
              <SelectItem value="saulo">Saulo</SelectItem>
              <SelectItem value="sara">Sara</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Send button */}
      <SheetFooter className="mt-5 sm:flex-col">
        <Button
          onClick={handleSend}
          disabled={!isValid}
          className={cn(
            "w-full h-12 text-sm font-bold gap-2",
            isValid
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : ""
          )}
        >
          <MessageCircle className="h-5 w-5" />
          Enviar Lista para Cotação (WhatsApp)
        </Button>
      </SheetFooter>
    </div>
  );
};

export default QuoteSheet;
