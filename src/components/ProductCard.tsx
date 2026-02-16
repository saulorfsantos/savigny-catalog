import { Minus, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: number;
  name: string;
  detail: string;
  image: string;
  tag?: string;
}

const ProductCard = ({ id, name, detail, image, tag = "Pronta Entrega" }: ProductCardProps) => {
  const { getQuantity, addItem, updateQuantity } = useCart();
  const quantity = getQuantity(id);
  const isInCart = quantity > 0;

  const increment = () => {
    if (quantity === 0) {
      addItem({ id, name, detail, image });
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
      isInCart && "ring-2 ring-primary/40"
    )}>
      {tag && (
        <div className="px-3 pt-3">
          <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
            {tag}
          </span>
        </div>
      )}

      <div className="flex items-center justify-center p-4 flex-shrink-0">
        <div className="w-full aspect-square bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
          <img src={image} alt={name} className="w-4/5 h-4/5 object-contain" loading="lazy" />
        </div>
      </div>

      <div className="px-4 pb-2 flex-1 flex flex-col">
        <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
          {name}
        </h4>
        <span className="text-xs text-muted-foreground mt-0.5">{detail}</span>
      </div>

      <div className="px-4 pb-4 mt-auto">
        <div className="mb-3">
          <span className="text-xs text-muted-foreground font-medium">Condição B2B</span>
        </div>

        <div className={cn(
          "flex items-center rounded-lg overflow-hidden transition-colors",
          isInCart ? "bg-primary" : "bg-muted"
        )}>
          <button
            onClick={decrement}
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
