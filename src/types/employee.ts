export interface Employee {
  id: string;
  name: string;
  role: string;
  department?: string;
  faceDescriptor: number[];
  photoUrl?: string;
  createdAt: Date;
}

export interface TimeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'entrada' | 'saida';
  timestamp: Date;
  photoUrl?: string;
}
