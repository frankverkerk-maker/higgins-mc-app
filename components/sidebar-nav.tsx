/**
 * SidebarNav — iPad sidebar navigatie
 *
 * Op iPad (breedte ≥ 768) wordt een verticale sidebar getoond links van de content.
 * Op iPhone blijft de standaard tab bar zichtbaar (dit component rendert niets).
 *
 * Gebruik: wrap de tab layout content met <SidebarLayout> op iPad.
 */
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { usePathname, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { HigginsAvatar } from "@/components/higgins-avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/language-provider";

const C = {
  bg:         "#0D1014",
  surface:    "#111418",
  border:     "#1E2530",
  cyan:       "#00D4D4",
  cyanDim:    "rgba(0,212,212,0.12)",
  cyanBorder: "rgba(0,212,212,0.25)",
  text:       "#E8EDF2",
  muted:      "#5A6472",
};

const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

const NAV_ITEM_DEFS = [
  { href: "/(tabs)/",        key: "command",    icon: "house.fill"      as const },
  { href: "/(tabs)/chat",    key: "chat",       icon: "bubble.left.fill" as const },
  { href: "/(tabs)/agents",  key: "teamPulse",  icon: "person.2.fill"   as const },
  { href: "/(tabs)/settings",key: "settings",   icon: "gearshape.fill"  as const },
];

export const SIDEBAR_WIDTH = 220;

/** Returns true when the screen is wide enough for a sidebar (iPad landscape/portrait) */
export function useIsPad(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS !== "web" && width >= 768;
}

export function SidebarNav() {
  const isPad = useIsPad();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  if (!isPad) return null;

  const handleNav = (href: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    router.push(href as any);
  };

  return (
    <View style={s.sidebar}>
      {/* Logo / branding */}
      <View style={s.brand}>
        <HigginsAvatar size={36} />
        <View style={{ marginLeft: 10 }}>
          <Text style={s.brandTitle}>Higgins</Text>
          <Text style={s.brandSub}>Mission Control</Text>
        </View>
      </View>

      {/* Nav items */}
      <View style={s.navList}>
        {NAV_ITEM_DEFS.map((item) => {
          const label = (t.tabs as Record<string, string>)[item.key] ?? item.key;
          const isActive =
            item.href === "/(tabs)/"
              ? pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/"
              : pathname.startsWith(item.href.replace("/(tabs)", ""));
          return (
            <Pressable
              key={item.href}
              style={({ pressed }) => [
                s.navItem,
                isActive && s.navItemActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => handleNav(item.href)}
            >
              <IconSymbol
                name={item.icon}
                size={20}
                color={isActive ? C.cyan : C.muted}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>
                {label}
              </Text>
              {isActive && <View style={s.activeIndicator} />}
            </Pressable>
          );
        })}
      </View>

      {/* Taalwisselaar */}
      <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, marginTop: 8 }}>
        <LanguageSwitcher />
      </View>

      {/* Status footer */}
      <View style={s.footer}>
        <View style={s.footerDot} />
        <Text style={s.footerText}>Higgins Online</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: C.bg,
    borderRightWidth: 1,
    borderRightColor: C.border,
    paddingTop: 52,
    paddingBottom: 32,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
    paddingHorizontal: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    fontFamily: FONT_BOLD,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 10,
    color: C.muted,
    fontFamily: FONT,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  navList: { flex: 1, gap: 4 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
  },
  navLabel: {
    fontSize: 14,
    color: C.muted,
    fontFamily: FONT,
    fontWeight: "500",
  },
  navLabelActive: {
    color: C.cyan,
    fontFamily: FONT_BOLD,
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: "25%",
    bottom: "25%",
    width: 3,
    borderRadius: 2,
    backgroundColor: C.cyan,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#00D4A0",
  },
  footerText: {
    fontSize: 11,
    color: C.muted,
    fontFamily: FONT,
  },
});
