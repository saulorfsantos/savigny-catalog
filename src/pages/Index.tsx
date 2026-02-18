import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CatalogSection from "@/components/CatalogSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />
      <HeroBanner />
      <CatalogSection />
    </div>
  );
};

export default Index;
