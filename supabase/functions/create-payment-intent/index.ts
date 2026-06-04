import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@14.18.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { restaurant_id, employee_count, platform = 'mobile' } = await req.json()

    if (!restaurant_id || !employee_count) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Oblicz cenę: 99 zł (9900 groszy) za 5 pracowników + 19 zł (1900 groszy) za każdego dodatkowego
    const basePrice = 9900 // 99 zł
    const extraPrice = 1900 // 19 zł
    const extraEmployees = Math.max(0, employee_count - 5)
    const totalAmount = basePrice + (extraEmployees * extraPrice)

    // Sprawdź czy restauracja istnieje
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, stripe_customer_id')
      .eq('id', restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      return new Response(JSON.stringify({ error: 'Restaurant not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Pobierz lub utwórz Stripe customer
    let customerId = restaurant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { restaurant_id },
      })
      customerId = customer.id

      // Zapisz customer_id w restauracji
      await supabase
        .from('restaurants')
        .update({ stripe_customer_id: customerId })
        .eq('id', restaurant_id)
    }

    // Dla web użyj Stripe Checkout, dla mobile użyj PaymentIntent
    if (platform === 'web') {
      // Utwórz Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'pln',
            product_data: {
              name: `Subskrypcja ShiftApp - ${employee_count} pracowników`,
              description: `${basePrice / 100} zł za 5 pracowników + ${extraEmployees * (extraPrice / 100)} zł za ${extraEmployees} dodatkowych`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.get('origin') || 'http://localhost:8081'}/subscription?success=true`,
        cancel_url: `${req.headers.get('origin') || 'http://localhost:8081'}/subscription?canceled=true`,
        metadata: {
          restaurant_id,
          employee_count: employee_count.toString(),
          base_price: basePrice.toString(),
          extra_employee_price: extraPrice.toString(),
        },
      })

      // Utwórz rekord subskrypcji w bazie
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          restaurant_id,
          stripe_customer_id: customerId,
          stripe_checkout_session_id: session.id,
          status: 'pending',
          base_price: basePrice,
          extra_employee_price: extraPrice,
          employee_count,
          total_amount: totalAmount,
          currency: 'pln',
        })
        .select()
        .single()

      if (subError) {
        console.error('Subscription creation error:', subError)
      }

      return new Response(
        JSON.stringify({
          checkoutUrl: session.url,
          sessionId: session.id,
          subscriptionId: subscription?.id,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    } else {
      // Dla mobile - PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'pln',
        customer: customerId,
        metadata: {
          restaurant_id,
          employee_count: employee_count.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      })

      // Utwórz rekord subskrypcji w bazie
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          restaurant_id,
          stripe_customer_id: customerId,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'pending',
          base_price: basePrice,
          extra_employee_price: extraPrice,
          employee_count,
          total_amount: totalAmount,
          currency: 'pln',
        })
        .select()
        .single()

      if (subError) {
        console.error('Subscription creation error:', subError)
      }

      return new Response(
        JSON.stringify({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: totalAmount,
          subscriptionId: subscription?.id,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
