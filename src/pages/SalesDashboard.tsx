import React, { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useEmployees } from '@/contexts/EmployeeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, ShoppingBag, Users, Calendar, Package } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SalesDashboard: React.FC = () => {
  const { sales, products, getSalesByPeriod, getEmployeeSales } = useStore();
  const { employees } = useEmployees();
  const [period, setPeriod] = useState<'today' | '7days' | '30days'>('today');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const getPeriodDates = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case '7days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    }
  };

  const { start, end } = getPeriodDates();

  const filteredSales = useMemo(() => {
    let result = getSalesByPeriod(start, end);
    if (selectedEmployee !== 'all') {
      result = result.filter((sale) => sale.employeeId === selectedEmployee);
    }
    return result;
  }, [sales, period, selectedEmployee, start, end, getSalesByPeriod]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCost = filteredSales.reduce((sum, sale) => sum + sale.totalCost, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.totalProfit, 0);
    const totalSales = filteredSales.length;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    return { totalRevenue, totalCost, totalProfit, totalSales, averageTicket };
  }, [filteredSales]);

  // Ranking de funcionários por vendas
  const employeeRanking = useMemo(() => {
    const periodSales = getSalesByPeriod(start, end);
    const ranking = employees.map((emp) => {
      const empSales = periodSales.filter((sale) => sale.employeeId === emp.id);
      const totalRevenue = empSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const totalProfit = empSales.reduce((sum, sale) => sum + sale.totalProfit, 0);
      const salesCount = empSales.length;
      return { ...emp, totalRevenue, totalProfit, salesCount };
    });
    return ranking.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [employees, period, start, end, getSalesByPeriod]);

  // Produtos mais vendidos
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName || 'Produto removido',
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.subtotal;
      });
    });

    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredSales]);

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return 'Hoje';
      case '7days':
        return 'Últimos 7 dias';
      case '30days':
        return 'Últimos 30 dias';
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Vendas</h1>
          <p className="text-muted-foreground text-sm">Chão de Giz - Gestão Comercial</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="30days">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-44">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">R$ {stats.totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">R$ {stats.totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">R$ {stats.totalProfit.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalSales}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R$ {stats.averageTicket.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="ranking">
            <TrendingUp className="w-4 h-4 mr-2" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Produtos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Vendas - {getPeriodLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {format(sale.createdAt, "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{sale.employeeName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} itens
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sale.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {sale.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        R$ {sale.totalProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma venda no período selecionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Funcionários - {getPeriodLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Lucro Gerado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeRanking.map((emp, index) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          {index + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-center">{emp.salesCount}</TableCell>
                      <TableCell className="text-right">R$ {emp.totalRevenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        R$ {emp.totalProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {employeeRanking.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum funcionário cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos - {getPeriodLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          {index + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-center">{product.quantity} un.</TableCell>
                      <TableCell className="text-right">R$ {product.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum produto vendido no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesDashboard;
