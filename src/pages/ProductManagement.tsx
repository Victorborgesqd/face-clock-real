import React, { useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { ProductCategory } from '@/types/store';

const ProductManagement: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    removeProduct,
    addStockMovement,
    getLowStockProducts,
  } = useStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'roupa' as ProductCategory,
    description: '',
    costPrice: '',
    salePrice: '',
    stockQuantity: '',
    minStockAlert: '5',
  });

  const [stockData, setStockData] = useState({
    quantity: '',
    movementType: 'entrada' as 'entrada' | 'saida',
    reason: '',
  });

  const lowStockProducts = getLowStockProducts();

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'roupa',
      description: '',
      costPrice: '',
      salePrice: '',
      stockQuantity: '',
      minStockAlert: '5',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const product = await addProduct({
      name: formData.name,
      category: formData.category,
      description: formData.description || undefined,
      costPrice: parseFloat(formData.costPrice),
      salePrice: parseFloat(formData.salePrice),
      stockQuantity: parseInt(formData.stockQuantity),
      minStockAlert: parseInt(formData.minStockAlert),
    });

    setIsSubmitting(false);

    if (product) {
      toast({
        title: 'Produto cadastrado!',
        description: `${product.name} foi adicionado com sucesso.`,
      });
      resetForm();
      setIsAddDialogOpen(false);
    } else {
      toast({
        title: 'Erro ao cadastrar',
        description: 'Verifique se você tem permissão de admin.',
        variant: 'destructive',
      });
    }
  };

  const handleStockMovement = async () => {
    if (!selectedProductId) return;

    setIsSubmitting(true);
    const success = await addStockMovement(
      selectedProductId,
      parseInt(stockData.quantity),
      stockData.movementType,
      stockData.reason || undefined
    );
    setIsSubmitting(false);

    if (success) {
      toast({
        title: 'Estoque atualizado!',
        description: `Movimento de ${stockData.movementType} registrado.`,
      });
      setStockData({ quantity: '', movementType: 'entrada', reason: '' });
      setIsStockDialogOpen(false);
    } else {
      toast({
        title: 'Erro ao atualizar estoque',
        description: 'Verifique a quantidade disponível.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      await removeProduct(id);
      toast({
        title: 'Produto excluído',
        description: `${name} foi removido.`,
      });
    }
  };

  const getCategoryLabel = (category: ProductCategory) => {
    switch (category) {
      case 'roupa': return 'Roupa';
      case 'sapato': return 'Sapato';
      case 'brinquedo': return 'Brinquedo';
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Produtos</h1>
          <p className="text-muted-foreground text-sm">Cadastre e gerencie o estoque</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Produto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as ProductCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roupa">Roupa</SelectItem>
                    <SelectItem value="sapato">Sapato</SelectItem>
                    <SelectItem value="brinquedo">Brinquedo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Preço de Custo (R$)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda (R$)</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Quantidade Inicial</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStockAlert">Alerta Mínimo</Label>
                  <Input
                    id="minStockAlert"
                    type="number"
                    min="0"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Cadastrar Produto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerta de Estoque Baixo */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5" />
              Produtos com Estoque Baixo ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((p) => (
                <Badge key={p.id} variant="destructive">
                  {p.name}: {p.stockQuantity} un.
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produtos ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Venda</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const profit = product.salePrice - product.costPrice;
                const profitPercent = ((profit / product.costPrice) * 100).toFixed(0);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(product.category)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">R$ {product.costPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {product.salePrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600">
                      R$ {profit.toFixed(2)} ({profitPercent}%)
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.stockQuantity <= product.minStockAlert ? 'destructive' : 'secondary'}>
                        {product.stockQuantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setIsStockDialogOpen(true);
                          }}
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDelete(product.id, product.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum produto cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Movimentação de Estoque */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentação de Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <Select
                value={stockData.movementType}
                onValueChange={(v) => setStockData({ ...stockData, movementType: v as 'entrada' | 'saida' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4 text-green-600" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="saida">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4 text-red-600" />
                      Saída
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockQty">Quantidade</Label>
              <Input
                id="stockQty"
                type="number"
                min="1"
                value={stockData.quantity}
                onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockReason">Motivo (opcional)</Label>
              <Input
                id="stockReason"
                value={stockData.reason}
                onChange={(e) => setStockData({ ...stockData, reason: e.target.value })}
                placeholder="Ex: Reposição de estoque"
              />
            </div>

            <Button onClick={handleStockMovement} className="w-full" disabled={isSubmitting || !stockData.quantity}>
              {isSubmitting ? 'Salvando...' : 'Confirmar Movimentação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
