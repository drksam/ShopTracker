import fetch from 'node-fetch';
import { storage } from './storage';
import { db } from './db';
import { InsertAccessLog, InsertMachineAlert, User, Location, Machine, RfidCard } from '@shared/schema';
import { log } from './vite';
import { logError, SyncError } from './utils';

interface SyncError {
  timestamp: Date;
  message: string;
  endpoint: string;
  statusCode?: number;
  responseBody?: string;
}

/**
 * Helper function for retry mechanism
 * @param fn Function to retry
 * @param retries Maximum number of retries
 * @param delay Delay between retries in milliseconds
 * @param retryCondition Optional condition to determine if retry should happen for specific error types
 */
async function withRetry<T>(
  fn: () => Promise<T>, 
  retries: number = 3, 
  delay: number = 1000,
  retryCondition?: (error: Error) => boolean
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Check if we should retry based on error type and remaining retries
    if (retries > 0 && (!retryCondition || retryCondition(error as Error))) {
      logError(`Retrying operation after error: ${error}. Retries left: ${retries}`, 'sync', 'warn');
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff for next retry
      return withRetry(fn, retries - 1, delay * 2, retryCondition);
    }
    throw error;
  }
}

class SyncManager {
  private syncErrors: SyncError[] = [];
  private isSyncing: boolean = false;
  private lastSyncTime: Date | null = null;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private readonly maxRetries = 3;

  async initialize(): Promise<void> {
    logError('Initializing sync manager', 'sync', 'info');
    try {
      const config = await storage.getApiConfig();
      
      if (config && config.syncEnabled) {
        this.startSync(config.syncInterval);
      }
    } catch (error) {
      logError(`Error initializing sync manager: ${error}`, 'sync', 'error');
    }
  }

  startSync(intervalMinutes: number): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    logError(`Starting sync with interval of ${intervalMinutes} minutes`, 'sync', 'info');
    // Run initial sync immediately
    this.performSync().catch(error => {
      logError(`Error during initial sync: ${error}`, 'sync', 'error');
    });
    
