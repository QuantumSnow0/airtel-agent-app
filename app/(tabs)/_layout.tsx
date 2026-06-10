import { Tabs } from "expo-router";
import { WamTabBar } from "../../components/WamTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <WamTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="registrations" options={{ title: "Records" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
