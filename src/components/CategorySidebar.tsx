import { useState } from "react";
import { Briefcase, SprayCanIcon, Wrench, Coffee, Utensils, Heart, HardHat, ShoppingBag, Droplets, Car, FlaskConical, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "office", label: "Office", icon: Briefcase },
  { id: "limpeza", label: "Limpeza", icon: SprayCanIcon },
  { id: "utility", label: "Utility", icon: Wrench },
  { id: "food-service", label: "Food Service", icon: Utensils },
  { id: "descartáveis", label: "Descartáveis", icon: ShoppingBag },
  { id: "higiene-pessoal", label: "Higiene Pessoal", icon: Heart },
  { id: "higiene-corporativa", label: "Higiene Corporativa", icon: FlaskConical },
  { id: "epis", label: "EPI's", icon: HardHat },
  { id: "piscina", label: "Piscina", icon: Droplets },
  { id: "perfumaria", label: "Perfumaria", icon: Coffee },
  { id: "manutenção", label: "Manutenção", icon: Wrench },
  { id: "automotivo", label: "Automotivo", icon: Car },
  { id: "outros", label: "Outros", icon: LayoutGrid },
];

interface CategorySidebarProps {
  activeCategory: string;
  onCategoryChange: (id: string) => void;
}

const CategorySidebar = ({ activeCategory, onCategoryChange }: CategorySidebarProps) => {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-full">
        <nav className="sticky top-4 space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            Categorias
          </h3>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile horizontal scroll */}
      <div className="md:hidden sticky top-0 z-20 bg-background border-b border-border py-3 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-foreground/70 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export { categories };
export default CategorySidebar;
