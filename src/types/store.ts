export type ProductCategory = 'roupa' | 'sapato' | 'brinquedo';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description?: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStockAlert: number;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  employeeId: string;
  employeeName?: string;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  paymentMethod: string;
  notes?: string;
  createdAt: Date;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  movementType: 'entrada' | 'saida';
  reason?: string;
  createdAt: Date;
}
