export function saveProfile(data: { name: string; email: string }) {
  console.log("[settings] saveProfile →", data);
}

export function savePassword(data: {
  current: string;
  next: string;
  confirm: string;
}) {
  console.log("[settings] savePassword →", data);
}

export function saveAccount(data: { preferences: string }) {
  console.log("[settings] saveAccount →", data);
}
