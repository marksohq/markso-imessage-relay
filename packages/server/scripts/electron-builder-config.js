// NOTE: All paths are relative to the package.json that will be loading this configuration file.
// Making them relative to the scripts folder will break the commands
module.exports = {
    "productName": "Markso Nurture",
    "appId": "com.markso.nurture",
    "npmRebuild": true,
    "directories": {
        "output": "releases",
        "buildResources": "appResources"
    },
    "asar": true,
    "extraResources": [
        "appResources"
    ],
    "afterPack": "./scripts/adhoc-sign.js",
    "mac": {
        "category": "public.app-category.social-networking",
        "publish": [
            {
                "provider": "github",
                "repo": "markso-imessage-relay",
                "owner": "marksohq",
                "private": false,
                "channel": "latest",
                "releaseType": "release",
                "vPrefixedTagName": true
            }
        ],
        "target": [
            {
                "target": "dmg",
                "arch": [
                    "x64",
                    "arm64"
                ],
            }
        ],
        "type": "development",
        "icon": "../../icons/macos/dock-icon.png",
        "darkModeSupport": true,
        "hardenedRuntime": false,
        "notarize": false,
        "sign": false,
        "identity": null,
        "entitlements": null,
        "entitlementsInherit": null,
        "extendInfo": {
            "NSContactsUsageDescription": "Markso Nurture needs access to your Contacts",
            "NSAppleEventsUsageDescription": "Markso Nurture needs access to run AppleScripts",
            "NSSystemAdministrationUsageDescription": "Markso Nurture needs access to manage your system",
        },
        "gatekeeperAssess": false,
        "minimumSystemVersion": "10.11.0",
        "signIgnore": [
            "ngrok$",
            "zrok$",
            "cloudflared$"
        ],
    },
    "dmg": {
        "sign": false,
        "writeUpdateInfo": false
    },
    // "afterSign": "./scripts/notarize.js"
};
