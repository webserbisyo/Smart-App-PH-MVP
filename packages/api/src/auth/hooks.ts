'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '../keys';
import { useApiClient } from '../provider';

import {
  getSession,
  resendEmailCode,
  resetPasswordWithCode,
  sendCustomerCode,
  sendPasswordResetCode,
  signIn,
  signOut,
  signUpOwner,
  verifyCustomerCode,
  verifyEmailCode,
} from './auth';
import type { Session } from './auth';

export function useSession() {
  const client = useApiClient();
  return useQuery<Session | null>({ queryKey: qk.session, queryFn: () => getSession(client) });
}

/** After any sign-in or sign-out, everything cached belonged to the previous user. */
function useResetOnAuth() {
  const queryClient = useQueryClient();
  return () => queryClient.resetQueries();
}

export function useSignUpOwner() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) => signUpOwner(client, input),
  });
}

export function useVerifyEmailCode() {
  const client = useApiClient();
  const reset = useResetOnAuth();
  return useMutation({
    mutationFn: (input: { email: string; code: string }) => verifyEmailCode(client, input),
    onSuccess: reset,
  });
}

export function useResendEmailCode() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (input: { email: string }) => resendEmailCode(client, input) });
}

export function useSignIn() {
  const client = useApiClient();
  const reset = useResetOnAuth();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) => signIn(client, input),
    onSuccess: reset,
  });
}

export function useSignOut() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => signOut(client),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useSendPasswordResetCode() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (input: { email: string }) => sendPasswordResetCode(client, input) });
}

export function useResetPasswordWithCode() {
  const client = useApiClient();
  const reset = useResetOnAuth();
  return useMutation({
    mutationFn: (input: { email: string; code: string; newPassword: string }) => resetPasswordWithCode(client, input),
    onSuccess: reset,
  });
}

export function useSendCustomerCode() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (input: { email: string }) => sendCustomerCode(client, input) });
}

export function useVerifyCustomerCode() {
  const client = useApiClient();
  const reset = useResetOnAuth();
  return useMutation({
    mutationFn: (input: { email: string; code: string }) => verifyCustomerCode(client, input),
    onSuccess: reset,
  });
}
