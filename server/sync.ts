import fetch from 'node-fetch';
import { storage } from './storage';
import { db } from './db';
import { InsertAccessLog, InsertMachineAlert, User, Location, Machine, RfidCard } from '@shared/schema';
import { log } from './vite';

interface SyncError {
  timestamp: Date;
  message: string;
  endpoint: string;
  statusCode?: number;
  responseBody?: string;
}

class SyncManager {
  private syncErrors: SyncError[] = [];
  private isSyncing: boolean = false;
  private lastSyncTime: Date | null = null;
  private syncIntervalId: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    log('Initializing sync manager', 'sync');
    try {
      const config = await storage.getApiConfig();
      
      if (config && config.syncEnabled) {
        this.startSync(config.syncInterval);
      }
    } catch (error) {
      log(`Error initializing sync manager: ${error}`, 'sync');
    }
  }

  startSync(intervalMinutes: number): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    log(`Starting sync with interval of ${intervalMinutes} minutes`, 'sync');
    // Run initial sync immediately
    this.performSync().catch(error => {
      log(`Error during initial sync: ${error}`, 'sync');
    });
    
    // Convert minutes to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;
    this.syncIntervalId = setInterval(() => {
      this.performSync().catch(error => {
        log(`Error during scheduled sync: ${error}`, 'sync');
      });
    }, intervalMs);
  }

  stopSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      log('Sync stopped', 'sync');
    }
  }

  async performSync(): Promise<void> {
    if (this.isSyncing) {
      log('Sync already in progress, skipping', 'sync');
      return;
    }
    
    this.isSyncing = true;
    
    try {
      log('Starting sync process', 'sync');
      const config = await storage.getApiConfig();
      
      if (!config || !config.syncEnabled) {
        log('Sync is disabled or no config found', 'sync');
        this.isSyncing = false;
        return;
      }

      // Check API key and URL
      if (!config.shopMonitorApiKey || !config.shopMonitorApiUrl) {
        this.addSyncError({
          timestamp: new Date(),
          message: 'Missing API key or URL in configuration',
          endpoint: 'N/A'
        });
        log('Missing API key or URL, cannot sync', 'sync');
        this.isSyncing = false;
        return;
      }

      // Push user data if enabled
      if (config.pushUserData) {
        await this.pushUsers(config.shopMonitorApiUrl, config.shopMonitorApiKey);
      }

      // Push location data if enabled
      if (config.pushLocationData) {
        await this.pushLocations(config.shopMonitorApiUrl, config.shopMonitorApiKey);
      }

      // Push machine data if enabled
      if (config.pushMachineData) {
        await this.pushMachines(config.shopMonitorApiUrl, config.shopMonitorApiKey);
      }

      // Pull access logs if enabled
      if (config.pullAccessLogs) {
        await this.pullAccessLogs(config.shopMonitorApiUrl, config.shopMonitorApiKey);
      }

      // Check for and pull alerts from ShopMonitor
      if (config.alertsEnabled) {
        await this.pullAlerts(config.shopMonitorApiUrl, config.shopMonitorApiKey);
      }

      this.lastSyncTime = new Date();
      log(`Sync completed successfully at ${this.lastSyncTime.toISOString()}`, 'sync');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Unhandled error during sync: ${error}`,
        endpoint: 'general'
      });
      log(`Unhandled error during sync: ${error}`, 'sync');
    } finally {
      this.isSyncing = false;
    }
  }

  async pushUsers(apiUrl: string, apiKey: string): Promise<void> {
    try {
      log('Pushing users to ShopMonitor', 'sync');
      const users = await storage.getAllUsers();
      
      // Don't send password hashes to the external system
      const sanitizedUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      const response = await fetch(`${apiUrl}/api/sync/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(sanitizedUsers)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      log(`Successfully pushed ${sanitizedUsers.length} users`, 'sync');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pushing users: ${error}`,
        endpoint: `${apiUrl}/api/sync/users`
      });
      log(`Error pushing users: ${error}`, 'sync');
    }
  }

  async pushLocations(apiUrl: string, apiKey: string): Promise<void> {
    try {
      log('Pushing locations to ShopMonitor', 'sync');
      const locations = await storage.getAllLocations();

      const response = await fetch(`${apiUrl}/api/sync/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(locations)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      log(`Successfully pushed ${locations.length} locations`, 'sync');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pushing locations: ${error}`,
        endpoint: `${apiUrl}/api/sync/locations`
      });
      log(`Error pushing locations: ${error}`, 'sync');
    }
  }

  async pushMachines(apiUrl: string, apiKey: string): Promise<void> {
    try {
      log('Pushing machines to ShopMonitor', 'sync');
      const machines = await storage.getAllMachines();

      const response = await fetch(`${apiUrl}/api/sync/machines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(machines)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      log(`Successfully pushed ${machines.length} machines`, 'sync');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pushing machines: ${error}`,
        endpoint: `${apiUrl}/api/sync/machines`
      });
      log(`Error pushing machines: ${error}`, 'sync');
    }
  }

  async pullAccessLogs(apiUrl: string, apiKey: string): Promise<void> {
    try {
      log('Pulling access logs from ShopMonitor', 'sync');
      
      // Get the timestamp of the most recent log we have
      const recentLogs = await storage.getRecentAccessLogs(1);
      const lastTimestamp = recentLogs.length > 0 
        ? recentLogs[0].timestamp.toISOString()
        : new Date(0).toISOString(); // If no logs, pull all logs
      
      const response = await fetch(`${apiUrl}/api/sync/access-logs?since=${encodeURIComponent(lastTimestamp)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const accessLogs = await response.json() as InsertAccessLog[];
      let importedCount = 0;
      
      for (const log of accessLogs) {
        try {
          await storage.createAccessLog(log);
          importedCount++;
        } catch (err) {
          console.error(`Error importing access log: ${err}`);
        }
      }
      
      log(`Successfully pulled and imported ${importedCount} access logs`, 'sync');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pulling access logs: ${error}`,
        endpoint: `${apiUrl}/api/sync/access-logs`
      });
      log(`Error pulling access logs: ${error}`, 'sync');
    }
  }

  async pullAlerts(apiUrl: string, apiKey: string): Promise<void> {
    try {
      log('Pulling alerts from ShopMonitor', 'sync');
      
      const response = await fetch(`${apiUrl}/api/sync/alerts`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const alerts = await response.json() as InsertMachineAlert[];
      let importedCount = 0;
      
      for (const alert of alerts) {
        try {
          await storage.createMachineAlert({
            ...alert,
            origin: "machine"
          });
          importedCount++;
        } catch (err) {
          console.error(`Error importing alert: ${err}`);
        }
      }
      
      // Acknowledge that we've processed these alerts
      await fetch(`${apiUrl}/api/sync/alerts/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });
      
      log(`Successfully pulled and imported ${importedCount} alerts`, 'sync');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pulling alerts: ${error}`,
        endpoint: `${apiUrl}/api/sync/alerts`
      });
      log(`Error pulling alerts: ${error}`, 'sync');
    }
  }

  addSyncError(error: SyncError): void {
    this.syncErrors.push(error);
    
    // Keep only the last 100 errors to avoid memory issues
    if (this.syncErrors.length > 100) {
      this.syncErrors.shift();
    }
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  getSyncErrors(): SyncError[] {
    return [...this.syncErrors];
  }

  getStatus(): {
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncErrors: SyncError[];
  } {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      syncErrors: this.getSyncErrors()
    };
  }
}

// Create a singleton instance
export const syncManager = new SyncManager();