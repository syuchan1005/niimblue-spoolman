import type { SpoolmanSpool } from "$/types";

interface FetchSpoolmanSpoolsOptions {
  baseUrl: string;
  headerName?: string;
  headerValue?: string;
}

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.trim().replace(/\/+$/, "");
};

export const getFilamentLabel = (spool: SpoolmanSpool): string => {
  const vendorName = spool.filament?.vendor?.name?.trim() ?? "";
  const filamentName = spool.filament?.name?.trim() ?? "";

  if (vendorName && filamentName) {
    return `${vendorName} - ${filamentName}`;
  }

  return vendorName || filamentName || "-";
};

export const getFilamentMaterial = (spool: SpoolmanSpool): string => {
  return spool.filament?.material?.trim() || "-";
};

export const fetchSpoolmanSpools = async (options: FetchSpoolmanSpoolsOptions): Promise<SpoolmanSpool[]> => {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  if (!baseUrl) {
    throw new Error("SpoolMan base URL is empty");
  }

  const headers: HeadersInit = {};
  const headerName = options.headerName?.trim();
  const headerValue = options.headerValue?.trim();

  if (headerName && headerValue) {
    headers[headerName] = headerValue;
  }

  const response = await fetch(`${baseUrl}/api/v1/spool`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`SpoolMan request failed (${response.status} ${response.statusText})`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("SpoolMan response is not an array");
  }

  return data as SpoolmanSpool[];
};
