const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let appWindow;

function loadWindow() {
    appWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, `/dist/client/index.html`),
            protocol: 'file:',
            slashes: true,
        }),
    );
}

function initWindow() {
    appWindow = new BrowserWindow({
        // fullscreen: true,
        height: 800,
        width: 1000,
        webPreferences: {
            nodeIntegration: true,
        },
    });

    // Electron Build Path
    loadWindow();

    appWindow.setMenuBarVisibility(false);

    // Initialize the DevTools.
    // appWindow.webContents.openDevTools();

    appWindow.on('closed', function () {
        appWindow = null;
    });

    appWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        if (errorCode === -6) {
            loadWindow();
        }
    });
}

app.on('ready', initWindow);

// Close when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS specific close process
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (appWindow === null) {
        initWindow();
    }
});
