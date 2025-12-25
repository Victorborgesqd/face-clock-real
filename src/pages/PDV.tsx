import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Search, Shirt, Footprints, Baby, AlertCircle, ScanBarcode, Check, X, Image } from 'lucide-react';
import { ProductCategory, Product } from '@/types/store';

const PDV: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    products,
    cart,
    isEmployeeOnShift,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    completeSale,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para confirmação de pagamento
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState('');

  // Auto-focus no input de barcode
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Se não for admin e não estiver em expediente, mostrar aviso
  if (!isAdmin && !isEmployeeOnShift) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Você precisa estar em expediente para acessar o sistema de vendas.
          Por favor, registre sua entrada no ponto primeiro.
        </p>
      </div>
    );
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.code && product.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);

  const getCategoryIcon = (category: ProductCategory) => {
    switch (category) {
      case 'roupa':
        return <Shirt className="w-4 h-4" />;
      case 'sapato':
        return <Footprints className="w-4 h-4" />;
      case 'brinquedo':
        return <Baby className="w-4 h-4" />;
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      toast({
        title: 'Produto sem estoque',
        description: 'Este produto não está disponível no momento.',
        variant: 'destructive',
      });
      return;
    }

    const cartItem = cart.find((item) => item.product.id === product.id);
    if (cartItem && cartItem.quantity >= product.stockQuantity) {
      toast({
        title: 'Estoque insuficiente',
        description: `Apenas ${product.stockQuantity} unidades disponíveis.`,
        variant: 'destructive',
      });
      return;
    }

    addToCart(product);
    toast({
      title: 'Produto adicionado',
      description: `${product.name} adicionado ao carrinho.`,
    });
  };

  // Handler para scanner de código de barras
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcodeInput.trim()) return;

    const product = products.find(
      (p) => p.code?.toLowerCase() === barcodeInput.toLowerCase().trim()
    );

    if (product) {
      handleAddToCart(product);
      setBarcodeInput('');
    } else {
      toast({
        title: 'Produto não encontrado',
        description: `Nenhum produto com o código "${barcodeInput}"`,
        variant: 'destructive',
      });
    }
    
    barcodeInputRef.current?.focus();
  };

  const handleSelectPayment = (method: string) => {
    if (cart.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione produtos ao carrinho antes de finalizar.',
        variant: 'destructive',
      });
      return;
    }
    setPendingPaymentMethod(method);
    setShowPaymentConfirm(true);
  };

  const handleConfirmSale = async () => {
    setShowPaymentConfirm(false);
    setIsProcessing(true);
    
    const sale = await completeSale(pendingPaymentMethod, notes || undefined);
    setIsProcessing(false);

    if (sale) {
      toast({
        title: 'Venda realizada!',
        description: `Total: R$ ${sale.totalAmount.toFixed(2)}`,
      });
      setNotes('');
      setPaymentMethod('dinheiro');
    } else {
      toast({
        title: 'Erro ao processar venda',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelPayment = () => {
    setShowPaymentConfirm(false);
    setPendingPaymentMethod('');
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'dinheiro': return 'Dinheiro';
      case 'cartao_credito': return 'Cartão de Crédito';
      case 'cartao_debito': return 'Cartão de Débito';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground">Chão de Giz</h1>
        <p className="text-muted-foreground text-sm">Ponto de Venda</p>
      </div>

      {/* Input de Scanner/Barcode */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <Input
                ref={barcodeInputRef}
                placeholder="Bipe o código de barras ou digite o código..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-11 text-lg h-12 font-mono"
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" className="h-12">
              <Plus className="w-5 h-5" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Produtos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ProductCategory | 'all')}>
                  <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="roupa">
                      <Shirt className="w-4 h-4 mr-1" />
                      Roupas
                    </TabsTrigger>
                    <TabsTrigger value="sapato">
                      <Footprints className="w-4 h-4 mr-1" />
                      Sapatos
                    </TabsTrigger>
                    <TabsTrigger value="brinquedo">
                      <Baby className="w-4 h-4 mr-1" />
                      Brinquedos
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Grid de Produtos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={`cursor-pointer transition-all hover:shadow-md ${product.stockQuantity <= 0 ? 'opacity-50' : ''}`}
                onClick={() => handleAddToCart(product)}
              >
                <CardContent className="p-3">
                  <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center overflow-hidden">
                    {product.photoUrl ? (
                      <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover rounded-md" />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  {product.code && (
                    <p className="text-xs text-muted-foreground font-mono truncate">{product.code}</p>
                  )}
                  <h3 className="font-medium text-sm text-foreground truncate">{product.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-primary font-bold">R$ {product.salePrice.toFixed(2)}</span>
                    <Badge variant={product.stockQuantity <= product.minStockAlert ? 'destructive' : 'secondary'} className="text-xs">
                      {product.stockQuantity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhum produto encontrado
              </div>
            )}
          </div>
        </div>

        {/* Carrinho */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrinho
                {cart.length > 0 && (
                  <Badge variant="secondary">{cart.reduce((sum, item) => sum + item.quantity, 0)}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Carrinho vazio</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-primary text-sm">R$ {(item.product.salePrice * item.quantity).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => {
                              if (item.quantity < item.product.stockQuantity) {
                                updateCartQuantity(item.product.id, item.quantity + 1);
                              }
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">R$ {cartTotal.toFixed(2)}</span>
                    </div>

                    <Input
                      placeholder="Observações (opcional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />

                    {/* Botões de pagamento */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="flex flex-col h-auto py-3"
                        onClick={() => handleSelectPayment('dinheiro')}
                        disabled={isProcessing}
                      >
                        <Banknote className="w-5 h-5 mb-1" />
                        <span className="text-xs">Dinheiro</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col h-auto py-3"
                        onClick={() => handleSelectPayment('pix')}
                        disabled={isProcessing}
                      >
                        <span className="text-lg mb-1">⚡</span>
                        <span className="text-xs">PIX</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col h-auto py-3"
                        onClick={() => handleSelectPayment('cartao_credito')}
                        disabled={isProcessing}
                      >
                        <CreditCard className="w-5 h-5 mb-1" />
                        <span className="text-xs">Crédito</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col h-auto py-3"
                        onClick={() => handleSelectPayment('cartao_debito')}
                        disabled={isProcessing}
                      >
                        <CreditCard className="w-5 h-5 mb-1" />
                        <span className="text-xs">Débito</span>
                      </Button>
                    </div>

                    <Button variant="outline" onClick={clearCart} className="w-full">
                      Limpar Carrinho
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Confirmação de Pagamento */}
      <Dialog open={showPaymentConfirm} onOpenChange={setShowPaymentConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venda</DialogTitle>
            <DialogDescription>
              A venda foi aprovada no método {getPaymentLabel(pendingPaymentMethod)}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</p>
              <p className="text-muted-foreground mt-2">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} itens • {getPaymentLabel(pendingPaymentMethod)}
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelPayment} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handleConfirmSale} disabled={isProcessing} className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processando...' : 'Venda Aprovada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDV;