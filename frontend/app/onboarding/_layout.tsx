import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="choice" />
      <Stack.Screen name="register-profile" />
      <Stack.Screen name="step2" />
      <Stack.Screen name="step3" />
      <Stack.Screen name="step4" />
      <Stack.Screen name="passport" />
      <Stack.Screen name="kore-hub" />
      <Stack.Screen name="manual-onboarding" />
    </Stack>
  );
}
