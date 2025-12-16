import React, { useState, useRef } from 'react';
import CameraView, { CameraViewRef } from '@/components/CameraView';
import { useEmployees } from '@/contexts/EmployeeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Camera, Check, User, RefreshCw, ArrowLeft } from 'lucide-react';

const EmployeeRegistration: React.FC = () => {
  const { addEmployee } = useEmployees();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'form' | 'capture'>('form');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
  const cameraRef = useRef<CameraViewRef>(null);

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

  const handleCapture = (imageData: string, face: { descriptor: Float32Array }) => {
    console.log('Foto capturada, descriptor length:', face.descriptor.length);
    setCapturedPhoto(imageData);
    setCapturedDescriptor(face.descriptor);
    
    toast({
      title: 'Foto capturada!',
      description: 'Verifique se a foto está boa e confirme o cadastro.',
    });
  };

  const handleConfirm = () => {
    if (!capturedPhoto || !capturedDescriptor) {
      toast({
        title: 'Erro',
        description: 'Capture uma foto antes de confirmar',
        variant: 'destructive',
      });
      return;
    }

    console.log('Salvando funcionário com descriptor de tamanho:', capturedDescriptor.length);

    addEmployee({
      name: name.trim(),
      department: department.trim(),
      faceDescriptor: Array.from(capturedDescriptor),
      photoUrl: capturedPhoto,
    });

    toast({
      title: '✅ Funcionário cadastrado!',
      description: `${name} foi adicionado com sucesso ao sistema.`,
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Captura Facial
            </CardTitle>
            <CardDescription>
              Cadastrando: <span className="font-semibold text-foreground">{name}</span>
            </CardDescription>
          </CardHeader>
        </Card>

        {capturedPhoto ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                <img
                  src={capturedPhoto}
                  alt="Foto capturada"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Verifique se o rosto está bem visível na foto
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRetake} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
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
              ref={cameraRef}
              onCapture={handleCapture}
              showCaptureButton
              className="aspect-[4/3] w-full"
            />
            <Button variant="outline" onClick={handleBack} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
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
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              placeholder="Ex: Recursos Humanos"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              autoComplete="off"
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
