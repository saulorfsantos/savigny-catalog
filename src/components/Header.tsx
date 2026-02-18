import { ShoppingCart, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import QuoteSheet from "@/components/QuoteSheet";
import LiveSearch from "@/components/LiveSearch";

const categories = [
  "Office", "Limpeza", "Utility", "Food Service",
  "Descartáveis", "Higiene Pessoal", "Higiene Corporativa",
  "EPI's", "Piscina", "Perfumaria", "Manutenção",
  "Automotivo", "Outros",
];

const Header = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <>
      <header className="bg-background shadow-sm sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between gap-4 py-3 px-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetTitle className="text-secondary font-black text-xl">SAVIGNY</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {categories.map((cat) => (
                   <button
                     key={cat}
                     onClick={() => navigate(`/catalog?category=${encodeURIComponent(cat)}`)}
                     className="text-left px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                   >
                     {cat}
                   </button>
                 ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="shrink-0">
            <h1 className="text-secondary font-black text-2xl md:text-3xl tracking-tight">
              SAVIGNY
            </h1>
          </div>

          {/* Search Bar */}
          <LiveSearch
            className="hidden md:block flex-1 max-w-xl mx-4"
            inputClassName="h-11 rounded-lg border-2 border-muted focus-visible:ring-primary focus-visible:border-primary text-sm"
          />

          {/* Quote Cart */}
          <Sheet>
            <SheetTrigger asChild>
              <Button className="shrink-0 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                <ShoppingCart className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">Solicitar Orçamento</span>
                <Badge className="h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full">
                  {totalItems}
                </Badge>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
              <QuoteSheet />
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <LiveSearch inputClassName="h-10 rounded-lg border-2 border-muted text-sm" />
        </div>
      </header>

      {/* Category Bar - desktop */}
      <nav className="bg-background border-b border-border hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1">
            {categories.map((cat) => (
               <button
                 key={cat}
                 onClick={() => navigate(`/catalog?category=${encodeURIComponent(cat)}`)}
                 className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap border-b-2 border-transparent hover:border-primary"
               >
                 {cat}
               </button>
             ))}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header;
