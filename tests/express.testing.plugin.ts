import { BaseHooks } from '@heoplatform/base-plugin-system';
import { ExpressHooks } from '../src/index'; // Path to express plugin's own types
import type express from 'express';

export interface ExpressTestingPluginActualHooks {
  initExpressCalled: boolean;
  postInitExpressCalled: boolean;
  configureApp?: (app: express.Application) => void;
  expressApp?: express.Application;
  stopExpressServer?: () => void;
}

export function createExpressTestingPlugin(hooks?: { 
  configureApp?: (app: express.Application) => void 
}): BaseHooks & ExpressHooks & ExpressTestingPluginActualHooks {
  const state: ExpressTestingPluginActualHooks = {
    initExpressCalled: false,
    postInitExpressCalled: false,
  };

  return {
    // Actual Hooks for assertions
    get initExpressCalled() { return state.initExpressCalled; },
    get postInitExpressCalled() { return state.postInitExpressCalled; },
    get expressApp() { return state.expressApp; },
    get stopExpressServer() { return state.stopExpressServer; },

    // BaseHooks (optional, if express plugin relies on them from others)
    async init(plugins: any[]) { /* Relevant assertions if needed */ },
    async postInit() { /* Relevant assertions if needed */ },

    // ExpressHooks
    async initExpress(app: express.Application, stop: () => void) {
      state.initExpressCalled = true;
      state.expressApp = app;
      state.stopExpressServer = stop;
      if (hooks?.configureApp) {
        hooks.configureApp(app);
      }
    },
    async postInitExpress() {
      state.postInitExpressCalled = true;
    },
  };
} 