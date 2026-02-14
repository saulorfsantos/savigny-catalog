import { useState } from "react";
import CategorySidebar from "@/components/CategorySidebar";
import ProductCard from "@/components/ProductCard";

import papelA4 from "@/assets/products/papel-a4.png";
import detergente from "@/assets/products/detergente.png";
import sacoLixo from "@/assets/products/saco-lixo.png";
import copos from "@/assets/products/copos.png";
import sabonete from "@/assets/products/sabonete.png";

const products = [
  {
    id: 1,
    name: "Papel A4 Papex Brasil",
    detail: "Resma 500 folhas · 75g/m²",
    price: 24.9,
    image: papelA4,
    category: "office",
  },
  {
    id: 2,
    name: "Detergente Ypê Neutro 5L",
    detail: "Galão 5L · Neutro",
    price: 29.9,
    image: detergente,
    category: "pro-clean",
  },
  {
    id: 3,
    name: "Água Sanitária Olimpo 5L",
    detail: "Galão 5L · Cloro ativo 2,5%",
    price: 14.5,
    image: sabonete,
    category: "pro-clean",
  },
  {
    id: 4,
    name: "Saco de Lixo Preto 100L",
    detail: "Pacote 100un · Reforçado",
    price: 39.9,
    image: sacoLixo,
    category: "utility",
  },
  {
    id: 5,
    name: "Copo Descartável 200ml",
    detail: "CX 2.500un · Branco",
    price: 54.9,
    image: copos,
    category: "food-service",
  },
];

const CatalogSection = () => {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const displayProducts = filtered.length > 0 ? filtered : products;

  return (
    <section className="bg-background py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-8">
          Monte sua lista de suprimentos
        </h2>

        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block w-52 flex-shrink-0">
            <CategorySidebar
              activeCategory={activeCategory}
              onCategoryChange={(id) =>
                setActiveCategory(id === activeCategory ? "all" : id)
              }
            />
          </div>

          {/* Products Area */}
          <div className="flex-1 min-w-0">
            {/* Mobile categories */}
            <div className="md:hidden mb-6">
              <CategorySidebar
                activeCategory={activeCategory}
                onCategoryChange={(id) =>
                  setActiveCategory(id === activeCategory ? "all" : id)
                }
              />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  detail={product.detail}
                  price={product.price}
                  image={product.image}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CatalogSection;
