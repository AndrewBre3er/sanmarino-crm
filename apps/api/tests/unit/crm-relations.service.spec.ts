import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal, AuthRoleCode } from "../../src/modules/auth/auth.contract";
import { CrmRelationsService } from "../../src/modules/crm-relations/crm-relations.service";
import type { PrismaCrmClientParticipantRepository } from "../../src/modules/crm-relations/client-participants.repository";
import type { PrismaCrmClientRepository } from "../../src/modules/crm-relations/clients.repository";
import type { PrismaCrmContactRepository } from "../../src/modules/crm-relations/contacts.repository";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type { PrismaCrmDealRepository } from "../../src/modules/transactional/crm/deal.repository";

function build_query(): ReadCollectionQueryInput {
  return {
    page: 1,
    pageSize: 20,
    includeDeleted: false,
    sortField: "createdAt",
    sortDirection: "desc",
    contract: {
      pagination: {
        mode: "page",
        page: {
          page: 1,
          pageSize: 20
        }
      },
      sort: [{ field: "createdAt", direction: "desc" }]
    }
  };
}

function make_user(roleCodes: AuthRoleCode[], userId = "user_1"): AuthPrincipal {
  const primaryRole = roleCodes[0] ?? "seller";
  return {
    userId,
    email: `${userId}@local`,
    login: `${userId}@local`,
    displayName: userId,
    primaryRole,
    roleCodes,
    allowedWorkspaces: roleCodes,
    permissionCodes: [],
    roleCode: primaryRole,
    optionalRole: false
  };
}

function make_service() {
  const clientRepository = {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn()
  } as unknown as PrismaCrmClientRepository;

  const contactRepository = {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn()
  } as unknown as PrismaCrmContactRepository;

  const participantRepository = {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn()
  } as unknown as PrismaCrmClientParticipantRepository;

  const dealRepository = {
    findById: vi.fn()
  } as unknown as PrismaCrmDealRepository;

  return {
    service: new CrmRelationsService(
      clientRepository,
      contactRepository,
      participantRepository,
      dealRepository
    ),
    clientRepository,
    contactRepository,
    participantRepository,
    dealRepository
  };
}

