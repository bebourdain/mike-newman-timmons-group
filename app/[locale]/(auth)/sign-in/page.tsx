import { LoginComponent } from "./components/LoginComponent";
import { Box, Typography } from "@mui/material";
import { demoConfiguration } from "@/lib/demo-access";

const SignInPage = async () => {
  return <Box sx={{ width: "100%", maxWidth: 600, py: 5 }}>
    <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mb: 3, overflowWrap: "break-word" }}>{process.env.NEXT_PUBLIC_APP_NAME || "NextCRM"}</Typography>
    <LoginComponent demoEnabled={!!demoConfiguration()} googleEnabled={!!(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET)} />
  </Box>;
};

export default SignInPage;
