import React, { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useEmployees } from '@/contexts/EmployeeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, ShoppingBag, Users, Calendar, Package, BarChart3, Trophy } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SalesDashboard: React.FC = () => {
  const { sales, products, getSalesByPeriod } = useStore();
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
    const productSales: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};
    
    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName || 'Produto removido',
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.subtotal;
        productSales[item.productId].profit += (item.unitPrice - item.unitCost) * item.quantity;
      });
    });

    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredSales]);

  // Dados para gráfico de vendas por dia
  const salesByDay = useMemo(() => {
    const days: Record<string, { date: string; revenue: number; profit: number; sales: number }> = {};
    
    filteredSales.forEach((sale) => {
      const dateKey = format(sale.createdAt, 'dd/MM');
      if (!days[dateKey]) {
        days[dateKey] = { date: dateKey, revenue: 0, profit: 0, sales: 0 };
      }
      days[dateKey].revenue += sale.totalAmount;
      days[dateKey].profit += sale.totalProfit;
      days[dateKey].sales += 1;
    });

    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  // Dados para gráfico de categorias
  const salesByCategory = useMemo(() => {
    const categories: Record<string, { name: string; value: number }> = {
      roupa: { name: 'Roupas', value: 0 },
      sapato: { name: 'Sapatos', value: 0 },
      brinquedo: { name: 'Brinquedos', value: 0 },
    };

    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product && categories[product.category]) {
          categories[product.category].value += item.quantity;
        }
      });
    });

    return Object.values(categories).filter((c) => c.value > 0);
  }, [filteredSales, products]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

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

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Vendas por Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5" />
              Vendas por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5" />
              Vendas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesByCategory.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {salesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [`${value} un.`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda no período
              </div>
            )}
            {salesByCategory.length > 0 && (
              <div className="flex justify-center gap-4 mt-2">
                {salesByCategory.map((cat, index) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{cat.name}: {cat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Produtos do Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Produtos Mais Vendidos - {getPeriodLabel()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topProducts.slice(0, 5).map((product, index) => (
                <Card key={product.id} className={index === 0 ? 'border-yellow-500/50 bg-yellow-500/5' : ''}>
                  <CardContent className="p-4 text-center">
                    <Badge variant={index === 0 ? 'default' : 'secondary'} className="mb-2">
                      {index + 1}º lugar
                    </Badge>
                    <h4 className="font-medium text-sm truncate">{product.name}</h4>
                    <p className="text-2xl font-bold text-primary mt-1">{product.quantity}</p>
                    <p className="text-xs text-muted-foreground">unidades vendidas</p>
                    <p className="text-sm text-green-600 mt-1">R$ {product.revenue.toFixed(2)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum produto vendido no período</p>
          )}
        </CardContent>
      </Card>

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
            Todos Produtos
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
              <CardTitle>Todos os Produtos Vendidos - {getPeriodLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
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
                      <TableCell className="text-right text-green-600">R$ {product.profit.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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