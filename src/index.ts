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
  /**
   * The path prefix the whole app is mounted under, e.g. "/admin" when a
   * reverse proxy forwards example.com/admin/* here without stripping the
   * prefix. "" means the app owns the root of its domain.
   */
  basePath: string;
  getExpressApp: () => express.Application;
}

export interface ExpressConfig {
  /**
   * Overrides the BASE_PATH env var. Normalized to "" or "/segment".
   */
  basePath?: string;
}

/**
 * Normalizes a mount prefix to "" or "/segment[/segment...]".
 */
export function normalizeBasePath(basePath: string | undefined | null): string {
  if (!basePath) return "";
  const trimmed = basePath.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * The prefix every generated URL has to carry. Safe to call from any plugin —
 * returns "" when the app is mounted at the root.
 */
export function getBasePath(plugins: any[]): string {
  return plugins.find((p): p is ExpressPlugin => p?.name === "express")?.basePath ?? "";
}

function expressPlugin(config?: ExpressConfig): ExpressPlugin {
  let plugins: any[] = [];
  let port: number;
  let basePath: string;
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
    get basePath() {
      return basePath;
    },
    init: async (_plugins) => {
      plugins = _plugins;
      port = parseInt(process.env.PORT ?? "") || 5173;
      basePath = normalizeBasePath(config?.basePath ?? process.env.BASE_PATH);
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

export async function injectExpress(plugins: any[], config?: ExpressConfig) {
  const existing = plugins.find((p): p is ExpressPlugin => p.name === "express")
  if (existing) {
    // A boot plugin that cares about the mount prefix has to inject express
    // before any dependency does, or its config would be silently dropped.
    const requested = normalizeBasePath(config?.basePath)
    if (requested && existing.basePath !== requested) {
      throw new Error(
        `Express is already mounted at "${existing.basePath}", cannot also mount it at "${requested}".`
      )
    }
    return
  }
  const express = expressPlugin(config)
  plugins.push(express)
  await express.init?.(plugins)
}

export { expressPlugin };