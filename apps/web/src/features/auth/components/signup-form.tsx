"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSignupForm } from "../hooks/use-signup-form";

export function SignupForm() {
  const form = useSignupForm();

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="mt-8 space-y-4"
      >
        <form.Field name="name">
          {(field) => (
            <div className="grid gap-3">
              <Label htmlFor={field.name}>Name</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-sm text-red-500">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <div className="grid gap-3">
              <Label htmlFor={field.name}>Email</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-sm text-red-500">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <div className="grid gap-3">
              <Label htmlFor={field.name}>Password</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-sm text-red-500">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>
        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? "Creating account..." : "Sign up"}
            </Button>
          )}
        </form.Subscribe>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/auth/signin"
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
