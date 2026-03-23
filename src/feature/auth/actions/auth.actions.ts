import { authClient } from "../../../shared/lib/auth/client";

export const signIn = (
  email: string,
  password: string,
  callbackURL: string
) => authClient.signIn.email({ email, password, callbackURL });

export const signUp = (name: string, email: string, password: string) =>
  authClient.signUp.email({ name, email, password });
