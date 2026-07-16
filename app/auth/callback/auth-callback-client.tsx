"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND_ASSETS } from "@/lib/brand";
import { PRODUCT } from "@/lib/product";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function safeNext(value: string | null) {
  return value?.startsWith("/") ? value : "/";
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing secure sign-in.");

  useEffect(() => {
    let active = true;

    async function completeSignIn() {
      const next = safeNext(searchParams.get("next"));
      const code = searchParams.get("code");

      try {
        const supabase = createSupabaseBrowserClient();
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
        }

        if (active) router.replace(next);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Unable to complete sign-in.");
      }
    }

    void completeSignIn();
    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <main className="kb-auth-callback">
      <section className="kb-panel">
        <div className="kb-logo-heading">
          <Image src={BRAND_ASSETS.logo} alt="" width={58} height={58} />
          <div>
            <p className="kb-kicker">Google sign-in</p>
            <Image
              className="kb-wordmark-large"
              src={BRAND_ASSETS.wordmark}
              alt={PRODUCT.name}
              width={236}
              height={39}
              priority
            />
            <h1 className="sr-only">{PRODUCT.name}</h1>
          </div>
        </div>
        <p>{message}</p>
        <Link className="kb-primary-button" href="/">
          Return to workspace
        </Link>
      </section>
    </main>
  );
}
