import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushSubscription } from "../api/marketsApi";
import { MarketType } from "../types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

let permissionReady = false;
let registrationDone = false;

const getProjectId = (): string | undefined => {
  const fromEasConfig =
    "easConfig" in Constants && Constants.easConfig ? Constants.easConfig.projectId : undefined;

  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;

  return fromEasConfig ?? fromExpoConfig;
};

export const setupNotifications = async (): Promise<boolean> => {
  if (permissionReady) {
    return true;
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("market-alerts", {
      name: "Market Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default"
    });
  }

  permissionReady = true;
  return true;
};

export const registerRemotePush = async (markets: MarketType[]): Promise<boolean> => {
  if (registrationDone) {
    return true;
  }

  const enabled = await setupNotifications();

  if (!enabled) {
    return false;
  }

  const projectId = getProjectId();

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId
      ? {
          projectId
        }
      : undefined
  );

  await registerPushSubscription(tokenResponse.data, markets);
  registrationDone = true;

  return true;
};
