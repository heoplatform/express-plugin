# Express Plugin

An Express.js plugin for the base plugin system that provides HTTP server functionality and allows other plugins to extend the Express application with routes, middleware, and server lifecycle hooks.

## Features

- **Express Integration**: Seamlessly integrates Express.js with the base plugin system
- **Two-phase Express Initialization**: Supports `initExpress` and `postInitExpress` hooks for Express-specific setup
- **Plugin Extensibility**: Other plugins can easily add routes, middleware, and Express functionality
- **Environment Configuration**: Configurable port via environment variables
- **Graceful Shutdown**: Built-in server stop functionality
- **App Access**: Provides access to the Express application instance

## Installation

```bash
npm install @heoplatform/express-plugin
```

## API

### ExpressHooks Interface

```typescript
interface ExpressHooks {
  initExpress?: (app: express.Application, stop: () => void) => MaybePromise<void>;
  postInitExpress?: () => MaybePromise<void>;
}
```

- **`initExpress`**: Called when the Express app is being configured. Receives the Express app instance and a stop function.
- **`postInitExpress`**: Called after all Express initialization is complete, just before the server starts listening.

### ExpressPlugin Interface

```typescript
interface ExpressPlugin extends BaseHooks {
  name: "express";
  port: number;
  getExpressApp: () => express.Application;
}
```

- **`name`**: Always "express" - used for plugin identification
- **`port`**: The port the server will listen on
- **`getExpressApp()`**: Returns the Express application instance

## Usage

### Basic Setup

```typescript
import { initPlugins } from 'base-plugin-system';
import { expressPlugin } from 'express-plugin-system';

// Initialize with just the Express plugin
const plugins = [expressPlugin()];
await initPlugins(plugins);

// Server is now running on port 5173 (or PORT env var)
```

### Environment Configuration

```bash
# Set custom port
export PORT=3000
```

Or in your application:
```typescript
process.env.PORT = '3000';
```

### Creating Express-Enabled Plugins

```typescript
import { BaseHooks } from 'base-plugin-system';
import { expressPlugin, type ExpressHooks } from '@heoplatform/express-plugin';

// API Routes Plugin
const apiPlugin = (): BaseHooks & ExpressHooks => {
  let plugins!: any[] = []
  return {
    name: 'api',
    init: async (_plugins) => {
      plugins = _plugins

      if (!plugins.some(p=>p.name === 'express')) {
        const express = ExpressPlugin()
        plugins.push(express)
        express?.init(plugins)
      }
    },
    initExpress: async (app, stop) => {
      // Add middleware
      app.get("/", (req, res) => {
        res.send("Hello world!")
      })
    },
    postInitExpress: async () => {
      console.log('All express dependent applications are initialized!');
    }
  }
};

// Initialize all plugins
const plugins = [
  apiPlugin(),
];

await initPlugins(plugins);
```

## Initialization Flow

1. **Base `init` phase**: Express plugin reads PORT environment variable
2. **Express app creation**: Creates Express application instance
3. **`initExpress` phase**: All plugins with Express hooks configure the app
4. **`postInitExpress` phase**: Final Express setup before server starts
5. **Server start**: Express server begins listening on the configured port

## Configuration

The express plugin can be configured using environment variables.

- **`PORT`**: Server port (defaults to 5173)