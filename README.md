# Markso Nurture

A macOS application that relays iMessages to the Markso platform, enabling seamless SMS/iMessage communication for your business.

## Overview

Markso Nurture runs on a Mac and connects your iMessage account to Markso, allowing you to send and receive iMessages through the Markso platform.

## Requirements

- **macOS** 10.11 or later (Big Sur+ recommended)
- **Node.js** 20.11.x
- **npm** 10.x or later
- **Full Disk Access** permission for the app
- **Contacts** permission (optional, for contact sync)

## Installation

### From GitHub Releases

1. Download the latest `.dmg` file from the [Releases](https://github.com/marksohq/markso-imessage-relay/releases) page
2. Open the DMG and drag the app to your Applications folder
3. Open the app and grant the required permissions
4. Follow the setup wizard to connect to your Markso account

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/marksohq/markso-imessage-relay.git
   cd markso-imessage-relay
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run start
   ```

4. Build for distribution:
   ```bash
   npm run build
   ```

## Project Structure

```
markso-imessage-relay/
├── packages/
│   ├── server/          # Electron backend + iMessage integration
│   │   ├── src/
│   │   │   ├── server/  # Core server logic
│   │   │   ├── trays/   # System tray management
│   │   │   └── windows/ # Electron windows
│   │   └── appResources/
│   └── ui/              # React frontend
│       ├── src/
│       │   └── app/     # React components and layouts
│       └── public/      # Static assets
└── package.json         # Root workspace config
```

## Features

- **iMessage Relay**: Send and receive iMessages through Markso
- **Contact Sync**: Sync your Mac contacts with Markso
- **Auto-Start**: Optionally start on login
- **Secure Connection**: Encrypted communication with Markso servers
- **Real-time Updates**: Instant message delivery and status updates

## Permissions Required

The app requires the following macOS permissions:

1. **Full Disk Access**: Required to read the iMessage database
2. **Contacts** (optional): Required for contact synchronization
3. **Automation**: Required for sending messages via AppleScript

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | Markso API endpoint | `https://api.nurture.markso.io` |

## Development

### Scripts

- `npm run start` - Start development server (UI + backend)
- `npm run build` - Build for production
- `npm run build-ui` - Build UI only
- `npm run build-server` - Build server only

### Tech Stack

- **Frontend**: React 18, Chakra UI, Redux Toolkit
- **Backend**: Electron, TypeORM, Socket.IO, Koa
- **Database**: SQLite (via better-sqlite3)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For issues and feature requests, please open an issue on [GitHub](https://github.com/marksohq/markso-imessage-relay/issues).
