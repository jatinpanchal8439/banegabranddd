import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USERS = [
  { email: "rohit@ojasvingroup.com", password: "Rohit@12345", name: "Rohit (Owner)" },
  { email: "admin@ojasvingroup.com", password: "Admin@12345", name: "Admin Manager" },
  { email: "hr@ojasvingroup.com", password: "Hr@12345", name: "HR Manager" },
  { email: "tl@ojasvingroup.com", password: "Tl@12345", name: "Team Lead" },
  { email: "amit.sharma@ojasvingroup.com", password: "Amit@12345", name: "Amit Sharma" },
  { email: "priya.verma@ojasvingroup.com", password: "Priya@12345", name: "Priya Verma" },
  { email: "raj.kumar@ojasvingroup.com", password: "Raj@123456", name: "Raj Kumar" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const results: any[] = [];

    for (const u of USERS) {
      const found = existingUsers.users.find((x: any) => x.email?.toLowerCase() === u.email.toLowerCase());
      if (found) {
        await supabase.auth.admin.updateUserById(found.id, { password: u.password, email_confirm: true });
        await supabase.from("profiles").update({ display_name: u.name }).eq("user_id", found.id);
        results.push({ email: u.email, status: "updated" });
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.name },
        });
        if (error) { results.push({ email: u.email, error: error.message }); continue; }
        results.push({ email: u.email, status: "created", id: data.user?.id });
      }
    }
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
