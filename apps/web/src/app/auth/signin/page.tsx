"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

import { SigninForm } from "@/features/auth";

export default function SigninPage() {
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
            <h2 className="text-xl/snug font-semibold tracking-tight">
              {t("welcome-back")}
            </h2>
            <p className="mt-2 text-sm/6 text-muted-foreground">
              {t("sign-in-subtitle")}
            </p>
          </div>
          <SigninForm />
        </div>
      </div>
    </section>
  );
}
