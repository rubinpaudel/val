"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

import { SignupForm } from "@/features/auth";

export default function SignupPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const t = useTranslations("auth");

  if (isPending) {
    return <Loader />;
  }

  if (session) {
    router.replace("/");
    return <Loader />;
  }

  return (
    <section className="flex min-h-screen items-center justify-center">
      <div className="flex items-center justify-center p-6 w-full max-w-md">
        <div className="w-full">
          <div className="text-center lg:text-left">
            <h2 className="text-xl/snug tracking-tight">
              {t("create-account")}
            </h2>
            <p className="mt-2 text-sm/6 text-muted-foreground">
              {t("sign-up-subtitle")}
            </p>
          </div>
          <SignupForm />
        </div>
      </div>
    </section>
  );
}
