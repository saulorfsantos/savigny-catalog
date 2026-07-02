import { Minus, Plus, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  detail: string;
  image: string | null;
  category?: string | null;
  tag?: string;
  price?: number | null;
  stock?: number | null;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const ProductCard = ({ id, name, detail, image, category, tag = "Pronta Entrega", price, stock }: ProductCardProps) => {
  const { getQuantity, addItem, updateQuantity } = useCart();
  const quantity = getQuantity(id);
  const isInCart = quantity > 0;

  const isPriceOnRequest = price == null;
  const isInvalidPrice = price != null && price <= 0;
  const isOutOfStock = stock != null && stock <= 0;
  const isUnavailable = isInvalidPrice || isOutOfStock;

  const increment = () => {
    if (quantity === 0) {
      addItem({ id, name, detail, image: image || "" });
      toast({ title: "✅ Item adicionado à cotação!", duration: 2000 });
    } else {
      updateQuantity(id, quantity + 1);
      toast({ title: "✅ Item atualizado na cotação!", duration: 2000 });
    }
  };

  const decrement = () => {
    if (quantity <= 1) {
      updateQuantity(id, quantity - 1);
      toast({ title: "🗑️ Item removido da cotação", duration: 2000 });
    } else {
      updateQuantity(id, quantity - 1);
      toast({ title: "✅ Item atualizado na cotação!", duration: 2000 });
    }
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border overflow-hidden flex flex-col transition-shadow hover:shadow-lg",
      isInCart && "ring-2 ring-primary/40",
      isUnavailable && "opacity-90"
    )}>
      <div className="px-3 pt-3 flex items-center gap-2 flex-wrap">
        {tag && !isUnavailable && !isPriceOnRequest && (
          <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
            {tag}
          </span>
        )}
        {isPriceOnRequest && !isUnavailable && (
          <span className="inline-block bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Consulte
          </span>
        )}
        {isUnavailable && (
          <span className="inline-block bg-destructive/10 text-destructive text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Indisponível
          </span>
        )}
        {category && (
          <span className="inline-block bg-secondary text-secondary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {category}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center p-4 flex-shrink-0">
        <div className="w-full aspect-square bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
          {image ? (
            <img src={image} alt={name} className={cn("w-4/5 h-4/5 object-contain", isUnavailable && "grayscale")} loading="lazy" />
          ) : (
            <Package className="w-12 h-12 text-muted-foreground/40" />
          )}
        </div>
      </div>

      <div className="px-4 pb-2 flex-1 flex flex-col">
        <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
          {name}
        </h4>
        <span className="text-xs text-muted-foreground mt-0.5">{detail}</span>
      </div>

      <div className="px-4 pb-4 mt-auto">
        <div className="mb-3 min-h-[2rem] flex items-end">
          {isUnavailable ? (
            <span className="text-sm font-bold text-destructive uppercase tracking-wide">
              Indisponível
            </span>
          ) : isPriceOnRequest ? (
            <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
              Consulte
            </span>
          ) : (
            <span className="text-xl font-extrabold text-primary tabular-nums">
              {formatBRL(price as number)}
            </span>
          )}
        </div>

        <div className={cn(
          "flex items-center rounded-lg overflow-hidden transition-colors",
          isUnavailable ? "bg-muted/50 opacity-50 pointer-events-none" : isInCart ? "bg-primary" : "bg-muted"
        )}>
          <button
            onClick={decrement}
            disabled={isUnavailable}
            className={cn(
              "p-3 transition-colors rounded-l-lg",
              isInCart ? "text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-muted/80"
            )}
            aria-label="Diminuir quantidade"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className={cn(
            "flex-1 text-center text-sm font-bold tabular-nums",
            isInCart ? "text-primary-foreground" : "text-foreground"
          )}>
            {quantity}
          </span>
          <button
            onClick={increment}
            disabled={isUnavailable}
            className={cn(
              "p-3 transition-colors rounded-r-lg",
              isInCart ? "text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-muted/80"
            )}
            aria-label="Aumentar quantidade"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