describe("crm relations service", () => {
  it("supports create/list/detail for client with seller baseline scope", async () => {
    const { service, clientRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const query = build_query();
    const clientRecord = {
      id: "client_1",
      clientType: "individual",
      name: "Client",
      legalName: null,
      phone: null,
      email: null,
      taxId: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    vi.mocked(clientRepository.create).mockResolvedValue(clientRecord);
    vi.mocked(clientRepository.list).mockResolvedValue({
      items: [clientRecord],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(clientRepository.findById).mockResolvedValue(clientRecord);

    const created = await service.createClient({ clientType: " individual ", name: " Client " }, seller);
    const listed = await service.listClients(query, seller);
    const detail = await service.getClient("client_1", seller);

    expect(created.clientType).toBe("individual");
    expect(created.name).toBe("Client");
    expect(listed.items).toHaveLength(1);
    expect(detail.id).toBe("client_1");
    expect(clientRepository.list).toHaveBeenCalledWith(query, { responsibleUserId: "seller_1" });
    expect(clientRepository.findById).toHaveBeenCalledWith("client_1", { responsibleUserId: "seller_1" });
  });

  it("supports create/list/detail for contact in seller contour", async () => {
    const { service, clientRepository, contactRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const query = build_query();
    const clientRecord = {
      id: "client_1",
      clientType: "individual",
      name: "Client",
      legalName: null,
      phone: null,
      email: null,
      taxId: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const contactRecord = {
      id: "contact_1",
      clientId: "client_1",
      name: "Contact",
      phone: null,
      email: null,
      position: null,
      isPrimary: false,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    vi.mocked(clientRepository.findById).mockResolvedValue(clientRecord);
    vi.mocked(contactRepository.create).mockResolvedValue(contactRecord);
    vi.mocked(contactRepository.list).mockResolvedValue({
      items: [contactRecord],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(contactRepository.findById).mockResolvedValue(contactRecord);

    const created = await service.createContact({ clientId: "client_1", name: " Contact " }, seller);
    const listed = await service.listContacts(query, { clientId: "client_1" }, seller);
    const detail = await service.getContact("contact_1", seller);

    expect(created.name).toBe("Contact");
    expect(listed.items).toHaveLength(1);
    expect(detail.id).toBe("contact_1");
    expect(clientRepository.findById).toHaveBeenCalledWith("client_1", { responsibleUserId: "seller_1" });
  });

  it("supports create/list/detail for client participant in seller contour", async () => {
    const { service, clientRepository, participantRepository, dealRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const query = build_query();

    const clientRecord = {
      id: "client_1",
      clientType: "individual",
      name: "Client",
      legalName: null,
      phone: null,
      email: null,
      taxId: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const dealRecord = {
      id: "deal_1",
      leadId: "lead_1",
      clientId: "client_1",
      status: "in_progress" as const,
      title: "Deal",
      responsibleUserId: "seller_1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const participantRecord = {
      id: "participant_1",
      clientId: "client_1",
      dealId: "deal_1",
      orderId: null,
      roleType: "installer" as const,
      name: "Participant",
      phone: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    vi.mocked(clientRepository.findById).mockResolvedValue(clientRecord);
    vi.mocked(dealRepository.findById).mockResolvedValue(dealRecord);
    vi.mocked(participantRepository.create).mockResolvedValue(participantRecord);
    vi.mocked(participantRepository.list).mockResolvedValue({
      items: [participantRecord],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(participantRepository.findById).mockResolvedValue(participantRecord);

    const created = await service.createClientParticipant(
      {
        clientId: "client_1",
        dealId: "deal_1",
        roleType: "installer",
        name: " Participant "
      },
      seller
    );
    const listed = await service.listClientParticipants(query, { clientId: "client_1" }, seller);
    const detail = await service.getClientParticipant("participant_1", seller);

    expect(created.roleType).toBe("installer");
    expect(listed.items).toHaveLength(1);
    expect(detail.id).toBe("participant_1");
  });

  it("rejects contact linkage to inaccessible/missing client for seller", async () => {
    const { service, clientRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    vi.mocked(clientRepository.findById).mockResolvedValue(null);

    await expect(
      service.createContact(
        {
          clientId: "missing_client",
          name: "Contact"
        },
        seller
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects invalid participant type", async () => {
    const { service, clientRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const clientRecord = {
      id: "client_1",
      clientType: "individual",
      name: "Client",
      legalName: null,
      phone: null,
      email: null,
      taxId: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    vi.mocked(clientRepository.findById).mockResolvedValue(clientRecord);

    await expect(
      service.createClientParticipant(
        {
          clientId: "client_1",
          roleType: "architect" as "installer",
          name: "Participant"
        },
        seller
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects participant linkage to missing deal", async () => {
    const { service, clientRepository, dealRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const clientRecord = {
      id: "client_1",
      clientType: "individual",
      name: "Client",
      legalName: null,
      phone: null,
      email: null,
      taxId: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    vi.mocked(clientRepository.findById).mockResolvedValue(clientRecord);
    vi.mocked(dealRepository.findById).mockResolvedValue(null);

    await expect(
      service.createClientParticipant(
        {
          clientId: "client_1",
          dealId: "missing_deal",
          roleType: "designer",
          name: "Participant"
        },
        seller
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects seller linkage to foreign deal", async () => {
    const { service, clientRepository, dealRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const clientRecord = {
      id: "client_1",
      clientType: "individual",
      name: "Client",
      legalName: null,
      phone: null,
      email: null,
      taxId: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    vi.mocked(clientRepository.findById).mockResolvedValue(clientRecord);
    vi.mocked(dealRepository.findById).mockResolvedValue({
      id: "deal_1",
      leadId: "lead_1",
      clientId: "client_1",
      status: "in_progress" as const,
      title: "Deal",
      responsibleUserId: "seller_other",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await expect(
      service.createClientParticipant(
        {
          clientId: "client_1",
          dealId: "deal_1",
          roleType: "designer",
          name: "Participant"
        },
        seller
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows admin to read without seller scope", async () => {
    const { service, clientRepository } = make_service();
    const admin = make_user(["admin"], "admin_1");
    const query = build_query();

    vi.mocked(clientRepository.list).mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
    });

    await service.listClients(query, admin);
    expect(clientRepository.list).toHaveBeenCalledWith(query, {});
  });
});
