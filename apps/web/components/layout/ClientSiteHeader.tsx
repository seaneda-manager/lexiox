"use client";

import dynamic from "next/dynamic";
import React from "react";

// ✅ Client Component 안에서는 ssr:false 사용 가능
const SiteHeader = dynamic(() => import("@/components/SiteHeader"), {
  ssr: false,
  loading: () => null,
});

export default function ClientSiteHeader() {
  return <SiteHeader />;
}
