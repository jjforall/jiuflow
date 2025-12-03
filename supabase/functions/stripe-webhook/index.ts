import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Function to create Printful order
async function createPrintfulOrder(
  session: Stripe.Checkout.Session,
  cartItems: { variantId: number; quantity: number }[]
) {
  const PRINTFUL_API_KEY = Deno.env.get("PRINTFUL_API_KEY");
  if (!PRINTFUL_API_KEY) {
    throw new Error("PRINTFUL_API_KEY is not set");
  }

  const shippingDetails = session.shipping_details;
  if (!shippingDetails?.address) {
    throw new Error("No shipping address in session");
  }

  logStep("Creating Printful order", { 
    cartItems,
    shippingName: shippingDetails.name,
    shippingAddress: shippingDetails.address
  });

  // Build order items
  const orderItems = cartItems.map(item => ({
    sync_variant_id: item.variantId,
    quantity: item.quantity,
  }));

  // Build recipient info
  const recipient = {
    name: shippingDetails.name || session.customer_details?.name || "Customer",
    address1: shippingDetails.address.line1 || "",
    address2: shippingDetails.address.line2 || "",
    city: shippingDetails.address.city || "",
    state_code: shippingDetails.address.state || "",
    country_code: shippingDetails.address.country || "JP",
    zip: shippingDetails.address.postal_code || "",
    email: session.customer_details?.email || session.customer_email || "",
    phone: session.customer_details?.phone || "",
  };

  const orderData = {
    recipient,
    items: orderItems,
    retail_costs: {
      currency: "JPY",
      subtotal: session.amount_subtotal ? (session.amount_subtotal / 100).toString() : "0",
      total: session.amount_total ? (session.amount_total / 100).toString() : "0",
    },
  };

  logStep("Sending order to Printful", { orderData });

  const response = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  const result = await response.json();

  if (!response.ok) {
    logStep("ERROR creating Printful order", { 
      status: response.status,
      result 
    });
    throw new Error(`Printful API error: ${result.error?.message || JSON.stringify(result)}`);
  }

  logStep("Printful order created successfully", { 
    orderId: result.result?.id,
    status: result.result?.status 
  });

  return result;
}

