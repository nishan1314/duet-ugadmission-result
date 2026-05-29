import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  // Simple protection: requiring a secret query parameter.
  // Example: /api/cron/aggregate-logs?secret=my_cron_secret
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  
  const expectedSecret = process.env.CRON_SECRET || "default_dev_secret";
  if (secret !== expectedSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Determine target month (we'll process the previous month)
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    // Format YYYY-MM
    const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    // Calculate start and end bounds of that month
    const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString();
    const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // 2. Fetch counts from raw logs for the target month
    
    // Visitor count
    const { count: visitorCount, error: vErr } = await supabase
      .from("visitor_logs")
      .select("*", { count: "exact", head: true })
      .gte("visit_date", startOfMonth)
      .lte("visit_date", endOfMonth);
      
    // Total Searches count
    const { count: searchCount, error: sErr } = await supabase
      .from("search_logs")
      .select("*", { count: "exact", head: true })
      .gte("searched_at", startOfMonth)
      .lte("searched_at", endOfMonth);

    // Successful Searches count
    const { count: successfulSearchCount, error: ssErr } = await supabase
      .from("search_logs")
      .select("*", { count: "exact", head: true })
      .gte("searched_at", startOfMonth)
      .lte("searched_at", endOfMonth)
      .eq("found", true);

    if (vErr || sErr || ssErr) {
      throw new Error(`Failed to fetch counts: ${JSON.stringify(vErr || sErr || ssErr)}`);
    }

    // 3. Upsert into monthly_stats (in case the script is run multiple times for the same month)
    const { error: upsertErr } = await supabase
      .from("monthly_stats")
      .upsert({
        month_year: monthStr,
        total_visitors: visitorCount || 0,
        total_searches: searchCount || 0,
        successful_searches: successfulSearchCount || 0
      }, { onConflict: "month_year" });

    if (upsertErr) {
      throw new Error(`Failed to insert into monthly_stats: ${JSON.stringify(upsertErr)}`);
    }

    // 4. Delete the raw logs for that month to save storage
    const { error: delVisErr } = await supabase
      .from("visitor_logs")
      .delete()
      .gte("visit_date", startOfMonth)
      .lte("visit_date", endOfMonth);

    const { error: delSearchErr } = await supabase
      .from("search_logs")
      .delete()
      .gte("searched_at", startOfMonth)
      .lte("searched_at", endOfMonth);

    if (delVisErr || delSearchErr) {
      throw new Error(`Failed to delete old logs: ${JSON.stringify(delVisErr || delSearchErr)}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully aggregated and deleted logs for ${monthStr}.`,
      stats: {
        month: monthStr,
        visitors: visitorCount,
        searches: searchCount,
        successfulSearches: successfulSearchCount
      }
    });

  } catch (error: any) {
    console.error("Aggregation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
