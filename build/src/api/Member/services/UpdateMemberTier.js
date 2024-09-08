"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMemberTierService = UpdateMemberTierService;
const neo4j_1 = require("../../../../config/neo4j");
const neo4j = __importStar(require("neo4j-driver"));
async function UpdateMemberTierService(memberIDtoUpdate, newTier) {
    if (newTier < 1 || newTier > 5) {
        return {
            message: "New member tier is not a valid value",
        };
    }
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const result = await ledgerSpaceSession.run(`
        MATCH (member:Member { memberID: $memberIDtoUpdate })
        SET member.memberTier = $newTier
        RETURN
          member.memberID AS memberIDupdated
      `, {
            memberIDtoUpdate,
            newTier: neo4j.int(newTier),
        });
        if (!result.records.length) {
            return false;
        }
        const record = result.records[0];
        if (record.get("memberIDupdated")) {
            console.log("Member tier for " + memberIDtoUpdate + " set to " + newTier);
            return true;
        }
        else {
            console.log("could not authorize account");
            return false;
        }
    }
    catch (error) {
        console.error("Error updating member tier: ", error);
        return false;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=UpdateMemberTier.js.map