import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, useWindowDimensions } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SidebarNav, SIDEBAR_WIDTH } from "@/components/sidebar-nav";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";

/** True when the device is wide enough for a sidebar (iPad ≥ 768pt) */
function useIsPad(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS !== "web" && width >= 768;
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isPad = useIsPad();
  const { t } = useLanguage();

  // Ensure enough room: icon (26) + label (10) + padding top (10) + safe area bottom
  const bottomPadding = Platform.OS === "web" ? 14 : Math.max(insets.bottom, 16);
  const tabBarHeight = 64 + bottomPadding;

  // On iPad: hide the bottom tab bar completely (sidebar handles navigation)
  const tabBarStyle = isPad
    ? { display: "none" as const }
    : {
        paddingTop: 10,
        paddingBottom: bottomPadding,
        height: tabBarHeight,
        backgroundColor: "#0D1014",
        borderTopColor: "#1E2530",
        borderTopWidth: 0.5,
        shadowColor: "#00D4D4",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 12,
      };

  const tabs = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00D4D4",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle,
        tabBarInactiveTintColor: "#5A6472",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 3,
          fontFamily: Platform.OS === "ios" ? "Avenir" : undefined,
          letterSpacing: 0.3,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.command,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t.tabs.chat,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="bubble.left.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: t.tabs.teamPulse,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );

  // iPad: render sidebar + content side by side
  if (isPad) {
    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#0A0C0E" }}>
        <SidebarNav />
        <View style={{ flex: 1 }}>
          {tabs}
        </View>
      </View>
    );
  }

  // iPhone: standard tab bar
  return tabs;
}
