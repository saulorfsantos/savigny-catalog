import { Phone, Truck } from "lucide-react";

const TopBar = () => {
  return (
    <div className="bg-secondary text-secondary-foreground py-2 px-4">
      <div className="container mx-auto flex items-center justify-between text-xs md:text-sm">
        <div className="flex items-center gap-1.5">
          <Phone className="h-3 w-3" />
          <span>Atendimento WhatsApp</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Truck className="h-3 w-3" />
          <span>Frete Grátis para empresas*</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
