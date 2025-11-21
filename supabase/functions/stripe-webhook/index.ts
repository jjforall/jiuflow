import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`, { 
      status: 400 
    });
  }

  console.log("Received event:", event.type);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);
        
        // Get customer email from session
        const customerEmail = session.customer_email || session.customer_details?.email;
        if (!customerEmail) {
          console.error("No customer email found in session");
          break;
        }

        console.log("Customer email:", customerEmail);

        // Check if user already exists
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const userExists = existingUser?.users.some(u => u.email === customerEmail);

        if (!userExists) {
          console.log("Creating new user account for:", customerEmail);
          
          // Generate a random password
          const randomPassword = crypto.randomUUID();
          
          // Create user account
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: customerEmail,
            password: randomPassword,
            email_confirm: true, // Auto-confirm email
          });

          if (createError) {
            console.error("Error creating user:", createError);
          } else {
            console.log("User created successfully:", newUser.user?.id);
            
            // Send password reset email so user can set their own password
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(
              customerEmail,
              {
                redirectTo: `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify`,
              }
            );

            if (resetError) {
              console.error("Error sending password reset email:", resetError);
            } else {
              console.log("Password reset email sent to:", customerEmail);
            }
          }
        } else {
          console.log("User already exists:", customerEmail);
        }

        // Get or create customer ID
        let customerId = session.customer as string;
        
        // Create or update subscription record
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          // Get user ID
          const { data: userData } = await supabase.auth.admin.listUsers();
          const user = userData?.users.find(u => u.email === customerEmail);
          
          if (user) {
            const { error: subError } = await supabase
              .from("subscriptions")
              .upsert({
                user_id: user.id,
                stripe_subscription_id: subscription.id,
                stripe_price_id: subscription.items.data[0].price.id,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                plan_type: "founder",
              });

            if (subError) {
              console.error("Error creating subscription record:", subError);
            } else {
              console.log("Subscription record created for user:", user.id);
            }
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription event:", event.type, subscription.id);
        
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
        } else {
          console.log("Subscription updated:", subscription.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
