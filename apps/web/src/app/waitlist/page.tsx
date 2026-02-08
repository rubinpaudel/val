"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function WaitlistPage() {
  const router = useRouter();

  return (
    <section className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6 p-6 text-center max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          You're on the waitlist
        </h1>
        <p className="text-muted-foreground">
          Thanks for signing up! We're currently in a closed alpha and letting
          people in gradually. We'll send you a message when your account is
          ready.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/auth/signin");
                },
              },
            });
          }}
        >
          Sign out
        </Button>
      </div>
    </section>
  );
}
