import { getNotificationSettings, updateNotificationSettings } from "../../utils/endpoints/notifications";
import { loginMember } from "../../utils/auth";

describe("Notification Settings Endpoint Tests", () => {
  it("getSettings", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone] = params;
    
    if (!phone) {
      throw new Error("Usage: npm test getsettings <phone>");
    }

    // Login to get JWT
    const auth = await loginMember(phone);
    
    // Get notification settings
    await getNotificationSettings(auth.memberID, auth.jwt);
  });

  it("updateSettings", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, ...settingsParams] = params;
    
    if (!phone || settingsParams.length === 0) {
      throw new Error("Usage: npm test updatesettings <phone> <key1=value1> <key2=value2> ...");
    }

    // Parse settings from params (format: key1=value1 key2=value2)
    const settings: Record<string, string | boolean> = {};
    for (const param of settingsParams) {
      const [key, value] = param.split('=');
      if (!key || !value) {
        throw new Error("Settings must be in format: key1=value1 key2=value2");
      }
      settings[key] = value === 'true' ? true : value === 'false' ? false : value;
    }

    // Login to get JWT
    const auth = await loginMember(phone);
    
    // Update notification settings
    await updateNotificationSettings(auth.memberID, settings, auth.jwt);
  });
});
