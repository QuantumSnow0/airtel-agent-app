import {
  getCachedAgentData,
  saveAgentDataToCache,
  type CachedAgentData,
} from "../cache/agentCache";
import { supabase } from "../supabase";
import {
  deriveTownAreaFromPlace,
  parseGooglePlace,
} from "../google-places/parseGooglePlace";
import type { SelectedGooglePlace } from "../google-places/types";
import { markWorkingPlaceReady } from "../google-places/workingPlaceGate";

export async function saveAgentWorkingPlace(
  place: SelectedGooglePlace,
): Promise<{ ok: true; agent: CachedAgentData } | { ok: false; error: string }> {
  const parsed = parseGooglePlace(place);
  if (!parsed) {
    return {
      ok: false,
      error: "Select a landmark from the search results",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in again" };
  }

  const { town, area } = deriveTownAreaFromPlace(parsed);
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("agents")
    .update({
      working_place: parsed,
      working_place_updated_at: updatedAt,
      town,
      area,
      updated_at: updatedAt,
    })
    .eq("id", user.id)
    .select(
      "id, email, name, airtel_phone, safaricom_phone, town, area, status, created_at, updated_at, total_earnings, available_balance, working_place, working_place_updated_at",
    )
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Could not save working location",
    };
  }

  const cached: CachedAgentData = {
    id: data.id,
    email: data.email,
    name: data.name,
    airtel_phone: data.airtel_phone,
    safaricom_phone: data.safaricom_phone,
    town: data.town,
    area: data.area,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
    total_earnings: data.total_earnings,
    available_balance: data.available_balance,
    working_place: data.working_place,
    working_place_updated_at: data.working_place_updated_at,
  };

  const previous = await getCachedAgentData();
  await saveAgentDataToCache(
    previous?.id === cached.id ? { ...previous, ...cached } : cached,
  );
  markWorkingPlaceReady(true);
  return { ok: true, agent: cached };
}
