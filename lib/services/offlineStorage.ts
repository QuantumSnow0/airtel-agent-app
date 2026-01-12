import * as SQLite from "expo-sqlite";
import { CustomerRegistrationData } from "./msFormsService";

export interface PendingRegistration {
  id: string;
  agent_id: string;
  customerData: CustomerRegistrationData;
  agentData: { name: string; mobile: string };
  status: "pending" | "syncing" | "synced" | "failed";
  error?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

// Initialize database
let db: SQLite.SQLiteDatabase | null = null;

export async function initOfflineStorage(): Promise<void> {
  // If already initialized, return early
  if (db) {
    return;
  }

  try {
    // Check if SQLite is available (won't work in Expo Go)
    if (typeof SQLite === 'undefined' || !SQLite.openDatabaseAsync) {
      throw new Error("SQLite is not available. Are you using Expo Go? SQLite requires a development build.");
    }

    db = await SQLite.openDatabaseAsync("airtel_agents.db");
    
    if (!db) {
      throw new Error("Failed to open database - database object is null");
    }
    
    // Create pending_registrations table
    // Use runAsync instead of execAsync for better Android compatibility
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        customer_data TEXT NOT NULL,
        agent_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Create indexes separately using runAsync
    try {
      await db.runAsync(`
        CREATE INDEX IF NOT EXISTS idx_pending_registrations_status 
        ON pending_registrations(status)
      `);
    } catch (error: any) {
      // Index might already exist, ignore
      if (!error?.message?.includes('already exists')) {
        console.warn("Index creation warning:", error);
      }
    }
    
    try {
      await db.runAsync(`
        CREATE INDEX IF NOT EXISTS idx_pending_registrations_agent_id 
        ON pending_registrations(agent_id)
      `);
    } catch (error: any) {
      // Index might already exist, ignore
      if (!error?.message?.includes('already exists')) {
        console.warn("Index creation warning:", error);
      }
    }
    
    console.log("✅ Offline storage initialized");
  } catch (error: any) {
    console.error("❌ Error initializing offline storage:", error);
    console.error("💡 Note: SQLite requires a development build. Expo Go doesn't support native modules like SQLite.");
    db = null; // Reset db on error
    throw error;
  }
}

export async function savePendingRegistration(
  agentId: string,
  customerData: CustomerRegistrationData,
  agentData: { name: string; mobile: string }
): Promise<string> {
  if (!db) {
    await initOfflineStorage();
  }

  const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  try {
    await db!.runAsync(
      `INSERT INTO pending_registrations 
       (id, agent_id, customer_data, agent_data, status, retry_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        agentId,
        JSON.stringify(customerData),
        JSON.stringify(agentData),
        "pending",
        0,
        now,
        now,
      ]
    );

    console.log("💾 Saved pending registration to offline storage:", id);
    return id;
  } catch (error) {
    console.error("❌ Error saving pending registration:", error);
    throw error;
  }
}

export async function getPendingRegistrations(
  agentId?: string
): Promise<PendingRegistration[]> {
  if (!db) {
    await initOfflineStorage();
  }
  
  if (!db) {
    console.warn("⚠️ Database not initialized, returning empty array");
    return [];
  }

  try {
    if (!db) {
      console.warn("⚠️ Database not initialized, returning empty array");
      return [];
    }

    let query = "SELECT * FROM pending_registrations WHERE status IN ('pending', 'failed')";
    const params: any[] = [];

    if (agentId) {
      query += " AND agent_id = ?";
      params.push(agentId);
    }

    query += " ORDER BY created_at ASC";

    const result = await db.getAllAsync<PendingRegistration>(query, params);

    return result.map((row: any) => ({
      id: row.id,
      agent_id: row.agent_id,
      customerData: JSON.parse(row.customer_data),
      agentData: JSON.parse(row.agent_data),
      status: row.status,
      error: row.error || undefined,
      retry_count: row.retry_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error("❌ Error getting pending registrations:", error);
    return [];
  }
}

export async function updatePendingRegistrationStatus(
  id: string,
  status: PendingRegistration["status"],
  error?: string
): Promise<void> {
  if (!db) {
    await initOfflineStorage();
  }

  try {
    const now = new Date().toISOString();
    await db!.runAsync(
      `UPDATE pending_registrations 
       SET status = ?, error = ?, updated_at = ?, retry_count = retry_count + 1
       WHERE id = ?`,
      [status, error || null, now, id]
    );

    console.log(`📝 Updated pending registration ${id} to status: ${status}`);
  } catch (error) {
    console.error("❌ Error updating pending registration:", error);
    throw error;
  }
}

export async function deletePendingRegistration(id: string): Promise<void> {
  if (!db) {
    await initOfflineStorage();
  }

  try {
    await db!.runAsync("DELETE FROM pending_registrations WHERE id = ?", [id]);
    console.log(`🗑️ Deleted pending registration: ${id}`);
  } catch (error) {
    console.error("❌ Error deleting pending registration:", error);
    throw error;
  }
}

export async function getPendingCount(agentId?: string): Promise<number> {
  if (!db) {
    await initOfflineStorage();
  }

  try {
    let query = "SELECT COUNT(*) as count FROM pending_registrations WHERE status IN ('pending', 'failed')";
    const params: any[] = [];

    if (agentId) {
      query += " AND agent_id = ?";
      params.push(agentId);
    }

    const result = await db!.getFirstAsync<{ count: number }>(query, params);
    return result?.count || 0;
  } catch (error) {
    console.error("❌ Error getting pending count:", error);
    return 0;
  }
}

