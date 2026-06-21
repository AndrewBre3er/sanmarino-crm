import { createServer } from "node:http";

const port = Number(process.env.E2E_MOCK_API_PORT ?? 4010);

const now = "2026-06-21T10:00:00.000Z";

const json_headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function send_json(response, statusCode, payload) {
  response.writeHead(statusCode, json_headers);
  response.end(JSON.stringify(payload));
}

function page_meta(totalItems) {
  return {
    pagination: {
      mode: "page",
      page: {
        page: 1,
        pageSize: 20,
        totalItems,
        totalPages: totalItems > 0 ? 1 : 0
      }
    }
  };
}

const session_payload = {
  user: {
    userId: "00000000-0000-0000-0000-000000000001",
    email: "ceo.e2e@local",
    login: "ceo.e2e@local",
    displayName: "CEO E2E",
    primaryRole: "ceo",
    roleCode: "ceo",
    roleCodes: ["ceo", "admin"],
    allowedWorkspaces: ["ceo", "admin"]
  },
  session: {
    sessionId: "session_e2e",
    issuedAt: now,
    refreshExpiresAt: "2026-06-22T10:00:00.000Z"
  }
};

const deal_payload = {
  id: "deal_1",
  leadId: "lead_1",
  clientId: "client_1",
  contactId: "contact_1",
  status: "in_progress",
  title: "Kitchen project",
  notes: "Mocked e2e deal",
  responsibleUserId: "seller_1",
  nextContactAt: "2026-06-22T09:00:00.000Z",
  lostReason: null,
  isStuck: true,
  stuckReason: "waiting_supplier_eta",
  createdAt: now,
  updatedAt: now,
  version: 1,
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  isDeleted: false
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  if (url.pathname === "/api/health") {
    send_json(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/auth/me") {
    send_json(response, 200, session_payload);
    return;
  }

  if (url.pathname === "/api/deals") {
    send_json(response, 200, {
      data: [deal_payload],
      meta: page_meta(1)
    });
    return;
  }

  if (url.pathname === "/api/deals/deal_1") {
    send_json(response, 200, {
      data: deal_payload
    });
    return;
  }

  send_json(response, 200, {
    data: [],
    meta: page_meta(0)
  });
});

server.listen(port, "127.0.0.1");

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
