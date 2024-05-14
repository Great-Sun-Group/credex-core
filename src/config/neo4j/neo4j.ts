import * as neo4j from "neo4j-driver";

const url = `${process.env.NEO_4J_LEDGER_SPACE_BOLT_URL}`;
const user = `${process.env.NEO_4J_LEDGER_SPACE_USER}`;
const password = `${process.env.NEO_4J_LEDGER_SPACE_PASS}`;

const driverLedgerSpace = neo4j.driver(url,neo4j.auth.basic(user,password),
{
  encrypted:true
}
);

export const session = driverLedgerSpace.session()