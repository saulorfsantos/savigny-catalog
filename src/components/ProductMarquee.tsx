import detergente from "@/assets/products/detergente.png";
import papelA4 from "@/assets/products/papel-a4.png";
import cafe from "@/assets/products/cafe.png";
import sacoLixo from "@/assets/products/saco-lixo.png";
import luvas from "@/assets/products/luvas.png";
import copos from "@/assets/products/copos.png";
import sabonete from "@/assets/products/sabonete.png";

const products = [
  { name: "Detergente 5L", image: detergente },
  { name: "Papel A4 (Resma)", image: papelA4 },
  { name: "Café em Pó", image: cafe },
  { name: "Saco de Lixo 100L", image: sacoLixo },
  { name: "Luvas de Proteção", image: luvas },
  { name: "Descartáveis", image: copos },
  { name: "Sabonete Líquido", image: sabonete },
];

const ProductCard = ({ name, image }: { name: string; image: string }) => (
  <div className="flex-shrink-0 w-[256px] h-[280px] mx-1">
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center gap-2 h-full">
      <img src={image} alt={name} className="w-44 h-44 object-contain flex-shrink-0" />
      <span className="text-base text-muted-foreground text-center font-bold whitespace-nowrap">{name}</span>
    </div>
  </div>
);

const ProductMarquee = () => {
  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-secondary to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-secondary to-transparent pointer-events-none" />

      <div className="flex animate-marquee">
        {[...products, ...products, ...products, ...products].map((product, i) => (
          <ProductCard key={`${product.name}-${i}`} name={product.name} image={product.image} />
        ))}
      </div>
    </div>
  );
};

export default ProductMarquee;
