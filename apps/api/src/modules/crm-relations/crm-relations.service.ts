import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  PrismaCrmClientParticipantRepository,
  crm_client_participant_role_types,
  type CrmClientParticipantCreateInput,
  type CrmClientParticipantListFilters
} from "./client-participants.repository";
import {
  PrismaCrmClientRepository,
  type CrmClientCreateInput
} from "./clients.repository";
import {
  PrismaCrmContactRepository,
  type CrmContactCreateInput,
  type CrmContactListFilters
} from "./contacts.repository";
import { PrismaCrmDealRepository } from "../transactional/crm/deal.repository";
import type { ReadCollectionQueryInput } from "../read-side/shared/read-model.contract";

@Injectable()
export class CrmRelationsService {
  constructor(
    @Inject(PrismaCrmClientRepository)
    private readonly clientRepository: PrismaCrmClientRepository,
    @Inject(PrismaCrmContactRepository)
    private readonly contactRepository: PrismaCrmContactRepository,
    @Inject(PrismaCrmClientParticipantRepository)
    private readonly clientParticipantRepository: PrismaCrmClientParticipantRepository,
    @Inject(PrismaCrmDealRepository)
    private readonly dealRepository: PrismaCrmDealRepository
  ) {}

  async listClients(query: ReadCollectionQueryInput) {
    return this.clientRepository.list(query);
  }

  async getClient(clientId: string) {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' was not found`);
    }

    return client;
  }

  async createClient(input: CrmClientCreateInput) {
    return this.clientRepository.create({
      clientType: input.clientType.trim(),
      name: input.name.trim(),
      ...(input.legalName !== undefined ? { legalName: input.legalName?.trim() ?? null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() ?? null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() ?? null } : {}),
      ...(input.taxId !== undefined ? { taxId: input.taxId?.trim() ?? null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() ?? null } : {})
    });
  }

  async listContacts(query: ReadCollectionQueryInput, filters: CrmContactListFilters) {
    return this.contactRepository.list(query, filters);
  }

  async getContact(contactId: string) {
    const contact = await this.contactRepository.findById(contactId);
    if (!contact) {
      throw new NotFoundException(`Contact '${contactId}' was not found`);
    }

    return contact;
  }

  async createContact(input: CrmContactCreateInput) {
    await this.assert_client_exists(input.clientId);

    return this.contactRepository.create({
      clientId: input.clientId,
      name: input.name.trim(),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() ?? null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() ?? null } : {}),
      ...(input.position !== undefined ? { position: input.position?.trim() ?? null } : {}),
      ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() ?? null } : {})
    });
  }

  async listClientParticipants(
    query: ReadCollectionQueryInput,
    filters: CrmClientParticipantListFilters
  ) {
    return this.clientParticipantRepository.list(query, filters);
  }

  async getClientParticipant(participantId: string) {
    const participant = await this.clientParticipantRepository.findById(participantId);
    if (!participant) {
      throw new NotFoundException(`ClientParticipant '${participantId}' was not found`);
    }

    return participant;
  }

  async createClientParticipant(input: CrmClientParticipantCreateInput) {
    await this.assert_client_exists(input.clientId);

    if (!crm_client_participant_role_types.includes(input.roleType)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "ClientParticipant.roleType must be one of: installer, designer"
      });
    }

    if (input.dealId) {
      const deal = await this.dealRepository.findById(input.dealId);
      if (!deal) {
        throw new NotFoundException(`Deal '${input.dealId}' was not found`);
      }

      if (deal.clientId !== input.clientId) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "ClientParticipant.dealId must reference deal linked to the same client"
        });
      }
    }

    return this.clientParticipantRepository.create({
      clientId: input.clientId,
      ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
      roleType: input.roleType,
      name: input.name.trim(),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() ?? null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() ?? null } : {})
    });
  }

  private async assert_client_exists(clientId: string): Promise<void> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' was not found`);
    }
  }
}
