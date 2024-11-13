import { DatabaseSessions } from "./types";
import logger from "../../../utils/logger";

/**
 * Sets up necessary database constraints and indexes.
 */
export async function setupDatabaseConstraints(
  { ledgerSpace, searchSpace }: DatabaseSessions,
  requestId: string
): Promise<void> {
  logger.info("Creating database constraints and indexes...", { requestId });

  // Remove any current db constraints
  await ledgerSpace.run("CALL apoc.schema.assert({}, {})");
  await searchSpace.run("CALL apoc.schema.assert({}, {})");

  // Set new constraints
  const constraints = [
    "CREATE CONSTRAINT daynodeDate_unique IF NOT EXISTS FOR (daynode:Daynode) REQUIRE daynode.Date IS UNIQUE",
    "CREATE CONSTRAINT memberID_unique IF NOT EXISTS FOR (member:Member) REQUIRE member.memberID IS UNIQUE",
    "CREATE CONSTRAINT memberHandle_unique IF NOT EXISTS FOR (member:Member) REQUIRE member.memberHandle IS UNIQUE",
    "CREATE CONSTRAINT memberPhone_unique IF NOT EXISTS FOR (member:Member) REQUIRE member.phone IS UNIQUE",
    "CREATE CONSTRAINT accountID_unique IF NOT EXISTS FOR (account:Account) REQUIRE account.accountID IS UNIQUE",
    "CREATE CONSTRAINT accountHandle_unique IF NOT EXISTS FOR (account:Account) REQUIRE account.accountHandle IS UNIQUE",
  ];

  for (const constraint of constraints) {
    await ledgerSpace.run(constraint);
  }

  await searchSpace.run(
    "CREATE CONSTRAINT accountID_unique IF NOT EXISTS FOR (account:Account) REQUIRE account.accountID IS UNIQUE"
  );
  await searchSpace.run(
    "CREATE CONSTRAINT credexID_unique IF NOT EXISTS FOR (credex:Credex) REQUIRE credex.credexID IS UNIQUE"
  );

  logger.info("Database constraints and indexes created successfully", {
    requestId,
  });
}
