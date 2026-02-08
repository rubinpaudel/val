"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { signinSchema } from "../validation/signin-schema";

export function useSigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            const callbackUrl = searchParams.get("callbackUrl");
            const redirectTo = callbackUrl?.startsWith("/")
              ? callbackUrl
              : "/";
            toast.success("Sign in successful");
            // Full-page redirect so the browser commits the session cookie (set by the API domain) before loading the next page
            window.location.href = redirectTo;
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: signinSchema,
    },
  });

  return form;
}
