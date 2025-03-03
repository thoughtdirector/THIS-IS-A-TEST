import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from '@tanstack/react-router';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import useAuth from '../hooks/useAuth';
import { confirmPasswordRules, emailPattern, passwordRules } from '../utils';
import Logo from "/assets/images/logo.png";

const SignUp = () => {
  const { signUpMutation } = useAuth();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    criteriaMode: 'all',
    defaultValues: {
      // User information
      email: '',
      full_name: '',
      password: '',
      confirm_password: '',
      
      // Client information
      identification: '',
      phone: '',
    },
  });

  const onSubmit = (data) => {
    // Prepare the data for the API by separating user and client information
    const { confirm_password, ...formData } = data;
    
    const signupData = {
      user_in: {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      },
      client_in: {
        identification: formData.identification,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        is_active: true,
        is_child: false,
      }
    };
    
    signUpMutation.mutate(signupData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-400 to-accent-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Sign up for CasaEnElArbol to protect your identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                {...register("full_name", { required: "Full Name is required", minLength: 3 })}
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="identification">Identification</Label>
              <Input
                id="identification"
                {...register("identification", { required: "Identification is required" })}
                placeholder="National ID or Passport"
              />
              {errors.identification && (
                <p className="text-sm text-red-500">{errors.identification.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: emailPattern,
                })}
                placeholder="name@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...register("phone", { 
                  required: "Phone number is required",
                  pattern: {
                    value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                    message: "Please enter a valid phone number"
                  }
                })}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password", passwordRules())}
                placeholder="Create a strong password"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                type="password"
                {...register("confirm_password", confirmPasswordRules(getValues))}
                placeholder="Repeat your password"
              />
              {errors.confirm_password && (
                <p className="text-sm text-red-500">{errors.confirm_password.message}</p>
              )}
            </div>
            
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-500 hover:underline">
              Log In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;