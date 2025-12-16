import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Employee, TimeRecord } from '@/types/employee';

interface EmployeeContextType {
  employees: Employee[];
  timeRecords: TimeRecord[];
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => Employee;
  removeEmployee: (id: string) => void;
  addTimeRecord: (record: Omit<TimeRecord, 'id'>) => TimeRecord;
  findEmployeeByFace: (descriptor: Float32Array, threshold?: number) => Employee | null;
  getLastRecordForEmployee: (employeeId: string) => TimeRecord | null;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  employees: 'pontofacial_employees',
  records: 'pontofacial_records',
};

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.employees);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((emp: any) => ({
        ...emp,
        createdAt: new Date(emp.createdAt),
      }));
    }
    return [];
  });

  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.records);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((rec: any) => ({
        ...rec,
        timestamp: new Date(rec.timestamp),
      }));
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(employees));
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

  const euclideanDistance = (arr1: number[], arr2: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
      sum += Math.pow(arr1[i] - arr2[i], 2);
    }
    return Math.sqrt(sum);
  };

  const findEmployeeByFace = useCallback((descriptor: Float32Array, threshold = 0.6): Employee | null => {
    let bestMatch: Employee | null = null;
    let bestDistance = threshold;

    for (const employee of employees) {
      const distance = euclideanDistance(employee.faceDescriptor, descriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = employee;
      }
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
