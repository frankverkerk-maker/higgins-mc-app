import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Ensure enough room: icon (28) + label (12) + padding top (10) + safe area bottom
  const bottomPadding = Platform.OS === "web" ? 14 : Math.max(insets.bottom, 16);
  const tabBarHeight = 64 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00D4D4",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 10,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "#0D1014",
          borderTopColor: "#1E2530",
          borderTopWidth: 0.5,
          // Subtle cyaan top glow line when active
          shadowColor: "#00D4D4",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 12,
        },
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
          title: "Command",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="bubble.left.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: "Team Pulse",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Instellingen",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
