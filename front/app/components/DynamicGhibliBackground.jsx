"use client";

import dynamic from "next/dynamic";

const GhibliBackground = dynamic(
  () => import("./GhibliBackground"),
  { ssr: false }
);

export default function DynamicGhibliBackground() {
  return <GhibliBackground />;
}
