# TrustLens Companion Extension

Local Chrome extension for the "critical seconds before clicking" demo.

## Load locally

1. Start TrustLens: `python backend/run.py`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Choose "Load unpacked"
5. Select this `extension/` folder

## Use

* Select suspicious text on any page.
* Right-click and choose "Analyze with TrustLens".
* Open the extension popup to view the latest risk result.

The extension stores only the selected text and the latest report in local browser storage. Provider keys remain on the TrustLens backend and are never stored in the extension.
