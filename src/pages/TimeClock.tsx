import React, { useState, useCallback, useRef } from 'react';
import CameraView from '@/components/CameraView';
import { useEmployees } from '@/contexts/EmployeeContext';
import { DetectedFace } from '@/hooks/useFaceDetection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, LogIn, LogOut, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TimeClock: React.FC = () => {
  const { findEmployeeByFace, addTimeRecord, getLastRecordForEmployee } = useEmployees();
  const { toast } = useToast();
  const [recognizedEmployee, setRecognizedEmployee] = useState<{
    id: string;
    name: string;
    department: string;
    photoUrl: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRecord, setLastRecord] = useState<{ type: 'entrada' | 'saida'; timestamp: Date } | null>(null);
  const lastDetectionRef = useRef<string | null>(null);

  const handleFaceDetected = useCallback((face: DetectedFace) => {
    if (isProcessing) return;

    const employee = findEmployeeByFace(face.descriptor);
    
    if (employee && employee.id !== lastDetectionRef.current) {
      lastDetectionRef.current = employee.id;
      setRecognizedEmployee({
        id: employee.id,
        name: employee.name,
        department: employee.department,
        photoUrl: employee.photoUrl,
      });
      
      const lastRec = getLastRecordForEmployee(employee.id);
      if (lastRec) {
        setLastRecord({ type: lastRec.type, timestamp: lastRec.timestamp });
      } else {
        setLastRecord(null);
      }
    } else if (!employee) {
      if (lastDetectionRef.current) {
        lastDetectionRef.current = null;
        setRecognizedEmployee(null);
        setLastRecord(null);
      }
    }
  }, [findEmployeeByFace, getLastRecordForEmployee, isProcessing]);

  const handleRegisterPoint = (type: 'entrada' | 'saida') => {
    if (!recognizedEmployee) return;

    setIsProcessing(true);

    const record = addTimeRecord({
      employeeId: recognizedEmployee.id,
      employeeName: recognizedEmployee.name,
      type,
      timestamp: new Date(),
    });

    setLastRecord({ type: record.type, timestamp: record.timestamp });

    toast({
      title: type === 'entrada' ? 'Entrada registrada!' : 'Saída registrada!',
      description: `${recognizedEmployee.name} - ${format(record.timestamp, "HH:mm:ss", { locale: ptBR })}`,
    });

    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  };

  const suggestedType: 'entrada' | 'saida' = lastRecord?.type === 'entrada' ? 'saida' : 'entrada';

  return (
    <div className="space-y-4">
      {/* Current time */}
      <Card className="p-4 text-center">
        <p className="text-3xl font-bold text-foreground">
          {format(new Date(), "HH:mm:ss", { locale: ptBR })}
        </p>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </Card>

      {/* Camera */}
      <CameraView
        onFaceDetected={handleFaceDetected}
        className="aspect-[4/3] w-full"
      />

      {/* Recognition result */}
      {recognizedEmployee ? (
        <Card className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted">
              <img
                src={recognizedEmployee.photoUrl}
                alt={recognizedEmployee.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary font-medium">Identificado</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{recognizedEmployee.name}</h3>
              <p className="text-sm text-muted-foreground">{recognizedEmployee.department}</p>
            </div>
          </div>

          {lastRecord && (
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Último registro: {lastRecord.type === 'entrada' ? 'Entrada' : 'Saída'} às{' '}
              {format(lastRecord.timestamp, "HH:mm", { locale: ptBR })}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleRegisterPoint('entrada')}
              disabled={isProcessing}
              variant={suggestedType === 'entrada' ? 'default' : 'outline'}
              className="h-14"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Entrada
            </Button>
            <Button
              onClick={() => handleRegisterPoint('saida')}
              disabled={isProcessing}
              variant={suggestedType === 'saida' ? 'default' : 'outline'}
              className="h-14"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Saída
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-medium">Aguardando identificação</p>
              <p className="text-sm text-muted-foreground">
                Posicione seu rosto na câmera
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TimeClock;
