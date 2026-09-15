// Background notification task MUST load before expo-router (Expo docs requirement).
import "./lib/notifications/leadOfferBackgroundTask";
import "./lib/textScaleGuard";
import "expo-router/entry";
