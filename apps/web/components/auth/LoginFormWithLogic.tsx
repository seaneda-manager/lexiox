"use client";

import React, { useEffect, useState } from "react";
import PlasmicLoginForm from "@/components/plasmic/PlasmicLoginForm";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginFormWithLogic() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // rememberId ?꾨━??
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("rememberId") : null;
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email, // ?꾩씠?붾? ?대찓?쇰줈 ?곕뒗 寃쎌슦
        password,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      if (remember) localStorage.setItem("rememberId", email);
      else localStorage.removeItem("rememberId");

      // ?깃났 ???대룞 寃쎈줈 ?먯쑀 蹂寃?
      router.push("/student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlasmicLoginForm
      email={email}
      password={password}
      remember={remember}
      loading={loading}
      error={err}
      onChangeEmail={setEmail}
      onChangePassword={setPassword}
      onToggleRemember={setRemember}
      onSubmit={handleSubmit}
      onFindId={() => router.push("/auth/find-id")}
      onForgotPw={() => router.push("/auth/forgot-password")}
    />
  );
}




