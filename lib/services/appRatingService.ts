import { supabase } from "../supabase";

export type AppRatingRow = {
  id: string;
  agent_id: string;
  score: number;
  opened_play_store: boolean;
  created_at: string;
  updated_at: string;
};

export async function submitAppRating(
  agentId: string,
  score: number
): Promise<{ success: boolean; error?: string }> {
  if (!agentId || score < 1 || score > 5) {
    return { success: false, error: "Invalid rating" };
  }

  try {
    const { error } = await supabase.from("app_ratings").upsert(
      {
        agent_id: agentId,
        score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id" }
    );

    if (error) {
      console.error("Error submitting app rating:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error submitting app rating:", error);
    return { success: false, error: message };
  }
}

export async function markAppRatingPlayStoreOpened(
  agentId: string
): Promise<{ success: boolean; error?: string }> {
  if (!agentId) {
    return { success: false, error: "Missing agent id" };
  }

  try {
    const { error } = await supabase
      .from("app_ratings")
      .update({
        opened_play_store: true,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", agentId);

    if (error) {
      console.error("Error marking Play Store opened:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error marking Play Store opened:", error);
    return { success: false, error: message };
  }
}
