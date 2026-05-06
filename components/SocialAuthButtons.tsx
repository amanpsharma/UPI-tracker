import { useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import type { OAuthStrategy } from "@clerk/types";
import { useAuth } from "@clerk/clerk-expo";

WebBrowser.maybeCompleteAuthSession();

const PROVIDERS: {
  strategy: OAuthStrategy;
  label: string;
  icon: string;
  color: string;
  bg: string;
}[] = [
  {
    strategy: "oauth_google",
    label: "Google",
    icon: "google",
    color: "#fff",
    bg: "#4285F4",
  },
  {
    strategy: "oauth_facebook",
    label: "Facebook",
    icon: "facebook",
    color: "#fff",
    bg: "#1877F2",
  },
  {
    strategy: "oauth_x",
    label: "X",
    icon: "twitter",
    color: "#fff",
    bg: "#000000",
  },
];

interface Props {
  mode?: "sign-in" | "sign-up";
}

export default function SocialAuthButtons({ mode = "sign-in" }: Props) {
  const { startSSOFlow } = useSSO();
  const { isSignedIn, isLoaded } = useAuth();
  const [busy, setBusy] = useState<OAuthStrategy | null>(null);

  useEffect(() => {
    console.log("[social] auth change", { isLoaded, isSignedIn });
    if (isLoaded && isSignedIn) {
      console.log("[social] navigating to tabs because isSignedIn is true");
      router.replace("/(tabs)/");
    }
  }, [isLoaded, isSignedIn]);

  const handleSSO = async (strategy: OAuthStrategy) => {
    if (busy) return;
    setBusy(strategy);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ path: "sso-callback" });
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl,
      });
      if (createdSessionId && setActive) {
        console.log(
          "[social] calling setActive with session",
          createdSessionId,
        );
        const res = await setActive({ session: createdSessionId });
        console.log("[social] setActive result", res);
      }
      // If createdSessionId is null the user closed the browser — do nothing
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Social login failed. Try again.";
      Alert.alert("Login failed", msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.row}>
        {PROVIDERS.map(({ strategy, label, icon, color, bg }) => {
          const isLoading = busy === strategy;
          return (
            <TouchableOpacity
              key={strategy}
              style={[
                styles.btn,
                { backgroundColor: bg },
                isLoading && styles.btnDisabled,
              ]}
              onPress={() => handleSSO(strategy)}
              disabled={busy !== null}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size={18} color={color} />
              ) : (
                <MaterialCommunityIcons
                  name={icon as any}
                  size={18}
                  color={color}
                />
              )}
              <Text style={[styles.btnLabel, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  dividerText: { color: "#aaa", fontSize: 12 },

  row: { flexDirection: "row", gap: 8 },

  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnLabel: { fontSize: 13, fontWeight: "600" },
});