serve(async (req) => {
  logStep("Webhook received", { 
    method: req.method,
    headers: Object.fromEntries(req.headers.entries())
  });

  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  
  if (!signature) {
    logStep("ERROR: No signature found");
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
    logStep("Event verified", { type: event.type, id: event.id });
  } catch (err) {
    logStep("ERROR: Webhook signature verification failed", { error: err });
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`, { 
      status: 400 
    });
  }

  logStep("Processing event", { type: event.type });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id,
          mode: session.mode,
          paymentStatus: session.payment_status,
          metadata: session.metadata
        });

        // Handle Printful orders (cart_items in metadata)
        if (session.mode === "payment" && session.metadata?.cart_items) {
          logStep("Processing Printful order", {
            sessionId: session.id,
            cartItems: session.metadata.cart_items
          });

          try {
            const cartItems = JSON.parse(session.metadata.cart_items);
            
            // Retrieve the full session with shipping details
            const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['shipping_details', 'customer_details'],
            });

            const printfulResult = await createPrintfulOrder(fullSession, cartItems);
            logStep("Printful order created", { 
              orderId: printfulResult.result?.id,
              sessionId: session.id 
            });
          } catch (printfulError) {
            logStep("ERROR creating Printful order", { 
              error: printfulError instanceof Error ? printfulError.message : String(printfulError),
              sessionId: session.id
            });
            // Don't throw - we still want to acknowledge the webhook
          }
          break;
        }

        // Handle video tip payments
        if (session.mode === "payment" && session.metadata?.videoId && session.metadata?.userId) {
          logStep("Processing video tip", {
            videoId: session.metadata.videoId,
            userId: session.metadata.userId,
            amount: session.amount_total
          });

          const { error: tipError } = await supabase
            .from("video_tips")
            .insert({
              video_id: session.metadata.videoId,
              from_user_id: session.metadata.userId,
              amount: session.amount_total || 0,
              message: session.metadata.message || null,
              stripe_payment_id: session.payment_intent as string,
            });

          if (tipError) {
            logStep("ERROR saving video tip", { error: tipError.message });
          } else {
            logStep("Video tip saved successfully", {
              videoId: session.metadata.videoId,
              amount: session.amount_total
            });
          }
          break;
        }
        
        // Get customer email from session
        const customerEmail = session.customer_email || session.customer_details?.email;
        if (!customerEmail) {
          logStep("ERROR: No customer email found in session", { 
            sessionId: session.id,
            customer: session.customer,
            customer_details: session.customer_details
          });
          break;
        }

        logStep("Customer email found", { email: customerEmail });

        // Check if user already exists
        const { data: existingUser, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          logStep("ERROR listing users", { error: listError });
        }
        
        const userExists = existingUser?.users.some(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
        logStep("User existence check", { exists: userExists, email: customerEmail });

        if (!userExists) {
          logStep("Creating new user account", { email: customerEmail });
          
          // Generate a random password
          const randomPassword = crypto.randomUUID();
          
          // Create user account
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: customerEmail.toLowerCase().trim(),
            password: randomPassword,
            email_confirm: true, // Auto-confirm email
          });

          if (createError) {
            logStep("ERROR creating user", { 
              email: customerEmail,
              error: createError.message,
              code: createError.code
            });
          } else {
            logStep("User created successfully", { 
              userId: newUser.user?.id,
              email: newUser.user?.email
            });
            
            // Send magic link for automatic login
            const { error: magicLinkError } = await supabase.auth.signInWithOtp({
              email: customerEmail.toLowerCase().trim(),
              options: {
                emailRedirectTo: `https://jiuflow.art/map`,
              },
            });

            if (magicLinkError) {
              logStep("ERROR sending magic link", { 
                email: customerEmail,
                error: magicLinkError.message
              });
            } else {
              logStep("Magic link sent successfully", { email: customerEmail });
            }
          }
        } else {
          logStep("User already exists, sending magic link", { email: customerEmail });
          
          // Send magic link for existing user
          const { error: magicLinkError } = await supabase.auth.signInWithOtp({
            email: customerEmail.toLowerCase().trim(),
            options: {
              emailRedirectTo: `https://jiuflow.art/map`,
            },
          });

          if (magicLinkError) {
            logStep("ERROR sending magic link", { 
              email: customerEmail,
              error: magicLinkError.message
            });
          } else {
            logStep("Magic link sent successfully", { email: customerEmail });
          }
        }

        // Get or create customer ID
        let customerId = session.customer as string;
        logStep("Processing subscription", { 
          mode: session.mode,
          hasSubscription: !!session.subscription
        });
        
        // Create or update subscription record
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          logStep("Subscription retrieved", { 
            subscriptionId: subscription.id,
            status: subscription.status
          });
          
          // Get user ID - wait a moment for user creation to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: userData, error: getUserError } = await supabase.auth.admin.listUsers();
          if (getUserError) {
            logStep("ERROR getting users for subscription", { error: getUserError });
          }
          
          const user = userData?.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
          logStep("User lookup for subscription", { 
            found: !!user,
            userId: user?.id,
            email: customerEmail
          });
          
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
                referral_code_id: (subscription.metadata as any)?.referral_code_id || null,
                trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
                trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              });

            if (subError) {
              logStep("ERROR creating subscription record", { 
                userId: user.id,
                error: subError.message,
                code: subError.code
              });
            } else {
              logStep("Subscription record created successfully", { 
                userId: user.id,
                subscriptionId: subscription.id
              });
            }
          } else {
            logStep("ERROR: User not found for subscription creation", { email: customerEmail });
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event received", { 
          type: event.type,
          subscriptionId: subscription.id,
          status: subscription.status
        });
        
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("ERROR updating subscription", { 
            subscriptionId: subscription.id,
            error: updateError.message
          });
        } else {
          logStep("Subscription updated successfully", { 
            subscriptionId: subscription.id,
            status: subscription.status
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    logStep("Webhook processed successfully", { type: event.type });
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR processing webhook", { 
      error: error instanceof Error ? error.message : String(error)
    });
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
