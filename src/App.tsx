import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { StoreProvider } from "@/contexts/StoreContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import TimeClockLayout from "@/components/TimeClockLayout";
import StoreLayout from "@/components/StoreLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EmployeeRegistration from "./pages/EmployeeRegistration";
import EmployeeList from "./pages/EmployeeList";
import TimeHistory from "./pages/TimeHistory";
import AdminDashboard from "./pages/AdminDashboard";
import PDV from "./pages/PDV";
import ProductManagement from "./pages/ProductManagement";
import SalesDashboard from "./pages/SalesDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EmployeeProvider>
          <StoreProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                
                {/* Sistema de Ponto */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <TimeClockLayout><Index /></TimeClockLayout>
                  </ProtectedRoute>
                } />
                <Route path="/cadastro" element={
                  <ProtectedRoute requireAdmin>
                    <TimeClockLayout><EmployeeRegistration /></TimeClockLayout>
                  </ProtectedRoute>
                } />
                <Route path="/funcionarios" element={
                  <ProtectedRoute>
                    <TimeClockLayout><EmployeeList /></TimeClockLayout>
                  </ProtectedRoute>
                } />
                <Route path="/historico" element={
                  <ProtectedRoute>
                    <TimeClockLayout><TimeHistory /></TimeClockLayout>
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin>
                    <TimeClockLayout><AdminDashboard /></TimeClockLayout>
                  </ProtectedRoute>
                } />

                {/* Sistema de Loja - Chão de Giz */}
                <Route path="/loja" element={
                  <ProtectedRoute>
                    <StoreLayout><PDV /></StoreLayout>
                  </ProtectedRoute>
                } />
                <Route path="/loja/produtos" element={
                  <ProtectedRoute requireAdmin>
                    <StoreLayout><ProductManagement /></StoreLayout>
                  </ProtectedRoute>
                } />
                <Route path="/loja/vendas" element={
                  <ProtectedRoute requireAdmin>
                    <StoreLayout><SalesDashboard /></StoreLayout>
                  </ProtectedRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </StoreProvider>
        </EmployeeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