    // Convert minutes to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;
    this.syncIntervalId = setInterval(() => {
      this.performSync().catch(error => {
        logError(`Error during scheduled sync: ${error}`, 'sync', 'error');
      });
    }, intervalMs);
  }

  stopSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      logError('Sync stopped', 'sync', 'info');
    }
  }

  async performSync(): Promise<void> {
    if (this.isSyncing) {
      logError('Sync already in progress, skipping', 'sync', 'info');
      return;
    }
    
    this.isSyncing = true;
    
    try {
      logError('Starting sync process', 'sync', 'info');
      const config = await storage.getApiConfig();
      
      if (!config || !config.syncEnabled) {
        logError('Sync is disabled or no config found', 'sync', 'info');
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
        logError('Missing API key or URL, cannot sync', 'sync', 'error');
        this.isSyncing = false;
        return;
      }

      // Push user data if enabled
      if (config.pushUserData) {
        await withRetry(() => this.pushUsers(config.shopMonitorApiUrl, config.shopMonitorApiKey), 
          this.maxRetries);
      }

      // Push location data if enabled
      if (config.pushLocationData) {
        await withRetry(() => this.pushLocations(config.shopMonitorApiUrl, config.shopMonitorApiKey), 
          this.maxRetries);
      }

      // Push machine data if enabled
      if (config.pushMachineData) {
        await withRetry(() => this.pushMachines(config.shopMonitorApiUrl, config.shopMonitorApiKey), 
          this.maxRetries);
      }

      // Pull access logs if enabled
      if (config.pullAccessLogs) {
        await withRetry(() => this.pullAccessLogs(config.shopMonitorApiUrl, config.shopMonitorApiKey), 
          this.maxRetries);
      }

      // Check for and pull alerts from ShopMonitor
      if (config.alertsEnabled) {
        await withRetry(() => this.pullAlerts(config.shopMonitorApiUrl, config.shopMonitorApiKey), 
          this.maxRetries);
      }

      this.lastSyncTime = new Date();
      logError(`Sync completed successfully at ${this.lastSyncTime.toISOString()}`, 'sync', 'info');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Unhandled error during sync: ${error}`,
        endpoint: 'general'
      });
      logError(`Unhandled error during sync: ${error}`, 'sync', 'error');
    } finally {
      this.isSyncing = false;
    }
  }

  async pushUsers(apiUrl: string, apiKey: string): Promise<void> {
    try {
      logError('Pushing users to ShopMonitor', 'sync', 'info');
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
        throw new SyncError(
          `HTTP error ${response.status}: ${errorText}`,
          'pushUsers',
          `${apiUrl}/api/sync/users`,
          response.status
        );
      }
      
      logError(`Successfully pushed ${sanitizedUsers.length} users`, 'sync', 'info');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pushing users: ${error}`,
        endpoint: `${apiUrl}/api/sync/users`
      });
      logError(`Error pushing users: ${error}`, 'sync', 'error');
      throw error; // Rethrow for retry mechanism
    }
  }

  async pushLocations(apiUrl: string, apiKey: string): Promise<void> {
    try {
      logError('Pushing locations to ShopMonitor', 'sync', 'info');
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
        throw new SyncError(
          `HTTP error ${response.status}: ${errorText}`,
          'pushLocations',
          `${apiUrl}/api/sync/locations`,
          response.status
        );
      }
      
      logError(`Successfully pushed ${locations.length} locations`, 'sync', 'info');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pushing locations: ${error}`,
        endpoint: `${apiUrl}/api/sync/locations`
      });
      logError(`Error pushing locations: ${error}`, 'sync', 'error');
      throw error; // Rethrow for retry mechanism
    }
  }

  async pushMachines(apiUrl: string, apiKey: string): Promise<void> {
    try {
      logError('Pushing machines to ShopMonitor', 'sync', 'info');
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
        throw new SyncError(
          `HTTP error ${response.status}: ${errorText}`,
          'pushMachines',
          `${apiUrl}/api/sync/machines`,
          response.status
        );
      }
      
      logError(`Successfully pushed ${machines.length} machines`, 'sync', 'info');
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pushing machines: ${error}`,
        endpoint: `${apiUrl}/api/sync/machines`
      });
      logError(`Error pushing machines: ${error}`, 'sync', 'error');
      throw error; // Rethrow for retry mechanism
    }
  }

  async pullAccessLogs(apiUrl: string, apiKey: string): Promise<void> {
    try {
      logError('Pulling access logs from ShopMonitor', 'sync', 'info');
      
      // Get the timestamp of the most recent log we have
      const recentLogs = await storage.getRecentAccessLogs(1);
      const lastTimestamp = recentLogs.length > 0 
        ? recentLogs[0].timestamp.toISOString()
        : new Date(0).toISOString(); // If no logs, pull all logs
      
      const url = `${apiUrl}/api/sync/access-logs?since=${encodeURIComponent(lastTimestamp)}`;
      
      logError(`Fetching logs since: ${lastTimestamp}`, 'sync', 'info');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new SyncError(
          `HTTP error ${response.status}: ${errorText}`,
          'pullAccessLogs',
          url,
          response.status
        );
      }
      
      // Handle potential JSON parsing errors
      let accessLogs: InsertAccessLog[];
      try {
        accessLogs = await response.json() as InsertAccessLog[];
      } catch (parseError) {
        throw new SyncError(
          `Error parsing JSON response: ${parseError}`,
          'pullAccessLogs',
          url
        );
      }
      
      logError(`Fetched ${accessLogs.length} access logs to import`, 'sync', 'info');
      
      // Validate access logs structure before processing
      if (!Array.isArray(accessLogs)) {
        throw new SyncError(
          `Invalid response format, expected array but got: ${typeof accessLogs}`,
          'pullAccessLogs',
          url
        );
      }
      
      // Process logs in batches to avoid overwhelming database
      const batchSize = 50;
      let importedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < accessLogs.length; i += batchSize) {
        const batch = accessLogs.slice(i, i + batchSize);
        
        // Process each log in the batch
        for (const log of batch) {
          try {
            // Validate required fields
            if (!log.machineId || (!log.userId && !log.cardId)) {
              logError(
                `Skipping invalid log entry: missing required fields. machineId: ${log.machineId}, userId: ${log.userId}, cardId: ${log.cardId}`,
                'sync',
                'warn'
              );
              errorCount++;
              continue;
            }
            
            // Handle edge cases: 
            // - Ensure timestamp is a Date object
            if (typeof log.timestamp === 'string') {
              log.timestamp = new Date(log.timestamp);
            } else if (typeof log.timestamp === 'number') {
              log.timestamp = new Date(log.timestamp);
            } else if (!log.timestamp) {
              log.timestamp = new Date(); // Default to current time if missing
            }
            
            // Create access log record with error handling
            await withRetry(() => storage.createAccessLog(log), 3, 500);
            importedCount++;
          } catch (err) {
            errorCount++;
            logError(`Error importing access log: ${err}`, 'sync', 'error');
          }
        }
        
        // Add a small delay between batches to prevent overwhelming the database
        if (i + batchSize < accessLogs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      logError(`Successfully imported ${importedCount} access logs. Errors: ${errorCount}`, 'sync', 'info');
      
      // If there were errors, add a sync error record for monitoring
      if (errorCount > 0) {
        this.addSyncError({
          timestamp: new Date(),
          message: `Completed access log sync with ${errorCount} errors out of ${accessLogs.length} records`,
          endpoint: url
        });
      }
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pulling access logs: ${error}`,
        endpoint: `${apiUrl}/api/sync/access-logs`
      });
      logError(`Error pulling access logs: ${error}`, 'sync', 'error');
      throw error; // Rethrow for retry mechanism
    }
  }

  async pullAlerts(apiUrl: string, apiKey: string): Promise<void> {
    try {
      logError('Pulling alerts from ShopMonitor', 'sync', 'info');
      
      const response = await fetch(`${apiUrl}/api/sync/alerts`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new SyncError(
          `HTTP error ${response.status}: ${errorText}`,
          'pullAlerts',
          `${apiUrl}/api/sync/alerts`,
          response.status
        );
      }
      
      // Handle potential JSON parsing errors
      let alerts: InsertMachineAlert[];
      try {
        alerts = await response.json() as InsertMachineAlert[];
      } catch (parseError) {
        throw new SyncError(
          `Error parsing JSON response: ${parseError}`,
          'pullAlerts',
          `${apiUrl}/api/sync/alerts`
        );
      }

      // Validate alerts structure
      if (!Array.isArray(alerts)) {
        throw new SyncError(
          `Invalid response format, expected array but got: ${typeof alerts}`,
          'pullAlerts',
          `${apiUrl}/api/sync/alerts`
        );
      }
      
      logError(`Fetched ${alerts.length} alerts to import`, 'sync', 'info');
      
      let importedCount = 0;
      let errorCount = 0;
      
      for (const alert of alerts) {
        try {
          // Add origin marker
          await storage.createMachineAlert({
            ...alert,
            origin: "machine"
          });
          importedCount++;
        } catch (err) {
          errorCount++;
          logError(`Error importing alert: ${err}`, 'sync', 'error');
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
      
      logError(`Successfully imported ${importedCount} alerts. Errors: ${errorCount}`, 'sync', 'info');
      
      // If there were errors, add a sync error record
      if (errorCount > 0) {
        this.addSyncError({
          timestamp: new Date(),
          message: `Completed alert sync with ${errorCount} errors out of ${alerts.length} records`,
          endpoint: `${apiUrl}/api/sync/alerts`
        });
      }
    } catch (error) {
      this.addSyncError({
        timestamp: new Date(),
        message: `Error pulling alerts: ${error}`,
        endpoint: `${apiUrl}/api/sync/alerts`
      });
      logError(`Error pulling alerts: ${error}`, 'sync', 'error');
      throw error; // Rethrow for retry mechanism
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