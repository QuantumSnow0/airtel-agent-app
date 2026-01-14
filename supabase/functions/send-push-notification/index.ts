// Supabase Edge Function: Send Push Notification
// This function is called when a notification is created in the database
// It fetches the device token and sends a push notification via Expo Push API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationData {
  id: string;
  agent_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  metadata?: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Log request details for debugging
    console.log("📥 Edge Function called");
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    const authHeader = req.headers.get("authorization");
    console.log("Has Authorization header:", !!authHeader);

    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!supabaseServiceKey) {
      console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set in Edge Function secrets");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const rawBody = await req.text();
    console.log("📦 Raw request body:", rawBody.substring(0, 500)); // Log first 500 chars
    
    let webhookData: any;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (e) {
      console.error("❌ Failed to parse request body as JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("📋 Parsed webhook data:", JSON.stringify(webhookData, null, 2));

    // Supabase webhooks send data in format: { type, table, schema, record, old_record }
    // Database triggers might send: { notification: {...} }
    const notification = webhookData.record || webhookData.notification;

    if (!notification || !notification.agent_id) {
      console.error("❌ Invalid webhook payload - missing notification or agent_id");
      console.error("Full payload:", JSON.stringify(webhookData, null, 2));
      return new Response(
        JSON.stringify({ error: "Missing notification or agent_id", received: webhookData }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("📤 Sending push notification for:", notification.id);

    // Fetch active device tokens for this agent
    const { data: deviceTokens, error: tokensError } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("agent_id", notification.agent_id)
      .eq("is_active", true);

    if (tokensError) {
      console.error("Error fetching device tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch device tokens" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log("⚠️ No device tokens found for agent:", notification.agent_id);
      return new Response(
        JSON.stringify({ success: true, message: "No device tokens found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Prepare push notification payload
    const pushNotifications = deviceTokens.map((dt) => ({
      to: dt.token,
      sound: "default",
      title: notification.title,
      body: notification.message,
      data: {
        type: notification.type,
        notificationId: notification.id,
        relatedId: notification.related_id,
        metadata: notification.metadata || {},
      },
      badge: 1, // Increment badge count
      priority: "high",
    }));

    console.log(`📱 Sending ${pushNotifications.length} push notification(s)`);
    console.log("📤 Push notification payload:", JSON.stringify(pushNotifications, null, 2));

    // Send push notifications via Expo Push API
    console.log("🌐 Calling Expo Push API...");
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(pushNotifications),
    });

    console.log("📡 Expo Push API response status:", response.status, response.statusText);
    
    const result = await response.json();
    console.log("📥 Expo Push API response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("❌ Expo Push API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send push notification", details: result }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if Expo returned any errors in the response
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((receipt: any, index: number) => {
        if (receipt.status === "error") {
          console.error(`❌ Push notification ${index + 1} failed:`, receipt.message, receipt.details);
        } else {
          console.log(`✅ Push notification ${index + 1} sent successfully:`, receipt.id);
        }
      });
    }

    console.log("✅ Push notifications sent successfully:", result);

    return new Response(
      JSON.stringify({
        success: true,
        sent: pushNotifications.length,
        result,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

