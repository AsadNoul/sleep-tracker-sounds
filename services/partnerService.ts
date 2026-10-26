import { supabase } from '../lib/supabase';

// Real partner connection: invite-code pairing + pulling the connected
// partner's actual sleep_records (not manually-typed numbers). Backed by
// the partner_connections table (see ../supabase_tables.sql) — the user
// must run that SQL in their Supabase project before this works.

export interface PartnerConnection {
  id: string;
  user_id: string;
  partner_id: string | null;
  invite_code: string;
  status: 'pending' | 'connected';
  created_at: string;
  connected_at: string | null;
}

export interface PartnerProfile {
  id: string;
  full_name: string | null;
}

export interface PartnerNight {
  start_time: string;
  end_time: string | null;
  duration: number | null;
  sleep_score: number | null;
  sleep_quality: number | null;
  wake_ups: number | null;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** Returns the caller's existing connection (pending invite or connected pair), if any. */
async function getMyConnection(userId: string): Promise<PartnerConnection | null> {
  const { data, error } = await supabase
    .from('partner_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[partnerService] getMyConnection failed:', error);
    return null;
  }
  return data as PartnerConnection | null;
}

/** Creates a new pending invite code for the caller. Retries once on a rare code collision. */
async function createInvite(userId: string): Promise<PartnerConnection | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from('partner_connections')
      .insert({ user_id: userId, invite_code: code, status: 'pending' })
      .select()
      .single();
    if (!error) return data as PartnerConnection;
    if (error.code !== '23505') {
      // Not a unique-constraint collision — a real error, stop here.
      console.error('[partnerService] createInvite failed:', error);
      return null;
    }
    // 23505 = unique_violation on invite_code — try once more with a fresh code.
  }
  return null;
}

/**
 * Redeems someone else's invite code: fills in partner_id on their pending
 * row (making it 'connected'), then inserts the SYMMETRIC row for the
 * redeemer so both sides have their own readable connection record.
 */
async function redeemInvite(
  myUserId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedCode = code.trim().toUpperCase();

  const { data: inviteRow, error: findError } = await supabase
    .from('partner_connections')
    .select('*')
    .eq('invite_code', trimmedCode)
    .eq('status', 'pending')
    .is('partner_id', null)
    .maybeSingle();

  if (findError || !inviteRow) {
    return { success: false, error: 'Invite code not found or already used' };
  }
  if (inviteRow.user_id === myUserId) {
    return { success: false, error: "You can't connect with yourself" };
  }

  const { error: updateError } = await supabase
    .from('partner_connections')
    .update({ partner_id: myUserId, status: 'connected', connected_at: new Date().toISOString() })
    .eq('id', inviteRow.id);

  if (updateError) {
    return { success: false, error: 'Could not redeem this code' };
  }

  const { error: insertError } = await supabase.from('partner_connections').insert({
    user_id: myUserId,
    partner_id: inviteRow.user_id,
    invite_code: generateInviteCode(), // own placeholder code, this row is already connected
    status: 'connected',
    connected_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('[partnerService] symmetric insert failed:', insertError);
    return { success: false, error: 'Connected, but failed to finish setup. Try reopening the screen.' };
  }

  return { success: true };
}

async function disconnect(userId: string): Promise<boolean> {
  const { error } = await supabase.from('partner_connections').delete().eq('user_id', userId);
  return !error;
}

async function getPartnerProfile(partnerId: string): Promise<PartnerProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', partnerId)
    .single();
  if (error) return null;
  return data as PartnerProfile;
}

/** Real nights, pulled from the connected partner's own sleep_records (cross-partner RLS policy makes this readable). */
async function getPartnerNights(partnerId: string, limit = 7): Promise<PartnerNight[]> {
  const { data, error } = await supabase
    .from('sleep_records')
    .select('start_time, end_time, duration, sleep_score, sleep_quality, wake_ups')
    .eq('user_id', partnerId)
    .order('start_time', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[partnerService] getPartnerNights failed:', error);
    return [];
  }
  return (data || []) as PartnerNight[];
}

async function getMyNights(userId: string, limit = 7): Promise<PartnerNight[]> {
  const { data, error } = await supabase
    .from('sleep_records')
    .select('start_time, end_time, duration, sleep_score, sleep_quality, wake_ups')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[partnerService] getMyNights failed:', error);
    return [];
  }
  return (data || []) as PartnerNight[];
}

export default {
  getMyConnection,
  createInvite,
  redeemInvite,
  disconnect,
  getPartnerProfile,
  getPartnerNights,
  getMyNights,
};
