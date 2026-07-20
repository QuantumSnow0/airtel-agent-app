import * as SQLite from "expo-sqlite";
import type { CustomerRegistrationData } from "./msFormsService";
import type { PendingRegistration } from "./offlineStorage.types";

export type { PendingRegistration } from "./offlineStorage.types";

let db: SQLite.SQLiteDatabase | null = null;

export async function initOfflineStorage(): Promise<void> {
  if (db) return;

  if (typeof SQLite === "undefined" || !SQLite.openDatabaseAsync) {
    throw new Error(
      "SQLite is not available. Use a development build instead of Expo Go.",
    );
  }

  db = await SQLite.openDatabaseAsync("airtel_agents.db");
  if (!db) {
    throw new Error("Failed to open database");
  }

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

  try {
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_pending_registrations_status
      ON pending_registrations(status)
    `);
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_pending_registrations_agent_id
      ON pending_registrations(agent_id)
    `);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("already exists")) {
      console.warn("Index creation warning:", error);
    }
  }

  console.log("✅ Offline storage initialized");
}

export async function savePendingRegistration(
  agentId: string,
  customerData: CustomerRegistrationData,
  agentData: { name: string; mobile: string },
): Promise<string> {
  if (!db) await initOfflineStorage();

  const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

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
    ],
  );

  console.log("💾 Saved pending registration to offline storage:", id);
  return id;
}

export async function getPendingRegistrations(
  agentId?: string,
): Promise<PendingRegistration[]> {
  if (!db) await initOfflineStorage();
  if (!db) return [];

  let query =
    "SELECT * FROM pending_registrations WHERE status IN ('pending', 'failed')";
  const params: string[] = [];

  if (agentId) {
    query += " AND agent_id = ?";
    params.push(agentId);
  }

  query += " ORDER BY created_at ASC";

  const result = await db.getAllAsync<{
    id: string;
    agent_id: string;
    customer_data: string;
    agent_data: string;
    status: PendingRegistration["status"];
    error: string | null;
    retry_count: number;
    created_at: string;
    updated_at: string;
  }>(query, params);

  return result.map((row) => ({
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
}

export async function updatePendingRegistrationStatus(
  id: string,
  status: PendingRegistration["status"],
  error?: string,
): Promise<void> {
  if (!db) await initOfflineStorage();

  const now = new Date().toISOString();
  await db!.runAsync(
    `UPDATE pending_registrations
     SET status = ?, error = ?, updated_at = ?, retry_count = retry_count + 1
     WHERE id = ?`,
    [status, error || null, now, id],
  );
}

export async function deletePendingRegistration(id: string): Promise<void> {
  if (!db) await initOfflineStorage();
  await db!.runAsync("DELETE FROM pending_registrations WHERE id = ?", [id]);
}

export async function getPendingCount(agentId?: string): Promise<number> {
  if (!db) await initOfflineStorage();

  let query =
    "SELECT COUNT(*) as count FROM pending_registrations WHERE status IN ('pending', 'failed')";
  const params: string[] = [];

  if (agentId) {
    query += " AND agent_id = ?";
    params.push(agentId);
  }

  const result = await db!.getFirstAsync<{ count: number }>(query, params);
  return result?.count || 0;
}
