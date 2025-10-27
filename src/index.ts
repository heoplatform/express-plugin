import { BaseHooks } from "@heoplatform/base-plugin-system";
import express, { RequestHandler } from "express";
import http from "http";

type MaybePromise<T> = Promise<T> | T;

export interface ExpressHooks {
  initExpress?: (app: express.Application, stop: () => void) => MaybePromise<void>;
  postInitExpress?: () => MaybePromise<void>;
}

function pluginHasExpressHooks(plugin: any): plugin is ExpressHooks {
  return plugin.initExpress !== undefined;
}

export interface ExpressPlugin extends BaseHooks {
  name: "express";
  port: number;
  getExpressApp: () => express.Application;
}

function expressPlugin(): ExpressPlugin {
  let plugins: any[] = [];
  let port: number;
  let app: express.Application;
  let server: http.Server;
  let stopped = false;

  function stop() {
    if (server) {
      server.close();
    }
    stopped = true;
  }
  
  return {
    name: "express",
    get port() {
      return port;
    },
    init: async (_plugins) => {
      plugins = _plugins;
      port = parseInt(process.env.PORT ?? "") || 5173;
    },
    postInit: async () => {
      app = express();

      const relevantPlugins = plugins.filter(pluginHasExpressHooks);
      for (const plugin of relevantPlugins) {
        await plugin.initExpress?.(app, stop);
      }

      for (const plugin of relevantPlugins) {
        await plugin.postInitExpress?.();
      }

      if (stopped) {
        return;
      }

      server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    },
    getExpressApp: () => app,
  };
}

export async function injectExpress(plugins: any[]) {
  if (!plugins.find(p => p.name === "express")) {
    const express = expressPlugin()
    plugins.push(express)
    await express.init?.(plugins)
  }
}

export { expressPlugin };