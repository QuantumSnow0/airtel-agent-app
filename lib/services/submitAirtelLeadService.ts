import { supabase } from "../supabase";
import type { AirtelLeadSubmitFormData } from "../validation/airtelConnectRegistrationSchemas";
import { parseGooglePlace } from "../google-places/parseGooglePlace";

function toIsoDate(mdY: string): string | null {
  const [month, day, year] = mdY.split("/").map(Number);
  if (!month || !day || !year) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function deriveInstallArea(place: {
  neighborhood: string | null;
  sublocalityLevel1: string | null;
  sublocality: string | null;
  locality: string | null;
}): string | null {
  return (
    place.neighborhood?.trim() ||
    place.sublocalityLevel1?.trim() ||
    place.sublocality?.trim() ||
    null
  );
}

export type SubmitAirtelLeadResult =
  | {
      success: true;
      leadId: string;
      dispatch?: { outcome?: string; reason?: string };
    }
  | {
      success: false;
      error: string;
      duplicate?: boolean;
      existingLeadId?: string;
    };

export async function submitAirtelInboundLead(
  form: AirtelLeadSubmitFormData,
): Promise<SubmitAirtelLeadResult> {
  try {
    const place = parseGooglePlace(form.googlePlace);
    if (!place) {
      return {
        success: false,
        error: "Select an installation landmark from the search results",
      };
    }

    const visitDateIso = toIsoDate(form.visitDate.trim());
    const { data, error } = await supabase.functions.invoke(
      "submit-agent-inbound-lead",
      {
        body: {
          customerName: form.customerName.trim(),
          primaryPhone: form.phoneNumber.trim(),
          email: form.email.trim(),
          installationTown: form.installationTown.trim(),
          installationArea: deriveInstallArea(place),
          deliveryLandmark: place.name,
          county: place.county,
          preferredPackage: form.preferredPackage,
          unitsRequired: form.unitsRequired,
          visitDate: visitDateIso ?? form.visitDate.trim(),
          visitTime: form.visitTime.trim(),
          googlePlace: place,
        },
      },
    );

    if (error) {
      return {
        success: false,
        error: error.message || "Could not submit lead",
      };
    }

    if (data?.duplicate) {
      return {
        success: false,
        error: String(
          data.message ?? "An active lead already exists for this phone",
        ),
        duplicate: true,
        existingLeadId: data.existingLeadId
          ? String(data.existingLeadId)
          : undefined,
      };
    }

    if (!data?.success || !data?.leadId) {
      return {
        success: false,
        error: String(data?.error ?? "Lead submit failed"),
      };
    }

    return {
      success: true,
      leadId: String(data.leadId),
      dispatch: data.dispatch,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not submit lead",
    };
  }
}

export async function fetchSubmittedLeads(agentId: string) {
  const { data, error } = await supabase
    .from("inbound_leads")
    .select("*")
    .eq("submitted_by_agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { leads: [], error: error.message };
  return { leads: data ?? [] };
}
