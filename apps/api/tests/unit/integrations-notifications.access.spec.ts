import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import { IntegrationsNotificationsController } from "../../src/modules/integrations-notifications/integrations-notifications.controller";

describe("integrations + notifications access baseline", () => {
  it("locks integration and notification command endpoints to admin/ceo roles", () => {
    const requirements = Reflect.getMetadata(
      auth_access_metadata_key,
      IntegrationsNotificationsController
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual(["admin", "ceo"]);
  });
});
