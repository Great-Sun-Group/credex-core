"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validators_1 = require("../validators");
describe('Validators', () => {
    describe('validateUUID', () => {
        it('should return true for valid UUIDs', () => {
            expect((0, validators_1.validateUUID)('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
            expect((0, validators_1.validateUUID)('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        });
        it('should return false for invalid UUIDs', () => {
            expect((0, validators_1.validateUUID)('not-a-uuid')).toBe(false);
            expect((0, validators_1.validateUUID)('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
            expect((0, validators_1.validateUUID)('123e4567-e89b-12d3-a456-4266141740000')).toBe(false);
        });
    });
    describe('validateMemberHandle', () => {
        it('should return true for valid member handles', () => {
            expect((0, validators_1.validateMemberHandle)('john_doe')).toBe(true);
            expect((0, validators_1.validateMemberHandle)('user123')).toBe(true);
            expect((0, validators_1.validateMemberHandle)('a.b.c')).toBe(true);
        });
        it('should return false for invalid member handles', () => {
            expect((0, validators_1.validateMemberHandle)('jo')).toBe(false);
            expect((0, validators_1.validateMemberHandle)('user_name_too_long_123456789012345678901234567890')).toBe(false);
            expect((0, validators_1.validateMemberHandle)('Invalid-Handle')).toBe(false);
            expect((0, validators_1.validateMemberHandle)('user@name')).toBe(false);
        });
    });
    describe('validateAccountName', () => {
        it('should return true for valid account names', () => {
            expect((0, validators_1.validateAccountName)('John Doe')).toBe(true);
            expect((0, validators_1.validateAccountName)('Company Name 123')).toBe(true);
            expect((0, validators_1.validateAccountName)('A'.repeat(50))).toBe(true);
        });
        it('should return false for invalid account names', () => {
            expect((0, validators_1.validateAccountName)('Jo')).toBe(false);
            expect((0, validators_1.validateAccountName)('A'.repeat(51))).toBe(false);
            expect((0, validators_1.validateAccountName)('')).toBe(false);
        });
    });
    describe('validateAccountHandle', () => {
        it('should return true for valid account handles', () => {
            expect((0, validators_1.validateAccountHandle)('johndoe')).toBe(true);
            expect((0, validators_1.validateAccountHandle)('company_123')).toBe(true);
            expect((0, validators_1.validateAccountHandle)('a.b.c')).toBe(true);
        });
        it('should return false for invalid account handles', () => {
            expect((0, validators_1.validateAccountHandle)('jo')).toBe(false);
            expect((0, validators_1.validateAccountHandle)('handle_too_long_123456789012345678901234567890')).toBe(false);
            expect((0, validators_1.validateAccountHandle)('Invalid-Handle')).toBe(false);
            expect((0, validators_1.validateAccountHandle)('handle@invalid')).toBe(false);
        });
    });
});
//# sourceMappingURL=validators.test.js.map