import { apiVersion } from "../shopify.server";
import prisma from "../db.server";

// Convert ApiVersion enum to string format (e.g., October25 -> "2025-10")
const getApiVersionString = (version) => {
  // ApiVersion.October25 -> "2025-10"
  const versionMap = {
    October25: "2025-10",
    July24: "2024-07",
    January24: "2024-01",
  };
  return versionMap[version] || "2025-10";
};

/**
 * POST /api/quotes
 * Creates a draft order (quote) in Shopify
 * 
 * Expected body:
 * {
 *   shop: string (shop domain, e.g., "my-shop.myshopify.com")
 *   email: string (required)
 *   lineItems: Array<{ variantId: string, quantity: number }> (required)
 *   shippingAddress?: object
 *   notes?: string
 *   poNumber?: string
 *   poFileUrl?: string
 * }
 */
export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    console.log("=== API Quotes Request Received ===");
    console.log("Request URL:", request.url);
    console.log("Request Method:", request.method);
    console.log("Request Headers:", Object.fromEntries(request.headers.entries()));
    console.log("Request Body:", JSON.stringify(body, null, 2));
    console.log("===================================");
    
    const { shop, email, lineItems, shippingAddress, notes, poNumber, poFileUrl } = body;

    // Validate required fields
    if (!shop || !email || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return Response.json(
        { error: "Missing required fields: shop, email, and lineItems are required" },
        { status: 400 }
      );
    }

    // Validate line items
    for (const item of lineItems) {
      if (!item.variantId || !item.quantity || item.quantity <= 0) {
        return Response.json(
          { error: "Each lineItem must have variantId and quantity > 0" },
          { status: 400 }
        );
      }
    }

    // Look up session for this shop
    // Normalize shop domain (remove protocol if present)
    const normalizedShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
    console.log("Looking up session for shop:", normalizedShop);
    
    // Find all offline sessions for this shop
    // Prefer sessions with write_draft_orders scope (new sessions after reinstall)
    const sessions = await prisma.session.findMany({
      where: {
        shop: normalizedShop,
        isOnline: false, // Use offline token for API calls
      },
    });

    console.log(`Found ${sessions.length} session(s) for shop`);
    sessions.forEach((s, i) => {
      console.log(`Session ${i}: id=${s.id.substring(0, 8)}..., scope=${s.scope}, expires=${s.expires}`);
    });

    // Try to find a session with write_draft_orders scope first (newest sessions)
    let dbSession = sessions.find(s => 
      s.accessToken && 
      s.scope && 
      s.scope.includes('write_draft_orders') &&
      (!s.expires || new Date(s.expires) > new Date())
    );

    // If not found, try any non-expired session
    if (!dbSession) {
      dbSession = sessions.find(s => 
        s.accessToken && 
        (!s.expires || new Date(s.expires) > new Date())
      );
    }

    if (!dbSession || !dbSession.accessToken) {
      return Response.json(
        { error: "Shop not authenticated or session expired. Please reinstall the app." },
        { status: 401 }
      );
    }

    console.log(`Using session ${dbSession.id.substring(0, 8)}..., scope: ${dbSession.scope}`);

    // Helper function to make GraphQL requests
    const makeGraphQLRequest = async (query, variables) => {
      const apiVersionString = getApiVersionString(apiVersion);
      const response = await fetch(
        `https://${normalizedShop}/admin/api/${apiVersionString}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": dbSession.accessToken,
          },
          body: JSON.stringify({ query, variables }),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        // If 401, the access token might be invalid (old session)
        if (response.status === 401) {
          throw new Error(`Invalid access token. Session may be from before app reinstall. Please reinstall the app.`);
        }
        throw new Error(`GraphQL request failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      console.log("GraphQL Response Status:", response.status);
      console.log("GraphQL Response:", JSON.stringify(result, null, 2));
      
      // Check for GraphQL errors
      if (result.errors) {
        console.error("GraphQL errors found:", result.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }
      
      return result;
    };

    // Build draft order input
    const draftOrderInput = {
      email,
      lineItems: lineItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      ...(shippingAddress && {
        shippingAddress: {
          address1: shippingAddress.address1 || "",
          address2: shippingAddress.address2 || "",
          city: shippingAddress.city || "",
          province: shippingAddress.province || "",
          country: shippingAddress.country || "",
          zip: shippingAddress.zip || shippingAddress.postalCode || "",
          firstName: shippingAddress.firstName || "",
          lastName: shippingAddress.lastName || "",
          phone: shippingAddress.phone || "",
        },
      }),
      ...(notes && { note: notes }),
    };

    console.log("Creating draft order with input:", JSON.stringify(draftOrderInput, null, 2));

    // Create draft order via GraphQL
    // Note: We request minimal fields to avoid protected customer data issues
    const draftOrderMutation = `#graphql
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            invoiceUrl
            status
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const draftOrderData = await makeGraphQLRequest(draftOrderMutation, {
      input: draftOrderInput,
    });

    console.log("Draft order response:", JSON.stringify(draftOrderData, null, 2));

    // Check if response structure is valid
    if (!draftOrderData.data || !draftOrderData.data.draftOrderCreate) {
      console.error("Invalid GraphQL response:", JSON.stringify(draftOrderData, null, 2));
      return Response.json(
        {
          error: "Invalid response from Shopify API",
          details: draftOrderData,
        },
        { status: 500 }
      );
    }

    const draftOrderCreate = draftOrderData.data.draftOrderCreate;

    // Check for user errors
    if (draftOrderCreate.userErrors && draftOrderCreate.userErrors.length > 0) {
      return Response.json(
        {
          error: "Failed to create draft order",
          userErrors: draftOrderCreate.userErrors,
        },
        { status: 400 }
      );
    }

    // Check if draft order was created
    // Note: draftOrder may be null due to protected customer data restrictions
    // but the mutation may still have succeeded
    if (!draftOrderCreate.draftOrder) {
      // If we have no userErrors, the draft order was likely created but we can't read it
      // due to protected customer data restrictions. We'll need to query it separately.
      if (draftOrderCreate.userErrors && draftOrderCreate.userErrors.length === 0) {
        console.warn("Draft order created but cannot be read due to protected customer data restrictions");
        return Response.json(
          {
            error: "Draft order was created but cannot be accessed due to protected customer data restrictions. Please configure your app for protected customer data access in Shopify Partners.",
            details: "See https://shopify.dev/docs/apps/launch/protected-customer-data",
          },
          { status: 403 }
        );
      }
      
      console.error("No draft order in response:", JSON.stringify(draftOrderData, null, 2));
      return Response.json(
        {
          error: "Draft order was not created",
          details: draftOrderCreate,
        },
        { status: 500 }
      );
    }

    const draftOrder = draftOrderCreate.draftOrder;

    // Store PO information as metafields if provided
    if (poNumber || poFileUrl) {
      const metafields = [];
      
      if (poNumber) {
        metafields.push({
          namespace: "quote",
          key: "po_number",
          value: poNumber,
          type: "single_line_text_field",
          ownerId: draftOrder.id,
        });
      }

      if (poFileUrl) {
        metafields.push({
          namespace: "quote",
          key: "po_file_url",
          value: poFileUrl,
          type: "url",
          ownerId: draftOrder.id,
        });
      }

      // Create metafields
      const metafieldMutation = `#graphql
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }`;

      for (const metafield of metafields) {
        await makeGraphQLRequest(metafieldMutation, {
          metafields: [metafield],
        });
      }
    }

    // Store quote in database
    const quote = await prisma.quote.create({
      data: {
        shopifyDraftOrderId: draftOrder.id,
        shop: normalizedShop,
        email,
        poNumber: poNumber || null,
        poFileUrl: poFileUrl || null,
        status: "CREATED",
      },
    });

    return Response.json({
      success: true,
      draftOrderId: draftOrder.id,
      invoiceUrl: draftOrder.invoiceUrl,
      quoteId: quote.id,
    });
  } catch (error) {
    console.error("Error creating quote:", error);
    return Response.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
};

// Handle other HTTP methods
export const loader = async () => {
  return Response.json({ error: "Method not allowed. Use POST to create quotes." }, { status: 405 });
};

// CORS headers for external requests (e.g., from Hydrogen storefront)
export const headers = ({ request }) => {
  // Allow requests from any origin (adjust in production to specific domains)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];
  const origin = request.headers.get("origin");
  
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes("*") 
      ? "*" 
      : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
};

// Handle OPTIONS preflight requests
export const options = async ({ request }) => {
  const corsHeaders = headers({ request });
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};