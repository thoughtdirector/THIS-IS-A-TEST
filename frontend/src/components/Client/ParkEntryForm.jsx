import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, FileText, Camera } from 'lucide-react';
import { ClientService } from '../../client/services';
import useAuth from '../../hooks/useAuth';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

const ParkEntryForm = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Set current date and time
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().split('T')[0];
  const formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const [entryData, setEntryData] = useState({
    // Child information
    child_name: '',
    child_age: '',
    
    // Adult information
    adult_name: user?.full_name || '',
    identification_number: '',
    relationship: '',
    phone_number: user?.phone || '',
    email: user?.email || '',
    
    // Date and time
    entry_date: formattedDate,
    entry_time: formattedTime,
    
    // Location
    city: '',
    
    // Authorizations
    authorize_entry: 'yes',
    authorize_photos: 'yes',
    authorize_marketing: 'yes',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEntryData({
      ...entryData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  const handleRadioChange = (name, value) => {
    setEntryData({
      ...entryData,
      [name]: value,
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Here we would normally call the API to save the data
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful submission
      alert('Entry form submitted successfully!');
      navigate({ to: '/dashboard/client/plans' });
    } catch (err) {
      setError(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Registro de Ingreso al Parque</h1>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            {/* Company logo placeholder */}
            <div className="w-48 h-24 bg-gray-200 flex items-center justify-center rounded">
              <Camera className="h-8 w-8 text-gray-400" />
              <span className="ml-2 text-gray-500">Logo</span>
            </div>
          </div>
          <CardTitle className="text-center">Formulario de Autorización</CardTitle>
          <CardDescription className="text-center">
            Por favor complete todos los campos para el ingreso al parque
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Authorization question */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Por medio de la presente, el (la) firmante, mayor de edad identificado como aparece al pie de su nombre:
              </Label>
              <div className="pl-4">
                <RadioGroup
                  value={entryData.authorize_entry}
                  onValueChange={(value) => handleRadioChange('authorize_entry', value)}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="authorize-yes" />
                    <Label htmlFor="authorize-yes">¿Autoriza en calidad de responsable al menor de edad el ingreso al parque?</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="authorize-no" />
                    <Label htmlFor="authorize-no">No autorizo</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            <Separator />
            
            {/* Child information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="child_name">Nombre del menor de edad</Label>
                <Input
                  id="child_name"
                  name="child_name"
                  value={entryData.child_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="child_age">Edad del niño</Label>
                <Input
                  id="child_age"
                  name="child_age"
                  type="number"
                  min="0"
                  max="17"
                  value={entryData.child_age}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Adult information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adult_name">Nombre completo del adulto</Label>
                <Input
                  id="adult_name"
                  name="adult_name"
                  value={entryData.adult_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="identification_number">Número de documento de identidad</Label>
                <Input
                  id="identification_number"
                  name="identification_number"
                  value={entryData.identification_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="relationship">Parentesco del menor</Label>
                <Input
                  id="relationship"
                  name="relationship"
                  value={entryData.relationship}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone_number">Número de celular</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={entryData.phone_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={entryData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry_date">Fecha de ingreso al parque</Label>
                <Input
                  id="entry_date"
                  name="entry_date"
                  type="date"
                  value={entryData.entry_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="entry_time">Hora de ingreso</Label>
                <Input
                  id="entry_time"
                  name="entry_time"
                  type="time"
                  value={entryData.entry_time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad de domicilio</Label>
              <Input
                id="city"
                name="city"
                value={entryData.city}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <Separator />
            
            {/* Important Note */}
            <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="font-bold text-center">
                NOTA: LA CONTABILIZACIÓN DEL TIEMPO CORRE POR SU CUENTA, NO DAMOS AVISO DEL TIEMPO TRANSCURRIDO.
              </AlertDescription>
            </Alert>
            
            <Separator />
            
            {/* Additional Authorizations */}
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base">¿Autoriza a la casa en el árbol para el uso de fotografías o videos capturados en el parque?</Label>
                <RadioGroup
                  value={entryData.authorize_photos}
                  onValueChange={(value) => handleRadioChange('authorize_photos', value)}
                  className="flex flex-row space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="photos-yes" />
                    <Label htmlFor="photos-yes">Si</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="photos-no" />
                    <Label htmlFor="photos-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-3">
                <Label className="text-base">¿Autoriza al parque el envío de mails y mensajes de texto?</Label>
                <RadioGroup
                  value={entryData.authorize_marketing}
                  onValueChange={(value) => handleRadioChange('authorize_marketing', value)}
                  className="flex flex-row space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="marketing-yes" />
                    <Label htmlFor="marketing-yes">Si</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="marketing-no" />
                    <Label htmlFor="marketing-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="pt-4 text-center">
              <p className="font-semibold text-lg">BIENVENIDOS Y GRACIAS POR SUS RESPUESTAS</p>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/dashboard/client/plans' })}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center"
            >
              {isSubmitting ? (
                <>Procesando...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Registrar Ingreso
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ParkEntryForm; 