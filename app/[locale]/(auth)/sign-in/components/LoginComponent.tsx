"use client";

import React, { useState } from "react";
import { useLocale } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Icons } from "@/components/ui/icons";
import { Alert, Box, Button, Card, CardContent, CardHeader, CircularProgress, Divider, Stack, TextField, Typography } from "@mui/material";
import { toast } from "sonner";
import { MailIcon } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Step = "email" | "otp";

export function LoginComponent({ demoEnabled = false, googleEnabled = false, initialDemo = false, initialEmail = "", initialDemoCode = "" }: { demoEnabled?: boolean; googleEnabled?: boolean; initialDemo?: boolean; initialEmail?: string; initialDemoCode?: string }) {
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState(initialDemoCode);
  const [showDemo, setShowDemo] = useState(initialDemo && demoEnabled);
  const [demoError, setDemoError] = useState<string | null>(null);

  const signInDemo = async () => {
    if (isLoading) return;
    if (!email.trim()) {
      setDemoError("Enter the email address associated with your demo access.");
      return;
    }
    if (!/^\d{6}$/.test(demoCode)) {
      setDemoError("Enter the six-digit demo code shared with you.");
      return;
    }
    setDemoError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/sign-in/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: demoCode }),
      });
      if (!response.ok) {
        setDemoError(response.status >= 500
          ? "The demo service couldn't connect. Please try again in a moment."
          : response.status === 429
          ? "Too many attempts. Please wait before trying again."
          : "We couldn't open the demo. Check your email and code, or ask the person who shared them for help.");
        return;
      }
      window.location.href = `/${locale}/projects/scanners`;
    } catch {
      setDemoError("We couldn't connect. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (error) {
      toast.error("Something went wrong with Google sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        toast.error(error.message || "Failed to send verification code.");
        return;
      }
      setStep("otp");
      toast.success("Verification code sent to your email.");
    } catch (error) {
      toast.error("Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp,
      });
      if (error) {
        toast.error(error.message || "Invalid or expired code.");
        return;
      }
      toast.success("Login successful.");
      window.location.href = "/";
    } catch (error) {
      toast.error("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ my: 2, width: "100%", maxWidth: 560 }}>
      <CardHeader sx={{ pb: 1 }} title={<Typography component="h2" variant="h5" sx={{ fontWeight: 700 }}>{showDemo ? "Demo access" : step === "otp" ? "Check your email" : "Sign in"}</Typography>}
        subheader={showDemo ? "Enter your email and the demo code shared with you." : step === "otp" ? "Use the verification code we sent you." : "We'll send a verification code to your email."} />
      <CardContent>
        <Stack spacing={2.5}>
          {showDemo ? <Box component="form" aria-busy={isLoading} onSubmit={(event) => { event.preventDefault(); void signInDemo(); }}>
            <Stack spacing={2}>
              {demoError && <Alert severity="error" role="alert">{demoError}</Alert>}
              <TextField fullWidth autoFocus id="demo-email" type="email" label="Email" placeholder="name@company.com" value={email}
                onChange={event => { setEmail(event.target.value); setDemoError(null); }} disabled={isLoading} autoComplete="email" required />
              <Box>
                <Typography component="label" htmlFor="demo-code" variant="body2" sx={{ display: "block", mb: 1 }}>6-digit demo code *</Typography>
                <InputOTP id="demo-code" aria-label="6-digit demo code" aria-describedby="demo-code-help" aria-invalid={!!demoError}
                  maxLength={6} inputMode="numeric" pattern="^[0-9]*$" autoComplete="one-time-code" required disabled={isLoading}
                  value={demoCode} onChange={value => { setDemoCode(value); setDemoError(null); }}
                  pasteTransformer={value => value.replace(/\D/g, "").slice(0, 6)}>
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} className="h-12 w-10 rounded-md border text-2xl first:rounded-md last:rounded-md" />)}
                  </InputOTPGroup>
                </InputOTP>
                <Typography id="demo-code-help" variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Type or paste your six-digit demo code.</Typography>
              </Box>
              <Button fullWidth size="large" type="submit" variant="contained" disabled={isLoading || !email.trim() || demoCode.length !== 6}
                startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : undefined}>
                {isLoading ? "Opening demo…" : "Open demo"}
              </Button>
              <Button fullWidth type="button" size="small" onClick={() => { setShowDemo(false); setDemoError(null); setDemoCode(""); }} disabled={isLoading}>Back to sign in</Button>
            </Stack>
          </Box> : <>
          {googleEnabled && <>
            <Button fullWidth variant="outlined" onClick={loginWithGoogle} disabled={isLoading} startIcon={<Icons.google style={{ width: 16, height: 16 }} />}>Continue with Google</Button>
            <Divider><Typography variant="caption" color="text.secondary">or use email</Typography></Divider>
          </>}
          {step === "email" && <Box component="form" onSubmit={(event) => { event.preventDefault(); void sendOtp(); }}>
            <Stack spacing={1.5}>
              <TextField fullWidth id="email" type="email" label="Email" placeholder="name@domain.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} autoComplete="email" required />
              <Button fullWidth type="submit" variant="contained" disabled={isLoading || !email} startIcon={<MailIcon size={16} />}>Send verification code</Button>
            </Stack>
          </Box>}
          {step === "otp" && <Box component="form" onSubmit={(event) => { event.preventDefault(); void verifyOtp(); }}>
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">Enter the 6-digit code sent to <Box component="strong" sx={{ color: "text.primary" }}>{email}</Box></Typography>
              <TextField fullWidth label="6-digit verification code" type="text" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={isLoading} autoComplete="one-time-code" slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*", maxLength: 6, "aria-label": "6-digit verification code" } }} sx={{ "& input": { textAlign: "center", letterSpacing: "0.5em", fontSize: 20 } }} />
              <Button fullWidth type="submit" variant="contained" disabled={isLoading || otp.length !== 6}>Verify and sign in</Button>
              <Button fullWidth size="small" onClick={() => { setStep("email"); setOtp(""); }} disabled={isLoading}>Use a different email</Button>
            </Stack>
          </Box>}
          {demoEnabled && <Button fullWidth variant="outlined" onClick={() => { setShowDemo(true); setDemoError(null); }} disabled={isLoading}>Use demo code</Button>}
          </>}
        </Stack>
      </CardContent>
    </Card>
  );
}
