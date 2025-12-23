import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product, Sale, SaleItem, CartItem, StockMovement, ProductCategory } from '@/types/store';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/contexts/EmployeeContext';

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  stockMovements: StockMovement[];
  cart: CartItem[];
  isLoading: boolean;
  isEmployeeOnShift: boolean;
  currentEmployeeId: string | null;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<boolean>;
  removeProduct: (id: string) => Promise<void>;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (paymentMethod: string, notes?: string) => Promise<Sale | null>;
  addStockMovement: (productId: string, quantity: number, movementType: 'entrada' | 'saida', reason?: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
  getLowStockProducts: () => Product[];
  getSalesByPeriod: (startDate: Date, endDate: Date) => Sale[];
  getEmployeeSales: (employeeId: string, startDate?: Date, endDate?: Date) => Sale[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { timeRecords, employees } = useEmployees();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se funcionário está em expediente (último registro é 'entrada')
  const checkEmployeeOnShift = useCallback(() => {
    if (!user) return { isOnShift: false, employeeId: null };
    
    // Encontrar funcionário pelo email do usuário ou pela associação
    const userRecords = timeRecords.filter(rec => {
      const employee = employees.find(e => e.id === rec.employeeId);
      return employee !== undefined;
    });

    if (userRecords.length === 0) return { isOnShift: false, employeeId: null };

    // Pegar todos os funcionários que têm registros
    const employeeIds = [...new Set(userRecords.map(r => r.employeeId))];
    
    // Para cada funcionário, verificar o último registro
    for (const empId of employeeIds) {
      const empRecords = timeRecords
        .filter(r => r.employeeId === empId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      if (empRecords.length > 0 && empRecords[0].type === 'entrada') {
        return { isOnShift: true, employeeId: empId };
      }
    }

    return { isOnShift: false, employeeId: employeeIds[0] || null };
  }, [user, timeRecords, employees]);

  const { isOnShift: isEmployeeOnShift, employeeId: currentEmployeeId } = checkEmployeeOnShift();

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    const mappedProducts: Product[] = (data || []).map((prod) => ({
      id: prod.id,
      name: prod.name,
      category: prod.category as ProductCategory,
      description: prod.description || undefined,
      costPrice: Number(prod.cost_price),
      salePrice: Number(prod.sale_price),
      stockQuantity: prod.stock_quantity,
      minStockAlert: prod.min_stock_alert,
      photoUrl: prod.photo_url || undefined,
      createdAt: new Date(prod.created_at),
      updatedAt: new Date(prod.updated_at),
    }));

    setProducts(mappedProducts);
  };

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        employees(name),
        sale_items(
          *,
          products(name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      return;
    }

    const mappedSales: Sale[] = (data || []).map((sale) => ({
      id: sale.id,
      employeeId: sale.employee_id,
      employeeName: (sale.employees as { name: string })?.name || 'Desconhecido',
      totalAmount: Number(sale.total_amount),
      totalCost: Number(sale.total_cost),
      totalProfit: Number(sale.total_profit),
      paymentMethod: sale.payment_method,
      notes: sale.notes || undefined,
      createdAt: new Date(sale.created_at),
      items: (sale.sale_items as any[])?.map((item) => ({
        id: item.id,
        saleId: item.sale_id,
        productId: item.product_id,
        productName: item.products?.name || 'Produto removido',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        unitCost: Number(item.unit_cost),
        subtotal: Number(item.subtotal),
      })),
    }));

    setSales(mappedSales);
  };

  const fetchStockMovements = async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching stock movements:', error);
      return;
    }

    const mappedMovements: StockMovement[] = (data || []).map((mov) => ({
      id: mov.id,
      productId: mov.product_id,
      productName: (mov.products as { name: string })?.name || 'Produto removido',
      quantity: mov.quantity,
      movementType: mov.movement_type as 'entrada' | 'saida',
      reason: mov.reason || undefined,
      createdAt: new Date(mov.created_at),
    }));

    setStockMovements(mappedMovements);
  };

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchProducts(), fetchSales(), fetchStockMovements()]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setProducts([]);
      setSales([]);
      setStockMovements([]);
      setCart([]);
      setIsLoading(false);
    }
  }, [user, refreshData]);

  // Real-time subscription for sales
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
        },
        async () => {
          await fetchSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product | null> => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: productData.name,
        category: productData.category,
        description: productData.description || null,
        cost_price: productData.costPrice,
        sale_price: productData.salePrice,
        stock_quantity: productData.stockQuantity,
        min_stock_alert: productData.minStockAlert,
        photo_url: productData.photoUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      return null;
    }

    const newProduct: Product = {
      id: data.id,
      name: data.name,
      category: data.category as ProductCategory,
      description: data.description || undefined,
      costPrice: Number(data.cost_price),
      salePrice: Number(data.sale_price),
      stockQuantity: data.stock_quantity,
      minStockAlert: data.min_stock_alert,
      photoUrl: data.photo_url || undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  }, []);

  const updateProduct = useCallback(async (id: string, productData: Partial<Product>): Promise<boolean> => {
    const updateData: Record<string, any> = {};
    
    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.category !== undefined) updateData.category = productData.category;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.costPrice !== undefined) updateData.cost_price = productData.costPrice;
    if (productData.salePrice !== undefined) updateData.sale_price = productData.salePrice;
    if (productData.stockQuantity !== undefined) updateData.stock_quantity = productData.stockQuantity;
    if (productData.minStockAlert !== undefined) updateData.min_stock_alert = productData.minStockAlert;
    if (productData.photoUrl !== undefined) updateData.photo_url = productData.photoUrl;

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error);
      return false;
    }

    await fetchProducts();
    return true;
  }, []);

  const removeProduct = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing product:', error);
      return;
    }

    setProducts((prev) => prev.filter((prod) => prod.id !== id));
  }, []);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const completeSale = useCallback(async (paymentMethod: string, notes?: string): Promise<Sale | null> => {
    if (cart.length === 0 || !currentEmployeeId) return null;

    const totalAmount = cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
    const totalCost = cart.reduce((sum, item) => sum + item.product.costPrice * item.quantity, 0);
    const totalProfit = totalAmount - totalCost;

    // Criar a venda
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        employee_id: currentEmployeeId,
        total_amount: totalAmount,
        total_cost: totalCost,
        total_profit: totalProfit,
        payment_method: paymentMethod,
        notes: notes || null,
      })
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale:', saleError);
      return null;
    }

    // Criar os itens da venda
    const saleItems = cart.map((item) => ({
      sale_id: saleData.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.salePrice,
      unit_cost: item.product.costPrice,
      subtotal: item.product.salePrice * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) {
      console.error('Error creating sale items:', itemsError);
      return null;
    }

    clearCart();
    await refreshData();

    return {
      id: saleData.id,
      employeeId: saleData.employee_id,
      totalAmount: Number(saleData.total_amount),
      totalCost: Number(saleData.total_cost),
      totalProfit: Number(saleData.total_profit),
      paymentMethod: saleData.payment_method,
      notes: saleData.notes || undefined,
      createdAt: new Date(saleData.created_at),
    };
  }, [cart, currentEmployeeId, clearCart, refreshData]);

  const addStockMovement = useCallback(async (
    productId: string,
    quantity: number,
    movementType: 'entrada' | 'saida',
    reason?: string
  ): Promise<boolean> => {
    // Primeiro, atualizar o estoque do produto
    const product = products.find((p) => p.id === productId);
    if (!product) return false;

    const newQuantity = movementType === 'entrada'
      ? product.stockQuantity + quantity
      : product.stockQuantity - quantity;

    if (newQuantity < 0) return false;

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating stock:', updateError);
      return false;
    }

    // Registrar movimento
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: productId,
        quantity,
        movement_type: movementType,
        reason: reason || null,
      });

    if (movementError) {
      console.error('Error creating stock movement:', movementError);
      return false;
    }

    await refreshData();
    return true;
  }, [products, refreshData]);

  const getLowStockProducts = useCallback(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockAlert);
  }, [products]);

  const getSalesByPeriod = useCallback((startDate: Date, endDate: Date) => {
    return sales.filter((sale) => {
      const saleDate = sale.createdAt;
      return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales]);

  const getEmployeeSales = useCallback((employeeId: string, startDate?: Date, endDate?: Date) => {
    return sales.filter((sale) => {
      if (sale.employeeId !== employeeId) return false;
      if (startDate && sale.createdAt < startDate) return false;
      if (endDate && sale.createdAt > endDate) return false;
      return true;
    });
  }, [sales]);

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        stockMovements,
        cart,
        isLoading,
        isEmployeeOnShift,
        currentEmployeeId,
        addProduct,
        updateProduct,
        removeProduct,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        completeSale,
        addStockMovement,
        refreshData,
        getLowStockProducts,
        getSalesByPeriod,
        getEmployeeSales,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
