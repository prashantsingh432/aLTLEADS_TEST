
// The extension now connects directly to the Firestore database defined in lib/firebase.ts.
// Background scripts are kept minimal for this architecture.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
     console.log('Amplior Extension Installed');
  }
});
