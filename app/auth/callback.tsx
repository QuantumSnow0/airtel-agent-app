import { Redirect } from "expo-router";

/** Legacy callback path delegates to the single Google OAuth owner. */
export default function AuthCallbackScreen() {
  return <Redirect href="/google-auth" />;
}
