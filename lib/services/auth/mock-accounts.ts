import type { Viewer } from "@/lib/domain/viewer";

export type MockAccount = {
  password: string;
  sessionId: string;
  viewer: Viewer;
};

export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    password: "adminP!@ssw0rd",
    sessionId: "nsp_adm_7f5e8c2a91d64b30a4c821f63310e772",
    viewer: {
      id: "viewer-admin",
      username: "admin",
      displayName: "NearSip Admin",
      role: "admin",
    },
  },
  {
    password: "admin01123",
    sessionId: "nsp_ad1_1a2b3c4d5e6f70819203a4b5c6d7e8f9",
    viewer: {
      id: "viewer-admin01",
      username: "admin01",
      displayName: "Admin 01",
      role: "province",
    },
  },
  {
    password: "admin02123",
    sessionId: "nsp_ad2_2b3c4d5e6f70819203a4b5c6d7e8f9a1",
    viewer: {
      id: "viewer-admin02",
      username: "admin02",
      displayName: "Admin 02",
      role: "province",
    },
  },
  {
    password: "admin03123",
    sessionId: "nsp_ad3_3c4d5e6f70819203a4b5c6d7e8f9a1b2",
    viewer: {
      id: "viewer-admin03",
      username: "admin03",
      displayName: "Admin 03",
      role: "province",
    },
  },
];
