import { ApiActionType } from "./apiResponse";

/**
 * Standardized Dashboard Response Template
 * Used to ensure consistent dashboard structure across all API responses
 */
export const dashboardSwaggerTemplate = {
  type: "object",
  description: "Standardized dashboard state",
  properties: {
    // Member Level Information
    memberID: {
      type: "string",
      format: "uuid",
      description: "ID of the authenticated member",
    },
    memberTier: {
      type: "integer",
      description: "Current membership tier level",
    },
    remainingAvailableUSD: {
      type: "number",
      description:
        "Available USD for transactions (optional, n/a for memberTier>=3)",
    },
    firstname: {
      type: "string",
      description: "Member's first name",
    },
    lastname: {
      type: "string",
      description: "Member's last name",
    },
    memberHandle: {
      type: "string",
      description: "Member's first name",
    },
    defaultDenom: {
      type: "string",
      description: "Member's default denomination",
    },

    // Account Information
    accounts: {
      type: "array",
      description: "List of accounts accessible to the member",
      items: {
        type: "object",
        properties: {
          accountID: {
            type: "string",
            format: "uuid",
          },
          accountName: {
            type: "string",
          },
          accountHandle: {
            type: "string",
          },
          accountType: {
            type: "string",
            enum: [
              "PERSONAL",
              "TRUST",
              "OPERATIONS",
            ],
            description: "Type of the account",
          },
          defaultDenom: {
            type: "string",
            enum: ["CXX", "CAD", "USD", "XAU"],
          },
          isOwnedAccount: {
            type: "boolean",
            description: "Whether the member owns this account",
          },
          sendOffersTo: {
            type: "object",
            description: "Member configured to receive offers for this account",
            properties: {
              memberID: {
                type: "string",
                format: "uuid",
              },
              firstname: {
                type: "string",
              },
              lastname: {
                type: "string",
              },
            },
          },
          balanceData: {
            type: "object",
            description: "Account balance information",
            properties: {
              securedNetBalancesByDenom: {
                type: "array",
                items: {
                  type: "string",
                  description:
                    'Formatted balance with denomination (e.g. "100.00 USD")',
                },
              },
              unsecuredBalancesInDefaultDenom: {
                type: "object",
                properties: {
                  totalPayables: {
                    type: "string",
                    description:
                      "Total payables in account default denomination",
                  },
                  totalReceivables: {
                    type: "string",
                    description:
                      "Total receivables in account default denomination",
                  },
                  netPayRec: {
                    type: "string",
                    description:
                      "Net payables/receivables in account default denomination",
                  },
                },
              },
              netCredexAssetsInDefaultDenom: {
                type: "string",
                description:
                  "Net credex assets in account default denomination",
              },
            },
          },
          pendingInData: {
            type: "array",
            description: "Pending incoming transactions",
            items: {
              type: "object",
              description: "Pending transaction details",
            },
          },
          pendingOutData: {
            type: "array",
            description: "Pending outgoing transactions",
            items: {
              type: "object",
              description: "Pending transaction details",
            },
          },
        },
      },
    },
  },
};
