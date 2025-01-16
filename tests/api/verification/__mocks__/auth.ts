export const loginMember = jest.fn().mockResolvedValue({
  jwt: 'mock-jwt-token',
  memberId: 'mock-member-id',
  status: 'success'
});
