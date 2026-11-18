import { Box, Typography } from "@mui/material";
import { LoginComponent } from "../sign-in/components/LoginComponent";
import { demoConfiguration } from "@/lib/demo-access";

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ email?: string | string[]; code?: string | string[] }> }) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.trim().slice(0, 254) : "";
  const code = typeof params.code === "string" && /^\d{6}$/.test(params.code) ? params.code : "";
  return <Box sx={{ width: "100%", maxWidth: 600, py: 5 }}>
    <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mb: 3, overflowWrap: "break-word" }}>{process.env.NEXT_PUBLIC_APP_NAME || "NextCRM"}</Typography>
    <LoginComponent initialDemo initialEmail={email} initialDemoCode={code} demoEnabled={!!demoConfiguration()} googleEnabled={!!(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET)} />
  </Box>;
}
