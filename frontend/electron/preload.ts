import { ipcRenderer, contextBridge, desktopCapturer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// Expose Electron APIs for screen sharing
console.log('=== PRELOAD SCRIPT STARTED ===');
console.log('preload: Starting to expose electronAPI...');
console.log('preload: Process platform:', process.platform);
console.log('preload: Process versions:', process.versions);
console.log('preload: contextBridge available:', !!contextBridge);
console.log('preload: desktopCapturer available:', !!desktopCapturer);

// CRITICAL: Create robust electronAPI
const electronAPI = {
  // Desktop Capturer API - CRITICAL FOR SCREEN SHARING
  desktopCapturer: {
    getSources: async (options: any) => {
      try {
        console.log('preload: getSources called with options:', options);
        const sources = await desktopCapturer.getSources(options);
        console.log('preload: getSources returned:', sources.length, 'sources');
        return sources;
      } catch (error) {
        console.error('preload: getSources error:', error);
        throw error;
      }
    }
  },
  
  // Platform info
  platform: process.platform,
  
  // Check if we're in Electron
  isElectron: true,
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  
  // Test function
  test: () => {
    console.log('preload: test function called successfully');
    return 'electronAPI is working!';
  },
  
  // Simple ping function
  ping: () => {
    console.log('preload: ping received');
    return 'pong from preload!';
  },
  
  // CRITICAL: Direct screen sharing fallback
  getDisplayMedia: async (constraints: any) => {
    try {
      console.log('preload: getDisplayMedia called with constraints:', constraints);
      // Try to use navigator.mediaDevices.getDisplayMedia directly
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
        console.log('preload: getDisplayMedia successful');
        return stream;
      } else {
        throw new Error('getDisplayMedia not available');
      }
    } catch (error) {
      console.error('preload: getDisplayMedia error:', error);
      throw error;
    }
  }
};

console.log('preload: electronAPI object created:', electronAPI);
console.log('preload: About to expose via contextBridge...');

// CRITICAL: Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('preload: electronAPI exposed successfully to window.electronAPI');
console.log('preload: window.electronAPI should now be available in renderer');

// CRITICAL: Test API exposure
setTimeout(() => {
  console.log('preload: Checking if API is exposed...');
  console.log('preload: contextBridge appears to be working');
  console.log('preload: API exposure test completed');
}, 1000);

console.log('preload: Immediate test - API object created successfully');
console.log('=== PRELOAD SCRIPT COMPLETED ===');
