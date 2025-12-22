import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Employee, TimeRecord } from '@/types/employee';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as faceapi from 'face-api.js';

interface EmployeeContextType {
  employees: Employee[];
  timeRecords: TimeRecord[];
  isLoading: boolean;
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => Promise<Employee | null>;
  removeEmployee: (id: string) => Promise<void>;
  addTimeRecord: (record: Omit<TimeRecord, 'id'>) => Promise<TimeRecord | null>;
  findEmployeeByFace: (descriptor: Float32Array) => { employee: Employee; distance: number } | null;
  getLastRecordForEmployee: (employeeId: string) => TimeRecord | null;
  refreshData: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
      return;
    }

    const mappedEmployees: Employee[] = (data || []).map((emp) => ({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department || undefined,
      photoUrl: emp.photo_url || undefined,
      faceDescriptor: emp.face_descriptor as number[],
      createdAt: new Date(emp.created_at),
    }));

    setEmployees(mappedEmployees);
  };

  const fetchTimeRecords = async () => {
    const { data, error } = await supabase
      .from('time_records')
      .select(`
        *,
        employees(name)
      `)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching time records:', error);
      return;
    }

    const mappedRecords: TimeRecord[] = (data || []).map((rec) => ({
      id: rec.id,
      employeeId: rec.employee_id,
      employeeName: (rec.employees as { name: string })?.name || 'Desconhecido',
      timestamp: new Date(rec.timestamp),
      type: rec.type as 'entrada' | 'saida',
    }));

    setTimeRecords(mappedRecords);
  };

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchEmployees(), fetchTimeRecords()]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setEmployees([]);
      setTimeRecords([]);
      setIsLoading(false);
    }
  }, [user, refreshData]);

  // Real-time subscription for time_records
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('time-records-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'time_records',
        },
        async () => {
          await fetchTimeRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addEmployee = useCallback(async (employeeData: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee | null> => {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        name: employeeData.name,
        role: employeeData.role,
        department: employeeData.department || null,
        photo_url: employeeData.photoUrl || null,
        face_descriptor: employeeData.faceDescriptor,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding employee:', error);
      return null;
    }

    const newEmployee: Employee = {
      id: data.id,
      name: data.name,
      role: data.role,
      department: data.department || undefined,
      photoUrl: data.photo_url || undefined,
      faceDescriptor: data.face_descriptor as number[],
      createdAt: new Date(data.created_at),
    };

    setEmployees((prev) => [newEmployee, ...prev]);
    return newEmployee;
  }, []);

  const removeEmployee = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing employee:', error);
      return;
    }

    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  }, []);

  const addTimeRecord = useCallback(async (recordData: Omit<TimeRecord, 'id'>): Promise<TimeRecord | null> => {
    const { data, error } = await supabase
      .from('time_records')
      .insert({
        employee_id: recordData.employeeId,
        timestamp: recordData.timestamp.toISOString(),
        type: recordData.type,
      })
      .select(`
        *,
        employees(name)
      `)
      .single();

    if (error) {
      console.error('Error adding time record:', error);
      return null;
    }

    const newRecord: TimeRecord = {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: (data.employees as { name: string })?.name || recordData.employeeName,
      timestamp: new Date(data.timestamp),
      type: data.type as 'entrada' | 'saida',
    };

    setTimeRecords((prev) => [newRecord, ...prev]);
    return newRecord;
  }, []);

  const findEmployeeByFace = useCallback((descriptor: Float32Array): { employee: Employee; distance: number } | null => {
    if (employees.length === 0) {
      console.log('Nenhum funcionário cadastrado');
      return null;
    }

    const THRESHOLD = 0.6;
    let bestMatch: { employee: Employee; distance: number } | null = null;

    for (const employee of employees) {
      const storedDescriptor = new Float32Array(employee.faceDescriptor);
      const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);

      if (distance < THRESHOLD && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { employee, distance };
      }
    }

    return bestMatch;
  }, [employees]);

  const getLastRecordForEmployee = useCallback((employeeId: string): TimeRecord | null => {
    const employeeRecords = timeRecords
      .filter((rec) => rec.employeeId === employeeId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return employeeRecords[0] || null;
  }, [timeRecords]);

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        timeRecords,
        isLoading,
        addEmployee,
        removeEmployee,
        addTimeRecord,
        findEmployeeByFace,
        getLastRecordForEmployee,
        refreshData,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployees must be used within an EmployeeProvider');
  }
  return context;
};
