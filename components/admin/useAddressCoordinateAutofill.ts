"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeWhitespace,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "@/lib/lab-address";

type UseAddressCoordinateAutofillArgs = {
  addressDetail?: string;
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
  onCoordinatesResolved: (latitude: number, longitude: number) => void;
  debounceMs?: number;
  enabled?: boolean;
  resetKey?: string | number | null;
};

type GeocodeResponse = {
  success?: boolean;
  message?: string;
  data?: {
    latitude: number;
    longitude: number;
    displayName: string;
    query: string;
  };
};

export default function useAddressCoordinateAutofill({
  addressDetail,
  provinceName,
  cityName,
  cityType,
  districtName,
  villageName,
  villageType,
  onCoordinatesResolved,
  debounceMs = 850,
  enabled = true,
  resetKey,
}: UseAddressCoordinateAutofillArgs) {
  const [isResolving, setIsResolving] = useState(false);
  const [hasResolvedOnce, setHasResolvedOnce] = useState(false);
  const callbackRef = useRef(onCoordinatesResolved);
  const initialKeyRef = useRef<string | null>(null);
  const lastResolvedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    callbackRef.current = onCoordinatesResolved;
  }, [onCoordinatesResolved]);

  useEffect(() => {
    initialKeyRef.current = null;
    lastResolvedKeyRef.current = null;
    setHasResolvedOnce(false);
    setIsResolving(false);
  }, [resetKey]);

  const payload = useMemo(
    () => ({
      addressDetail: normalizeWhitespace(String(addressDetail ?? "")),
      provinceName: normalizeWhitespace(String(provinceName ?? "")),
      cityName: normalizeWhitespace(String(cityName ?? "")),
      cityType: cityType ?? null,
      districtName: normalizeWhitespace(String(districtName ?? "")),
      villageName: normalizeWhitespace(String(villageName ?? "")),
      villageType: villageType ?? null,
    }),
    [
      addressDetail,
      cityName,
      cityType,
      districtName,
      provinceName,
      villageName,
      villageType,
    ]
  );

  const canResolve = useMemo(
    () =>
      Boolean(
        payload.provinceName &&
          payload.cityName &&
          payload.districtName &&
          (payload.villageName || payload.addressDetail.length >= 6)
      ),
    [payload]
  );

  const requestKey = canResolve ? JSON.stringify(payload) : "";

  useEffect(() => {
    if (initialKeyRef.current === null) {
      initialKeyRef.current = requestKey;
    }
  }, [requestKey]);

  useEffect(() => {
    if (!enabled || !requestKey) {
      setIsResolving(false);
      return;
    }

    if (requestKey === initialKeyRef.current || requestKey === lastResolvedKeyRef.current) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsResolving(true);

      try {
        const response = await fetch("/api/geocode/address", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const data = (await response.json()) as GeocodeResponse;

        if (!response.ok || data.success === false || !data.data) {
          throw new Error(data.message ?? "Lokasi belum ditemukan.");
        }

        callbackRef.current(data.data.latitude, data.data.longitude);
        lastResolvedKeyRef.current = requestKey;
        setHasResolvedOnce(true);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Autofill koordinat gagal:", error);
      } finally {
        if (!controller.signal.aborted) {
          setIsResolving(false);
        }
      }
    }, debounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [debounceMs, enabled, payload, requestKey]);

  return {
    canResolve,
    hasResolvedOnce,
    isResolving,
  };
}
