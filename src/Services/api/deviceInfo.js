// The `Deviceinfo` header sent with every call: the device is recorded on
// every transaction. `device_id` is made once per browser and kept.
const KEY = "innoverse-merchant:device-id";

function deviceId() {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = window.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "web-unknown";
  }
}

export function deviceInfoHeader() {
  return JSON.stringify({
    device_id: deviceId(),
    device_type: "WEB",
    device_isp: "Unknown",
    network_type: navigator.connection?.effectiveType ?? "Unknown",
    user_agent: navigator.userAgent,
  });
}
