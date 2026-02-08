"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { signupSchema } from "../validation/signup-schema";

export function useSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          name: value.name,
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            const callbackUrl = searchParams.get("callbackUrl");
            const redirectTo = callbackUrl?.startsWith("/")
              ? callbackUrl
              : "/";
            router.push(redirectTo as any);
            toast.success("Account created successfully");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: signupSchema,
    },
  });

  return form;
}
