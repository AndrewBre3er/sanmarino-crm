import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import { ClientParticipantsController } from "../../src/modules/crm-relations/client-participants.controller";
import { ClientsController } from "../../src/modules/crm-relations/clients.controller";
import { ContactsController } from "../../src/modules/crm-relations/contacts.controller";

describe("crm relations access baseline", () => {
  it("locks CRM relations controllers to seller/admin/ceo roles", () => {
    const controllers = [ClientsController, ContactsController, ClientParticipantsController];

    for (const controller of controllers) {
      const requirements = Reflect.getMetadata(auth_access_metadata_key, controller) as {
        authenticated?: boolean;
        requiredRoleCodes?: string[];
      };

      expect(requirements?.authenticated).toBe(true);
      expect(requirements?.requiredRoleCodes).toEqual(["seller", "admin", "ceo"]);
    }
  });
});
