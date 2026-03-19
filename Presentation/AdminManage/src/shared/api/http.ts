const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || "https://localhost:7047/api";
const AUTH_STORAGE_KEY = "vk_auth_user";

// Simple mock storage for fallback
const mockStorage = new Map<string, any>();

// Initialize with sample data
const initMockData = () => {
  if (mockStorage.size === 0) {
    mockStorage.set("pois", [
      {
        id: "poi-001",
        order: 0,
        range: 15,
        position: { type: "Point", lat: 10.7626, lng: 106.6822 },
        localizedData: [
          {
            langCode: "vi",
            name: "Ốc Oanh",
            description: "Ốc nướng, hàu nướng...",
            descriptionText: "Đường Vĩnh Khánh, Q.4",
            descriptionAudio: "MAIN",
          },
        ],
        thumbnail: null,
        banner: null,
      },
    ]);
    mockStorage.set("tours", []);
  }
};

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  // Get auth token from localStorage
  let authToken: string | null = null;
  try {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (authData) {
      const parsed = JSON.parse(authData);
      authToken = parsed.token;
    }
  } catch {
    // Ignore parsing errors
  }

  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;
  const headers = new Headers(options?.headers);

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Inject JWT token if available
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  try {
    // Timeout dành cho multilingual generation requests (5-7 minutes)
    const isLongRunningRequest = endpoint.includes("/multilingual/");
    const timeout = isLongRunningRequest ? 600000 : 30000; // 10 mins vs 30 secs

    const response = await Promise.race([
      fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${timeout / 1000}s`)),
          timeout,
        ),
      ),
    ]);

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        responseData?.error?.message ||
          `HTTP ${response.status}: Request failed`,
      );
    }

    return responseData as T;
  } catch (error) {
    // Fallback to mock API
    console.warn("⚠️ Backend unavailable, using mock data:", error);
    initMockData();
    return handleMockRequest<T>(endpoint, options);
  }
}

function handleMockRequest<T>(endpoint: string, options?: RequestInit): T {
  const method = options?.method || "GET";

  // Parse endpoint for ID
  const segments = endpoint.split("/").filter((s) => s);
  const resourceType = segments[0]; // 'pois' or 'tours'
  const resourceId = segments[1];

  // GET /pois
  if (endpoint === "/pois" && method === "GET") {
    return { data: mockStorage.get("pois") || [] } as T;
  }

  // GET /pois/:id
  if (resourceType === "pois" && resourceId && method === "GET") {
    const pois = mockStorage.get("pois") || [];
    const poi = pois.find((p: any) => p.id === resourceId);
    return { data: poi || null } as T;
  }

  // POST /pois
  if (endpoint === "/pois" && method === "POST") {
    const newPoi: any = {
      id: `poi-${Date.now()}`,
      order: 0,
      range: 15,
      position: { type: "Point", lat: 10.7626, lng: 106.6822 },
      localizedData: [
        {
          langCode: "vi",
          name: "Địa điểm mới",
          description: "Mô tả",
          descriptionText: "Địa chỉ",
          descriptionAudio: "MAIN",
        },
      ],
      thumbnail: null,
      banner: null,
    };
    const pois = mockStorage.get("pois") || [];
    pois.push(newPoi);
    mockStorage.set("pois", pois);
    return { data: newPoi } as T;
  }

  // PUT /pois/:id
  if (resourceType === "pois" && resourceId && method === "PUT") {
    const pois = mockStorage.get("pois") || [];
    const idx = pois.findIndex((p: any) => p.id === resourceId);
    if (idx >= 0) {
      const updates = parseFormData(options?.body);
      pois[idx] = { ...pois[idx], ...updates };
      mockStorage.set("pois", pois);
      return { data: pois[idx] } as T;
    }
    throw new Error("POI not found");
  }

  // DELETE /pois/:id
  if (resourceType === "pois" && resourceId && method === "DELETE") {
    const pois = mockStorage.get("pois") || [];
    mockStorage.set(
      "pois",
      pois.filter((p: any) => p.id !== resourceId),
    );
    // Cascade: remove from tours
    const tours = mockStorage.get("tours") || [];
    mockStorage.set(
      "tours",
      tours.map((t: any) => ({
        ...t,
        poiIds: t.poiIds.filter((pid: string) => pid !== resourceId),
      })),
    );
    return { data: true } as T;
  }

  // GET /tours
  if (endpoint === "/tours" && method === "GET") {
    return { data: mockStorage.get("tours") || [] } as T;
  }

  // GET /tours/:id
  if (resourceType === "tours" && resourceId && method === "GET") {
    const tours = mockStorage.get("tours") || [];
    const tour = tours.find((t: any) => t.id === resourceId);
    return { data: tour || null } as T;
  }

  // POST /tours
  if (endpoint === "/tours" && method === "POST") {
    const newTour: any = {
      id: `tour-${Date.now()}`,
      name: "Tour mới",
      description: "",
      poiIds: [],
      durationMinutes: 0,
      createdAt: new Date().toISOString(),
      coverImage: null,
    };
    const tours = mockStorage.get("tours") || [];
    tours.push(newTour);
    mockStorage.set("tours", tours);
    return { data: newTour } as T;
  }

  // PUT /tours/:id
  if (resourceType === "tours" && resourceId && method === "PUT") {
    const tours = mockStorage.get("tours") || [];
    const idx = tours.findIndex((t: any) => t.id === resourceId);
    if (idx >= 0) {
      let updates: any = {};
      if (typeof options?.body === "string") {
        updates = JSON.parse(options.body);
      }
      tours[idx] = { ...tours[idx], ...updates };
      mockStorage.set("tours", tours);
      return { data: tours[idx] } as T;
    }
    throw new Error("Tour not found");
  }

  // DELETE /tours/:id
  if (resourceType === "tours" && resourceId && method === "DELETE") {
    const tours = mockStorage.get("tours") || [];
    mockStorage.set(
      "tours",
      tours.filter((t: any) => t.id !== resourceId),
    );
    return { data: true } as T;
  }

  console.warn(`⚠️ Mock API: Endpoint not implemented - ${method} ${endpoint}`);
  return { data: [] } as T;
}

function parseFormData(body: any): Record<string, any> {
  if (body instanceof FormData) {
    const obj: any = {};
    body.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return {};
}
