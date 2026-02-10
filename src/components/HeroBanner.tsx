import { ArrowRight, Clock, Package, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroBanner = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-secondary/95 to-primary/80">
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-6">
            Receba em até 24h o exato produto que sua empresa precisa
          </h2>
          <p className="text-white/80 text-base md:text-lg mb-8 max-w-lg">
            Suprimentos corporativos com a melhor relação custo-benefício, entrega expressa e atendimento especializado para o seu negócio.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base px-8 h-12 rounded-lg gap-2 shadow-lg shadow-primary/30"
          >
            Ver Catálogo
            <ArrowRight className="h-5 w-5" />
          </Button>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-6 mt-12">
            {[
              { icon: Clock, text: "Entrega em 24h" },
              { icon: Package, text: "+5.000 produtos" },
              { icon: Shield, text: "Compra segura" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-white/70 text-sm">
                <Icon className="h-4 w-4 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
