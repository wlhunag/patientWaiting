import { notFound } from "next/navigation";
import { isValidStaffPath } from "@/lib/auth";
import StaffDashboard from "./StaffDashboard";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ secret: string }>;
}

export default async function StaffPage({ params }: Params) {
  const { secret } = await params;
  if (!isValidStaffPath(secret)) {
    notFound();
  }
  return <StaffDashboard secret={secret} />;
}
