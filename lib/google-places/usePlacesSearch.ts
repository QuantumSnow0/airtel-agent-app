import { useEffect, useRef, useState } from "react";
import {
  createPlacesSessionToken,
  fetchPlaceDetails,
  fetchPlacePredictions,
} from "./placesApi";
import type { PlacesPrediction, SelectedGooglePlace } from "./types";

export function usePlacesSearch(
  selected: SelectedGooglePlace | null,
  onSelect: (place: SelectedGooglePlace | null) => void,
) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [predictions, setPredictions] = useState<PlacesPrediction[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef(createPlacesSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (selected?.name && selected.name !== query) {
      setQuery(selected.name);
    }
  }, [selected?.placeId, selected?.name]);

  const search = async (value: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const result = await fetchPlacePredictions(
        value,
        sessionTokenRef.current,
      );
      if (requestId !== requestIdRef.current) return;
      setPredictions(result.predictions);
      setStatus(result.status);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setPredictions([]);
      setStatus("Could not search places. Try again.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const handleChange = (next: string) => {
    setQuery(next);
    onSelect(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!next.trim()) {
      setPredictions([]);
      setStatus(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void search(next);
    }, 220);
  };

  const selectPrediction = async (prediction: PlacesPrediction) => {
    setLoading(true);
    setStatus(null);
    try {
      const result = await fetchPlaceDetails(
        prediction.placeId,
        sessionTokenRef.current,
        prediction.label,
        prediction.secondary,
      );
      sessionTokenRef.current = createPlacesSessionToken();
      if (!result.place) {
        setPredictions([]);
        setStatus(result.status);
        onSelect(null);
        return;
      }
      onSelect(result.place);
      setQuery(result.place.name);
      setPredictions([]);
      setStatus(null);
    } catch {
      setStatus("Could not load that place. Try another result.");
    } finally {
      setLoading(false);
    }
  };

  return {
    query,
    predictions,
    status,
    loading,
    handleChange,
    selectPrediction,
  };
}
