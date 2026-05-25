import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Client,
  Session,
  DayOff,
  WorkoutType,
  PublicClientView,
  CompletedHistoryItem,
} from '../types';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
  }),
  tagTypes: ['Clients', 'Sessions', 'Client', 'Public', 'DaysOff'],
  endpoints: (builder) => ({
    getMe: builder.query<{ role: string }, void>({
      query: () => '/auth/me',
    }),
    login: builder.mutation<{ ok: boolean }, { password: string }>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    getClients: builder.query<Client[], void>({
      query: () => '/clients',
      providesTags: ['Clients'],
    }),
    getClient: builder.query<
      { client: Client; history: CompletedHistoryItem[] },
      string
    >({
      query: (id) => `/clients/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Client', id }],
    }),
    createClient: builder.mutation<
      Client,
      {
        name: string;
        surname?: string;
        soloRemaining?: number;
        splitRemaining?: number;
        runningRemaining?: number;
      }
    >({
      query: (body) => ({ url: '/clients', method: 'POST', body }),
      invalidatesTags: ['Clients'],
    }),
    updateClient: builder.mutation<
      Client,
      {
        id: string;
        name?: string;
        surname?: string;
        soloRemaining?: number;
        splitRemaining?: number;
        runningRemaining?: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/clients/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Clients', 'Client', 'Sessions'],
    }),
    shareLink: builder.mutation<{ shareToken: string; url: string }, string>({
      query: (id) => ({
        url: `/clients/${id}/share-link`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Client', id }, 'Clients'],
    }),
    getDaysOff: builder.query<DayOff[], { from: string; to: string }>({
      query: ({ from, to }) =>
        `/days-off?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      providesTags: ['DaysOff'],
    }),
    createDayOff: builder.mutation<DayOff, { date: string; note?: string }>({
      query: (body) => ({ url: '/days-off', method: 'POST', body }),
      invalidatesTags: ['DaysOff'],
    }),
    deleteDayOff: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/days-off/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DaysOff'],
    }),
    getSessions: builder.query<Session[], { from: string; to: string }>({
      query: ({ from, to }) =>
        `/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      providesTags: ['Sessions'],
    }),
    createSession: builder.mutation<
      Session,
      { clientId: string; start: string; workoutType: WorkoutType }
    >({
      query: (body) => ({ url: '/sessions', method: 'POST', body }),
      invalidatesTags: ['Sessions', 'Clients', 'Client'],
    }),
    confirmSession: builder.mutation<Session, string>({
      query: (id) => ({ url: `/sessions/${id}/confirm`, method: 'PATCH' }),
      invalidatesTags: ['Sessions', 'Clients', 'Client'],
    }),
    cancelSession: builder.mutation<Session, { id: string; deduct: boolean }>({
      query: ({ id, deduct }) => ({
        url: `/sessions/${id}/cancel`,
        method: 'PATCH',
        body: { deduct },
      }),
      invalidatesTags: ['Sessions', 'Clients', 'Client'],
    }),
    reassignSession: builder.mutation<
      Session,
      { id: string; clientId: string; workoutType: WorkoutType }
    >({
      query: ({ id, ...body }) => ({
        url: `/sessions/${id}/reassign`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Sessions', 'Clients'],
    }),
    addPackages: builder.mutation<
      Client,
      {
        id: string;
        addSolo?: number;
        addSplit?: number;
        addRunning?: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/clients/${id}/packages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Clients', 'Client'],
    }),
    getPublicClient: builder.query<PublicClientView, string>({
      query: (token) => `/public/client/${token}`,
      providesTags: ['Public'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useGetClientsQuery,
  useGetClientQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useShareLinkMutation,
  useGetDaysOffQuery,
  useCreateDayOffMutation,
  useDeleteDayOffMutation,
  useGetSessionsQuery,
  useCreateSessionMutation,
  useConfirmSessionMutation,
  useCancelSessionMutation,
  useReassignSessionMutation,
  useAddPackagesMutation,
  useGetPublicClientQuery,
} = api;
