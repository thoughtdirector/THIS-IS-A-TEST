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
      email: '',
      full_name: '',
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = (data) => {
    signUpMutation.mutate(data);
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