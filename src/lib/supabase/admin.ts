import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Small userbase-friendly lookup (pages through users)
export async function findUserIdByEmail(email: string) {
  const supabaseAdmin = createSupabaseAdminClient();

  const target = email.trim().toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const user = data?.users?.find((u) => (u.email ?? "").toLowerCase() === target);
    if (user?.id) return user.id;

    if (!data?.users || data.users.length < perPage) break;
  }

  return null;
}
