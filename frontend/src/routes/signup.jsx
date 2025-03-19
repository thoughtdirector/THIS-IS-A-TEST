import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import useAuth from "../hooks/useAuth";
import { confirmPasswordRules, emailPattern, passwordRules } from "../utils";
import Logo from "/assets/images/logo.png";

// Terms and conditions text stored in a variable
const TERMS_AND_CONDITIONS_TEXT = `Declara que conoce entiende y acepta los términos, requisitos y condiciones del reglamento establecido para la prestación del servicio de recreación y esparcimiento en la casa en el árbol, como también asume toda y cualquier clase de responsabilidad que se derive por los actos y conductas que realice el menor, en desarrollo y ejecución de nuestro propósito de recreación.
Declara que conoce y asume todos los riesgos que implican cuando el ( la ) menor se involucra con otros niños y en las actividades propias de recreación. En consecuencia exime de toda responsabilidad a la casa en el árbol de cualquier evento ,accidente o inconveniente ocurrido en el que se pueda ver implicado el ( la ) menor.
Autoriza que en caso de materializarse cualquier tipo de riesgo, los gastos o expensas que se requieran para la atención o 'tratamiento del ( la ) menor serán asumidos por usted en calidad de responsable del mismo.`;

const SignUp = () => {
  const { signUpMutation } = useAuth();
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      // User information
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",

      // Client information
      identification: "",
      phone: "",

      // Terms acceptance
      acceptTerms: false,
    },
  });

  const acceptTerms = watch("acceptTerms");

  const onSubmit = (data) => {
    // Prepare the data for the API by separating user and client information
    const { confirm_password, acceptTerms, ...formData } = data;

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
      },
    };

    signUpMutation.mutate(signupData);
  };

  const openTermsModal = (e) => {
    e.preventDefault();
    setTermsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-400 to-accent-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create an Account
          </CardTitle>
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
                {...register("full_name", {
                  required: "Full Name is required",
                  minLength: 3,
                })}
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="identification">Identification</Label>
              <Input
                id="identification"
                {...register("identification", {
                  required: "Identification is required",
                })}
                placeholder="National ID or Passport"
              />
              {errors.identification && (
                <p className="text-sm text-red-500">
                  {errors.identification.message}
                </p>
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
                    value:
                      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                    message: "Please enter a valid phone number",
                  },
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
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                type="password"
                {...register(
                  "confirm_password",
                  confirmPasswordRules(getValues)
                )}
                placeholder="Repeat your password"
              />
              {errors.confirm_password && (
                <p className="text-sm text-red-500">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2 mt-6">
              <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                {/* Make the entire terms text area clickable */}
                <div
                  className="text-sm text-gray-700 mb-4 line-clamp-4 overflow-hidden cursor-pointer"
                  onClick={openTermsModal}
                >
                  {TERMS_AND_CONDITIONS_TEXT}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="acceptTerms"
                      {...register("acceptTerms", {
                        required: "You must accept the terms and conditions",
                      })}
                      onCheckedChange={(checked) =>
                        setValue("acceptTerms", checked === true, {
                          shouldValidate: true,
                        })
                      }
                    />
                    <label
                      htmlFor="acceptTerms"
                      className="text-sm font-medium cursor-pointer"
                    >
                      I accept the Terms and Conditions
                    </label>
                  </div>
                  <button
                    className="text-accent-500 hover:underline font-bold text-sm"
                    onClick={openTermsModal}
                  >
                    Read More
                  </button>
                </div>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-red-500">
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              type="submit"
              disabled={isSubmitting || !acceptTerms}
            >
              Sign Up
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-accent-500 hover:underline">
              Log In
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* Terms and Conditions Modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
            <DialogDescription>
              Please read our terms and conditions carefully
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Display the full terms and conditions text */}
            <div className="text-sm whitespace-pre-line">
              {TERMS_AND_CONDITIONS_TEXT}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setTermsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignUp;
