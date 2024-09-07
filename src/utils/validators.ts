export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateMemberHandle(handle: string): boolean {
  const handleRegex = /^[a-z0-9._]{3,30}$/;
  return handleRegex.test(handle);
}

export function validateAccountName(name: string): boolean {
  return name.length >= 3 && name.length <= 50;
}

export function validateAccountHandle(handle: string): boolean {
  const handleRegex = /^[a-z0-9._]{3,30}$/;
  return handleRegex.test(handle);
}