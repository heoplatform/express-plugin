import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initPlugins } from '@heoplatform/base-plugin-system';
import { expressPlugin, ExpressPlugin } from '../src/index';
import { createExpressTestingPlugin } from './express.testing.plugin';
import type { BaseTestingPluginHooks } from '../../base/tests/base.testing.plugin'; // For type if needed
import request from 'supertest';

// Mock the base plugin system if its actual init logic is not needed or complex for these tests
vi.mock('@heoplatform/base-plugin-system', async (importOriginal) => {
  const original = await importOriginal<typeof import('@heoplatform/base-plugin-system')>();
  return {
    ...original,
    // We only mock initPlugins if necessary, often direct import is fine
    // initPlugins: vi.fn(original.initPlugins) 
  };
});


describe('Express Plugin', () => {
  let mainExpressPlugin: ExpressPlugin;
  let testingExpressPluginHooks: ReturnType<typeof createExpressTestingPlugin>;

  beforeEach(async () => {
    // Ensure environment variable for port is set for predictability, or use a default
    process.env.PORT = '0'; // Use port 0 to let OS pick an available port
    mainExpressPlugin = expressPlugin();
  });

  afterEach(async () => {
    // Stop the server if it was started by the testing plugin
    if (testingExpressPluginHooks?.stopExpressServer) {
      await testingExpressPluginHooks.stopExpressServer();
    }
    // Or, if the mainExpressPlugin itself holds the server instance and stop method directly:
    // if (mainExpressPlugin.stop) { await mainExpressPlugin.stop(); }
    delete process.env.PORT;
  });

  it('should correctly call initExpress and postInitExpress on relevant plugins', async () => {
    testingExpressPluginHooks = createExpressTestingPlugin();
    await initPlugins([mainExpressPlugin, testingExpressPluginHooks]);

    expect(testingExpressPluginHooks.initExpressCalled).toBe(true);
    expect(testingExpressPluginHooks.postInitExpressCalled).toBe(true);
    expect(testingExpressPluginHooks.expressApp).toBeDefined();
  });

  it('should allow a testing plugin to configure a test route and receive requests', async () => {
    const testRoute = '/test-express-route';
    const testMessage = 'Express test successful!';

    testingExpressPluginHooks = createExpressTestingPlugin({
      configureApp: (app) => {
        app.get(testRoute, (req, res) => {
          res.status(200).send(testMessage);
        });
      }
    });

    // Initialize plugins. This will start the server via expressPlugin's postInit.
    await initPlugins([mainExpressPlugin, testingExpressPluginHooks]);

    expect(testingExpressPluginHooks.expressApp).toBeDefined();
    if (!testingExpressPluginHooks.expressApp) throw new Error('Express app not initialized');

    const response = await request(testingExpressPluginHooks.expressApp).get(testRoute);
    expect(response.status).toBe(200);
    expect(response.text).toBe(testMessage);
  });

  it('expressPlugin getExpressApp() should return the app instance', async () => {
    testingExpressPluginHooks = createExpressTestingPlugin();
    await initPlugins([mainExpressPlugin, testingExpressPluginHooks]);
    const appFromGetter = mainExpressPlugin.getExpressApp();
    expect(appFromGetter).toBeDefined();
    expect(appFromGetter).toBe(testingExpressPluginHooks.expressApp);
  });

  it('should start server on port specified in env or default', async () => {
    process.env.PORT = '3001';
    mainExpressPlugin = expressPlugin(); // Re-initialize with new port
    testingExpressPluginHooks = createExpressTestingPlugin();
    
    await initPlugins([mainExpressPlugin, testingExpressPluginHooks]);

    expect(mainExpressPlugin.port).toBe(3001);
    // Note: Actual server listening test might require a brief pause or a ready signal
    // For now, we trust expressPlugin's internal console.log and port property
    // A more robust test would try to connect to localhost:3001
  });

}); 