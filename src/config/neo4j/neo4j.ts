import * as neo4j from "neo4j-driver";

const url = `${process.env.NEO_4J_LEDGER_SPACE_BOLT_URL_DEV}`;
const user = `${process.env.NEO_4J_LEDGER_SPACE_USER_DEV}`;
const password = `${process.env.NEO_4J_LEDGER_SPACE_PASS_DEV}`;

const driverLedgerSpace = neo4j.driver(url,neo4j.auth.basic(user,password),
{
  encrypted:true
}
);

export const session = driverLedgerSpace.session()