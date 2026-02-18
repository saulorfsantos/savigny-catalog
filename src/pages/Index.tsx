import { useState } from "react";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CatalogSection from "@/components/CatalogSection";

const Index = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header search={search} onSearchChange={setSearch} />
      <HeroBanner />
      <CatalogSection search={search} />
    </div>
  );
};

export default Index;
