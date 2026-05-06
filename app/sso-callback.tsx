import { useAuth } from "@clerk/clerk-expo";
import { Redirect, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { View, ActivityIndicator } from "react-native";
import { useEffect } from "react";

// Signals expo-web-browser to close the in-app browser and resolve
// the openAuthSessionAsync promise back in useSSO.
WebBrowser.maybeCompleteAuthSession();

export default function SSOCallback() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/(tabs)/");
      return;
    }

    if (!isLoaded) {
      return;
    }

    const timeout = setTimeout(() => {
      router.replace("/(tabs)/");
    }, 700);

    return () => clearTimeout(timeout);
  }, [isLoaded, isSignedIn]);

  // Clerk hasn't finished loading yet — keep showing spinner.
  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <ActivityIndicator size="large" color="#6200ee" />
    </View>
  );
}
