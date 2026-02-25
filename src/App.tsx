import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import AddProduct from "@/pages/AddProduct";
import Archive from "@/pages/Archive";
import SettingsPage from "@/pages/SettingsPage";
import ProductDetail from "@/pages/ProductDetail";
import ProductAnalysisPage from "@/pages/ProductAnalysisPage";
import ComparePage from "@/pages/ComparePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddProduct />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/product/:id/analysis" element={<ProductAnalysisPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
