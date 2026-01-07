// Chrome message passing utilities

/**
 * Send a message to the background service worker and wait for response
 */
export async function sendMessage<T = unknown>(
  type: string,
  payload: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

/**
 * Send message to a specific tab's content script
 */
export async function sendMessageToTab<T = unknown>(
  tabId: number,
  type: string,
  payload: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}
