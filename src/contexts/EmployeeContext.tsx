import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Employee, TimeRecord } from '@/types/employee';
import * as faceapi from 'face-api.js';

interface EmployeeContextType {
  employees: Employee[];
  timeRecords: TimeRecord[];
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => Employee;
  removeEmployee: (id: string) => void;
  addTimeRecord: (record: Omit<TimeRecord, 'id'>) => TimeRecord;
  findEmployeeByFace: (descriptor: Float32Array) => { employee: Employee; distance: number } | null;
  getLastRecordForEmployee: (employeeId: string) => TimeRecord | null;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  employees: 'pontofacial_employees',
  records: 'pontofacial_records',
};

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.employees);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((emp: any) => ({
          ...emp,
          createdAt: new Date(emp.createdAt),
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    }
    return [];
  });

  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.records);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((rec: any) => ({
          ...rec,
          timestamp: new Date(rec.timestamp),
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(employees));
    console.log('Funcionários salvos:', employees.length);
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(timeRecords));
  }, [timeRecords]);

  const addEmployee = useCallback((employeeData: Omit<Employee, 'id' | 'createdAt'>): Employee => {
    const newEmployee: Employee = {
      ...employeeData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setEmployees(prev => [...prev, newEmployee]);
    console.log('Novo funcionário adicionado:', newEmployee.name);
    console.log('Descriptor length:', newEmployee.faceDescriptor.length);
    return newEmployee;
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  }, []);

  const addTimeRecord = useCallback((recordData: Omit<TimeRecord, 'id'>): TimeRecord => {
    const newRecord: TimeRecord = {
      ...recordData,
      id: crypto.randomUUID(),
    };
    setTimeRecords(prev => [newRecord, ...prev]);
    return newRecord;
  }, []);

  const findEmployeeByFace = useCallback((descriptor: Float32Array): { employee: Employee; distance: number } | null => {
    if (employees.length === 0) {
      console.log('Nenhum funcionário cadastrado');
      return null;
    }

    const THRESHOLD = 0.6; // Threshold para considerar uma correspondência
    let bestMatch: { employee: Employee; distance: number } | null = null;

    console.log('Procurando correspondência entre', employees.length, 'funcionários');

    for (const employee of employees) {
      const storedDescriptor = new Float32Array(employee.faceDescriptor);
      const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
      
      console.log(`Distância para ${employee.name}: ${distance.toFixed(3)}`);

      if (distance < THRESHOLD && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { employee, distance };
      }
    }

    if (bestMatch) {
      console.log(`Melhor correspondência: ${bestMatch.employee.name} (distância: ${bestMatch.distance.toFixed(3)})`);
    } else {
      console.log('Nenhuma correspondência encontrada');
    }

    return bestMatch;
  }, [employees]);

  const getLastRecordForEmployee = useCallback((employeeId: string): TimeRecord | null => {
    const employeeRecords = timeRecords
      .filter(rec => rec.employeeId === employeeId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return employeeRecords[0] || null;
  }, [timeRecords]);

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        timeRecords,
        addEmployee,
        removeEmployee,
        addTimeRecord,
        findEmployeeByFace,
        getLastRecordForEmployee,
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
