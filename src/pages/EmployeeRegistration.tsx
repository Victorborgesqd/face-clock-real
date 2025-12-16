import React, { useState } from 'react';
import CameraView from '@/components/CameraView';
import { useEmployees } from '@/contexts/EmployeeContext';
import { DetectedFace } from '@/hooks/useFaceDetection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Camera, Check, User, Building } from 'lucide-react';

const EmployeeRegistration: React.FC = () => {
  const { addEmployee } = useEmployees();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'form' | 'capture'>('form');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);

  const handleStartCapture = () => {
    if (!name.trim() || !department.trim()) {
      toast({
        title: 'Preencha todos os campos',
        description: 'Nome e departamento são obrigatórios',
        variant: 'destructive',
      });
      return;
    }
    setStep('capture');
  };

  const handleCapture = (imageData: string, face: DetectedFace) => {
    setCapturedPhoto(imageData);
    setCapturedDescriptor(face.descriptor);
  };

  const handleConfirm = () => {
    if (!capturedPhoto || !capturedDescriptor) return;

    addEmployee({
      name: name.trim(),
      department: department.trim(),
      faceDescriptor: Array.from(capturedDescriptor),
      photoUrl: capturedPhoto,
    });

    toast({
      title: 'Funcionário cadastrado!',
      description: `${name} foi adicionado com sucesso.`,
    });

    // Reset form
    setName('');
    setDepartment('');
    setCapturedPhoto(null);
    setCapturedDescriptor(null);
    setStep('form');
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCapturedDescriptor(null);
  };

  const handleBack = () => {
    setStep('form');
    setCapturedPhoto(null);
    setCapturedDescriptor(null);
  };

  if (step === 'capture') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Captura Facial</CardTitle>
            <CardDescription>
              Cadastrando: <span className="font-medium text-foreground">{name}</span>
            </CardDescription>
          </CardHeader>
        </Card>

        {capturedPhoto ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="aspect-[4/3] rounded-lg overflow-hidden">
                <img
                  src={capturedPhoto}
                  alt="Foto capturada"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRetake} className="flex-1">
                  Tirar outra
                </Button>
                <Button onClick={handleConfirm} className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <CameraView
              onCapture={handleCapture}
              showCaptureButton
              className="aspect-[4/3] w-full"
            />
            <Button variant="outline" onClick={handleBack} className="w-full">
              Voltar
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Novo Funcionário
          </CardTitle>
          <CardDescription>
            Preencha os dados e capture a foto para reconhecimento facial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              placeholder="Digite o nome do funcionário"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              placeholder="Ex: Recursos Humanos"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleStartCapture} 
            className="w-full h-12"
            disabled={!name.trim() || !department.trim()}
          >
            <Camera className="w-5 h-5 mr-2" />
            Capturar Foto
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeRegistration;
