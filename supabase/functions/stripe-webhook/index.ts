import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[WEBHOOK] Event type: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      
      let email = session.customer_details?.email;
      
      if (!email && customerId) {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        email = customer.email;
      }

      if (!email) {
        console.error("[WEBHOOK] No email found");
        return new Response("No email found", { status: 400 });
      }

      console.log(`[WEBHOOK] Processing for email: ${email}`);

      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser.users.find(u => u.email === email);

      if (!userExists) {
        // Create user account
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
        });

        if (createError) {
          console.error("[WEBHOOK] Error creating user:", createError);
          return new Response(JSON.stringify({ error: createError.message }), { status: 500 });
        }

        console.log(`[WEBHOOK] User created: ${newUser.user.id}`);

        // Update profile with Stripe customer ID
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", newUser.user.id);

        if (profileError) {
          console.error("[WEBHOOK] Error updating profile:", profileError);
        }
      } else {
        console.log(`[WEBHOOK] User already exists: ${userExists.id}`);
        
        // Update existing profile with Stripe customer ID
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userExists.id);

        if (profileError) {
          console.error("[WEBHOOK] Error updating profile:", profileError);
        }
      }

      // Send magic link
      const { error: magicLinkError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${req.headers.get("origin") || "http://localhost:8080"}/`,
        },
      });

      if (magicLinkError) {
        console.error("[WEBHOOK] Error sending magic link:", magicLinkError);
        return new Response(JSON.stringify({ error: magicLinkError.message }), { status: 500 });
      }

      console.log(`[WEBHOOK] Magic link sent to: ${email}`);
    }

    // Handle subscription updates/deletions
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by Stripe customer ID
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        // Update subscription record
        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert({
            user_id: profile.id,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0]?.price.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });

        if (subError) {
          console.error("[WEBHOOK] Error updating subscription:", subError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WEBHOOK] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
