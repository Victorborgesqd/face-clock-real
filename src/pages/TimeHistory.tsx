import React, { useState } from 'react';
import { useEmployees } from '@/contexts/EmployeeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, LogIn, LogOut, Clock, Calendar } from 'lucide-react';
import { format, isToday, isYesterday, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const TimeHistory: React.FC = () => {
  const { timeRecords, employees } = useEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const filteredRecords = selectedEmployee === 'all'
    ? timeRecords
    : timeRecords.filter(r => r.employeeId === selectedEmployee);

  // Group records by date
  const groupedRecords = filteredRecords.reduce((groups, record) => {
    const dateKey = startOfDay(record.timestamp).toISOString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(record);
    return groups;
  }, {} as Record<string, typeof timeRecords>);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  if (timeRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhum registro encontrado
          </h3>
          <p className="text-muted-foreground">
            Os registros de ponto aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico de Ponto
          </CardTitle>
          <CardDescription>
            {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {Object.entries(groupedRecords).map(([dateKey, records]) => (
        <div key={dateKey}>
          <div className="flex items-center gap-2 px-2 py-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground capitalize">
              {formatDateHeader(dateKey)}
            </span>
          </div>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {records.map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    record.type === 'entrada' 
                      ? "bg-primary/10 text-primary" 
                      : "bg-secondary/10 text-secondary"
                  )}>
                    {record.type === 'entrada' ? (
                      <LogIn className="w-5 h-5" />
                    ) : (
                      <LogOut className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {record.employeeName}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {record.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium text-foreground">
                      {format(record.timestamp, "HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(record.timestamp, "ss's'", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default TimeHistory;
