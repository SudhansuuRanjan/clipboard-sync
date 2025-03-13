# Clipboard Sync  

## Overview  
Clipboard Sync is a lightweight and efficient solution for synchronizing clipboard contents across multiple devices. It enables users to seamlessly copy text or other data on one device and paste it on another in real time.  

## Live URL : 

https://clipsync.pages.dev/

## Features  
- **Cross-Platform Support**: Installable as a Progressive Web App (PWA) directly from your browser.  
- **Real-Time Sync**: Instantly synchronize clipboard contents across connected devices.  
- **Secure**: Data is encrypted during transmission to ensure privacy and security.  
- **Easy Setup**: Simple and quick installation process.  

## Installation  

### Prerequisites  
Ensure [Bun](https://bun.sh/) is installed on your system. If not, install it using npm:  

```sh
npm i -g bun
```

### Setup Steps
Clone the repository:

```sh
git clone https://github.com/SudhansuuRanjan/clipsync.git
cd clipsync
```

### Configure environment variables:
Create a .env file inside the client directory and add your Supabase credentials:

```sh
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Install dependencies:

```sh
cd client
bun install
```

Start the application:

```sh
bun run dev
```

## Usage

- Start the application on all devices you want to sync.
- Copy text or data on one device.
- Paste the copied content on another device where the application is running.

