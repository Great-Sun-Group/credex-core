interface DashboardState {
  before: any;
  after: any;
}

export class DashboardStore {
  private states: Map<string, DashboardState> = new Map();

  // Update the after state for a member
  updateAfterState(memberID: string, dashboard: any) {
    if (!this.states.has(memberID)) {
      this.states.set(memberID, { before: null, after: null });
    }
    this.states.get(memberID)!.after = dashboard;
  }

  // Get current states for a member
  getStates(memberID: string): DashboardState {
    return this.states.get(memberID) || { before: null, after: null };
  }

  // Verify balance changes and promote after to before if successful
  verifyAndPromote(memberID: string, expectedAmount: string, denomination: string, secured: boolean): void {
    const states = this.getStates(memberID);
    if (!states.before || !states.after) {
      throw new Error(`Missing before/after state for member ${memberID}`);
    }

    // Find account balances in both states
    const findAccountBalances = (dashboard: any, accountID: string) => {
      const account = dashboard.accounts.find((acc: any) => acc.accountID === accountID);
      return account ? account.balanceData : null;
    };

    // Compare balances across all accounts
    states.before.accounts.forEach((beforeAccount: any) => {
      const afterBalances = findAccountBalances(states.after, beforeAccount.accountID);
      if (!afterBalances) {
        throw new Error(`Account ${beforeAccount.accountID} not found in after state`);
      }
      const beforeBalances = beforeAccount.balanceData;

      if (secured) {
        // Check secured balances in specified denomination
        const beforeSecured = parseFloat(beforeBalances.securedNetBalancesByDenom
          .find((b: any) => b.denomination === denomination)?.netBalance || "0");
        const afterSecured = parseFloat(afterBalances.securedNetBalancesByDenom
          .find((b: any) => b.denomination === denomination)?.netBalance || "0");
        const expectedNum = parseFloat(expectedAmount);

        console.log(`Account ${beforeAccount.accountID} secured balance change:`, {
          before: beforeSecured,
          after: afterSecured,
          expected: expectedNum,
          change: afterSecured - beforeSecured
        });

        // Verify the change matches the expected amount (either positive or negative)
        const change = Math.abs(afterSecured - beforeSecured);
        if (Math.abs(change - expectedNum) > 0.001) { // Use small epsilon for float comparison
          throw new Error(
            `Balance change ${change} does not match expected amount ${expectedNum} ` +
            `for account ${beforeAccount.accountID}`
          );
        }
      } else {
        // Check unsecured net balances
        const beforeNet = parseFloat(beforeBalances.unsecuredBalancesInDefaultDenom.netPayRec);
        const afterNet = parseFloat(afterBalances.unsecuredBalancesInDefaultDenom.netPayRec);
        const expectedNum = parseFloat(expectedAmount);

        console.log(`Account ${beforeAccount.accountID} unsecured net balance change:`, {
          before: beforeNet,
          after: afterNet,
          expected: expectedNum,
          change: afterNet - beforeNet
        });

        // Verify the change matches the expected amount (either positive or negative)
        const change = Math.abs(afterNet - beforeNet);
        if (Math.abs(change - expectedNum) > 0.001) { // Use small epsilon for float comparison
          throw new Error(
            `Net balance change ${change} does not match expected amount ${expectedNum} ` +
            `for account ${beforeAccount.accountID}`
          );
        }
      }
    });

    // If we get here, verification passed
    // Promote after to before and clear after
    states.before = states.after;
    states.after = null;
  }

  // Initialize before state for a member
  initializeState(memberID: string, dashboard: any) {
    this.states.set(memberID, {
      before: dashboard,
      after: null
    });
  }
}
