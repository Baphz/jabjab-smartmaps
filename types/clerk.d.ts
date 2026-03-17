export {};

declare global {
  interface UserPublicMetadata {
    role?: "admin" | "lab_admin";
    lab_id?: string;
    lab_name?: string;
  }
}
