import React, { useState, useCallback, useRef } from 'react';
import CameraView from '@/components/CameraView';
import { useEmployees } from '@/contexts/EmployeeContext';
import { DetectedFace } from '@/hooks/useFaceDetection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, LogIn, LogOut, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';

const TimeClock: React.FC = () => {
  const { employees, findEmployeeByFace, addTimeRecord, getLastRecordForEmployee } = useEmployees();
  const { toast } = useToast();
  const [recognizedEmployee, setRecognizedEmployee] = useState<{
    id: string;
    name: string;
    department: string;
    photoUrl: string;
    confidence: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRecord, setLastRecord] = useState<{ type: 'entrada' | 'saida'; timestamp: Date } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const cooldownRef = useRef<string | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFaceDetected = useCallback((face: DetectedFace) => {
    if (isProcessing || employees.length === 0) return;

    // Prevent rapid re-identification of same person
    const match = findEmployeeByFace(face.descriptor);
    
    if (match) {
      const { employee, distance } = match;
      
      // If same person detected within cooldown, skip
      if (cooldownRef.current === employee.id) {
        return;
      }
      
      // Clear previous cooldown
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
      
      // Set cooldown for this person (3 seconds)
      cooldownRef.current = employee.id;
      cooldownTimerRef.current = setTimeout(() => {
        cooldownRef.current = null;
      }, 3000);
      
      const confidence = Math.round((1 - distance) * 100);
      
      setRecognizedEmployee({
        id: employee.id,
        name: employee.name,
        department: employee.department,
        photoUrl: employee.photoUrl,
        confidence,
      });
      
      const lastRec = getLastRecordForEmployee(employee.id);
      if (lastRec) {
        setLastRecord({ type: lastRec.type, timestamp: lastRec.timestamp });
      } else {
        setLastRecord(null);
      }
    } else {
      // Only clear if no match and not in cooldown
      if (!cooldownRef.current) {
        setRecognizedEmployee(null);
        setLastRecord(null);
      }
    }
  }, [findEmployeeByFace, getLastRecordForEmployee, isProcessing, employees.length]);

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
      title: type === 'entrada' ? '✅ Entrada registrada!' : '✅ Saída registrada!',
      description: `${recognizedEmployee.name} - ${format(record.timestamp, "HH:mm:ss", { locale: ptBR })}`,
    });

    // Clear cooldown to allow re-identification
    cooldownRef.current = null;
    
    setTimeout(() => {
      setIsProcessing(false);
      setRecognizedEmployee(null);
    }, 2000);
  };

  const suggestedType: 'entrada' | 'saida' = lastRecord?.type === 'entrada' ? 'saida' : 'entrada';

  return (
    <div className="space-y-4">
      {/* Current time */}
      <Card className="p-4 text-center bg-card">
        <p className="text-4xl font-bold text-foreground font-mono">
          {format(currentTime, "HH:mm:ss", { locale: ptBR })}
        </p>
        <p className="text-muted-foreground capitalize">
          {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </Card>

      {/* No employees warning */}
      {employees.length === 0 && (
        <Card className="p-4 bg-accent border-accent-foreground/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-foreground" />
            <div>
              <p className="font-medium text-foreground">Nenhum funcionário cadastrado</p>
              <p className="text-sm text-muted-foreground">
                Cadastre funcionários antes de usar o ponto.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Camera */}
      <CameraView
        onFaceDetected={handleFaceDetected}
        className="aspect-[4/3] w-full"
        autoDetect={employees.length > 0}
      />

      {/* Recognition result */}
      {recognizedEmployee ? (
        <Card className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-primary">
              <img
                src={recognizedEmployee.photoUrl}
                alt={recognizedEmployee.name}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary font-medium">
                  Identificado ({recognizedEmployee.confidence}% de confiança)
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{recognizedEmployee.name}</h3>
              <p className="text-sm text-muted-foreground">{recognizedEmployee.department}</p>
            </div>
          </div>

          {lastRecord && (
            <p className="text-sm text-muted-foreground mb-4 text-center bg-muted/50 py-2 rounded-lg">
              Último registro: <span className="font-medium">{lastRecord.type === 'entrada' ? 'Entrada' : 'Saída'}</span> às{' '}
              <span className="font-mono">{format(lastRecord.timestamp, "HH:mm", { locale: ptBR })}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleRegisterPoint('entrada')}
              disabled={isProcessing}
              variant={suggestedType === 'entrada' ? 'default' : 'outline'}
              className="h-14 text-base"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Entrada
            </Button>
            <Button
              onClick={() => handleRegisterPoint('saida')}
              disabled={isProcessing}
              variant={suggestedType === 'saida' ? 'default' : 'outline'}
              className="h-14 text-base"
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
                {employees.length > 0 
                  ? 'Posicione seu rosto na câmera' 
                  : 'Cadastre funcionários primeiro'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TimeClock;
