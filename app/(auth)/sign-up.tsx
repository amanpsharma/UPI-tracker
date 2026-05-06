import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Text, TextInput, Button, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SocialAuthButtons from "@/components/SocialAuthButtons";

function makeUsername(email: string) {
  const base = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, 15);
  const suffix = Math.random().toString(36).slice(2, 6);
  return base + suffix;
}

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("[signup] auth change", { authLoaded, isSignedIn });
    if (authLoaded && isSignedIn) {
      console.log("[signup] navigating to tabs because isSignedIn is true");
      router.replace("/(tabs)/");
    }
  }, [authLoaded, isSignedIn]);

  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        username: makeUsername(email.trim()),
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      // If username is not required by the instance, retry without it
      if (
        err?.errors?.[0]?.code === "form_identifier_exists" ||
        err?.errors?.[0]?.meta?.paramName === "username"
      ) {
        try {
          await signUp.create({ emailAddress: email.trim(), password });
          await signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          setPendingVerification(true);
          return;
        } catch (retryErr: any) {
          const msg =
            retryErr?.errors?.[0]?.longMessage ??
            retryErr?.errors?.[0]?.message ??
            retryErr?.message ??
            "Sign-up failed.";
          setError(msg);
          return;
        }
      }
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Sign-up failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const completeSignUp = async (
    resource: Awaited<
      ReturnType<typeof signUp.attemptEmailAddressVerification>
    >,
  ) => {
    if (resource.status === "complete") {
      console.log(
        "[signup] verification complete, createdSessionId=",
        resource.createdSessionId,
      );
      const res = await setActive({ session: resource.createdSessionId });
      console.log("[signup] setActive result=", res);
      return;
    }

    // Clerk signals missing_requirements when the instance needs extra fields
    // (e.g. username). Attempt to satisfy them automatically.
    if (resource.status === "missing_requirements") {
      const missing: string[] = (resource as any).missingFields ?? [];

      const patch: Record<string, string> = {};
      if (missing.includes("username")) patch.username = makeUsername(email);
      if (missing.includes("first_name")) patch.firstName = "User";
      if (missing.includes("last_name")) patch.lastName = "Account";

      if (Object.keys(patch).length > 0) {
        const updated = await signUp!.update(patch as any);
        return completeSignUp(updated);
      }

      Alert.alert(
        "Additional info required",
        `Missing: ${missing.join(", ")}. Please contact support.`,
      );
      return;
    }

    Alert.alert(
      "Unexpected status",
      `Status: ${resource.status}. Please try again.`,
    );
  };

  const handleVerify = async () => {
    if (!isLoaded) {
      Alert.alert("Not ready", "Please wait a moment and try again.");
      return;
    }
    if (!signUp) {
      Alert.alert("Session expired", "Please start sign-up again.");
      setPendingVerification(false);
      return;
    }

    const trimmed = code.replace(/\s/g, "");
    if (trimmed.length < 6) {
      setError("Enter the full 6-digit code from your email.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: trimmed,
      });
      await completeSignUp(result);
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Verification failed. Check the code and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.heroSection}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons
              name="bank-transfer"
              size={40}
              color="#fff"
            />
          </View>
          <Text variant="headlineMedium" style={styles.appName}>
            UPI Tracker
          </Text>
          <Text variant="bodyMedium" style={styles.tagline}>
            Your personal expense tracker
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.card}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!pendingVerification ? (
            <>
              <Text variant="titleLarge" style={styles.formTitle}>
                Create account
              </Text>
              <Text variant="bodySmall" style={styles.formSub}>
                Start tracking your UPI payments
              </Text>

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="email-outline" />}
              />
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                }
              />

              <Button
                mode="contained"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading}
                style={styles.btn}
                contentStyle={styles.btnContent}
                labelStyle={styles.btnLabel}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>

              <View style={styles.footer}>
                <Text variant="bodyMedium" style={styles.footerText}>
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.link}>Sign in</Text>
                </TouchableOpacity>
              </View>

              <SocialAuthButtons mode="sign-up" />
            </>
          ) : (
            <>
              <View style={styles.verifyIcon}>
                <MaterialCommunityIcons
                  name="email-check-outline"
                  size={36}
                  color="#6200ee"
                />
              </View>
              <Text variant="titleLarge" style={styles.formTitle}>
                Verify your email
              </Text>
              <Text variant="bodyMedium" style={styles.formSub}>
                We sent a 6-digit code to{"\n"}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              <TextInput
                label="Verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                mode="outlined"
                style={styles.input}
                maxLength={6}
                left={<TextInput.Icon icon="shield-check-outline" />}
                autoFocus
              />

              <Button
                mode="contained"
                onPress={handleVerify}
                loading={loading}
                disabled={loading}
                style={styles.btn}
                contentStyle={styles.btnContent}
                labelStyle={styles.btnLabel}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </Button>

              <TouchableOpacity style={styles.resend} onPress={handleSignUp}>
                <Text style={styles.link}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={8000}
        style={styles.errorSnack}
        action={{ label: "OK", onPress: () => setError("") }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#6200ee" },
  inner: { flex: 1, justifyContent: "flex-end" },

  heroSection: { alignItems: "center", paddingVertical: 32, gap: 8 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  appName: { color: "#fff", fontWeight: "bold" },
  tagline: { color: "rgba(255,255,255,0.75)" },

  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 24,
    gap: 12,
  },
  formTitle: { fontWeight: "bold", color: "#1a1a1a" },
  formSub: { color: "#888", marginTop: -6, lineHeight: 20 },
  emailHighlight: { color: "#6200ee", fontWeight: "600" },

  verifyIcon: { alignItems: "center", marginBottom: 4 },

  input: { backgroundColor: "#fff" },

  btn: { borderRadius: 10, marginTop: 4 },
  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 15, fontWeight: "600" },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 4,
  },
  footerText: { color: "#666" },
  link: { color: "#6200ee", fontWeight: "600", fontSize: 14 },
  resend: { alignItems: "center" },

  errorSnack: { backgroundColor: "#b00020" },
});
