import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/contexts/EmployeeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  AlertTriangle,
  Loader2,
  LogIn,
  LogOut,
  Trash2
} from 'lucide-react';
import { format, startOfDay, endOfDay, differenceInMinutes, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeHours {
  employeeId: string;
  employeeName: string;
  role: string;
  totalMinutesWorked: number;
  expectedMinutes: number;
  missingMinutes: number;
  extraMinutes: number;
  daysWorked: number;
  recordsCount: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { employees, timeRecords, isLoading, removeEmployee } = useEmployees();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [employeeHours, setEmployeeHours] = useState<EmployeeHours[]>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    calculateEmployeeHours();
  }, [timeRecords, employees, selectedMonth]);

  const calculateEmployeeHours = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    
    // Calculate working days in month (Mon-Fri)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDays = daysInMonth.filter(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday (0) or Saturday (6)
    }).length;

    const DAILY_EXPECTED_HOURS = 8;
    const expectedMonthMinutes = workingDays * DAILY_EXPECTED_HOURS * 60;

    const hoursData: EmployeeHours[] = employees.map(emp => {
      // Filter records for this employee in selected month
      const empRecords = timeRecords
        .filter(r => {
          const recordDate = new Date(r.timestamp);
          return r.employeeId === emp.id && 
                 recordDate >= monthStart && 
                 recordDate <= monthEnd;
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Group by day and calculate worked hours
      let totalMinutesWorked = 0;
      const workedDays = new Set<string>();

      // Match entrada/saida pairs
      let currentEntry: Date | null = null;
      
      for (const record of empRecords) {
        const recordDate = new Date(record.timestamp);
        workedDays.add(format(recordDate, 'yyyy-MM-dd'));
        
        if (record.type === 'entrada') {
          currentEntry = recordDate;
        } else if (record.type === 'saida' && currentEntry) {
          const minutes = differenceInMinutes(recordDate, currentEntry);
          if (minutes > 0 && minutes < 24 * 60) { // Max 24 hours per session
            totalMinutesWorked += minutes;
          }
          currentEntry = null;
        }
      }

      const missingMinutes = Math.max(0, expectedMonthMinutes - totalMinutesWorked);
      const extraMinutes = Math.max(0, totalMinutesWorked - expectedMonthMinutes);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        totalMinutesWorked,
        expectedMinutes: expectedMonthMinutes,
        missingMinutes,
        extraMinutes,
        daysWorked: workedDays.size,
        recordsCount: empRecords.length,
      };
    });

    setEmployeeHours(hoursData);
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTodayRecords = () => {
    const today = new Date();
    return timeRecords.filter(r => isSameDay(new Date(r.timestamp), today));
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este funcionário? Todos os registros de ponto serão perdidos.')) {
      await removeEmployee(id);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const todayRecords = getTodayRecords();
  const totalEmployees = employees.length;
  const totalRecordsThisMonth = timeRecords.filter(r => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const recordDate = new Date(r.timestamp);
    return recordDate.getMonth() === month - 1 && recordDate.getFullYear() === year;
  }).length;
  
  const totalHoursWorked = employeeHours.reduce((sum, emp) => sum + emp.totalMinutesWorked, 0);
  const totalMissingHours = employeeHours.reduce((sum, emp) => sum + emp.missingMinutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Dashboard Admin
          </h1>
          <p className="text-muted-foreground">Gestão de ponto e funcionários</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const value = format(date, 'yyyy-MM');
              return (
                <SelectItem key={value} value={value}>
                  {format(date, 'MMMM yyyy', { locale: ptBR })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalEmployees}</p>
                <p className="text-xs text-muted-foreground">Funcionários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalRecordsThisMonth}</p>
                <p className="text-xs text-muted-foreground">Registros no mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatMinutes(totalHoursWorked)}</p>
                <p className="text-xs text-muted-foreground">Horas trabalhadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatMinutes(totalMissingHours)}</p>
                <p className="text-xs text-muted-foreground">Horas faltantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hours" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hours">Horas por Funcionário</TabsTrigger>
          <TabsTrigger value="today">Registros de Hoje</TabsTrigger>
          <TabsTrigger value="employees">Funcionários</TabsTrigger>
        </TabsList>

        <TabsContent value="hours" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Controle de Horas - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <CardDescription>
                Horas trabalhadas, faltantes e acumuladas por funcionário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employeeHours.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-center">Dias</TableHead>
                      <TableHead className="text-right">Trabalhadas</TableHead>
                      <TableHead className="text-right">Esperadas</TableHead>
                      <TableHead className="text-right">Faltantes</TableHead>
                      <TableHead className="text-right">Extras</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeHours.map((emp) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="font-medium">{emp.employeeName}</TableCell>
                        <TableCell className="text-muted-foreground">{emp.role}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{emp.daysWorked}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMinutes(emp.totalMinutesWorked)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatMinutes(emp.expectedMinutes)}
                        </TableCell>
                        <TableCell className="text-right">
                          {emp.missingMinutes > 0 ? (
                            <Badge variant="destructive">{formatMinutes(emp.missingMinutes)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {emp.extraMinutes > 0 ? (
                            <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                              +{formatMinutes(emp.extraMinutes)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="today" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Registros de Hoje
              </CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum registro hoje</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Horário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={record.type === 'entrada' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {record.type === 'entrada' ? (
                              <LogIn className="w-3 h-3" />
                            ) : (
                              <LogOut className="w-3 h-3" />
                            )}
                            {record.type === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {format(new Date(record.timestamp), 'HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Funcionários Cadastrados
              </CardTitle>
              <CardDescription>
                Gerenciamento de funcionários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-center">Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.role}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {emp.department || '-'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {format(new Date(emp.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
