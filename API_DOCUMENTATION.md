# Quote Service API Documentation

This document describes how to integrate the Quote Service API from a Hydrogen storefront or any external application.

## Base URL

The API is hosted at your Remix app's URL. For example:
- Development: `http://localhost:3000`
- Production: `https://your-app.herokuapp.com` (or your hosting URL)

## Authentication

**Important**: The shop must have the Remix app installed before quotes can be created. The API authenticates using the shop's stored session token.

## Endpoints

### Create Quote (Draft Order)

Creates a new quote (Shopify Draft Order) for a customer.

**Endpoint:** `POST /api/quotes`

**Request Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```typescript
{
  shop: string;                    // Required: Shop domain (e.g., "my-shop.myshopify.com")
  email: string;                   // Required: Customer email address
  lineItems: Array<{              // Required: Array of products to quote
    variantId: string;            // Shopify Product Variant GID (e.g., "gid://shopify/ProductVariant/123456")
    quantity: number;             // Quantity (must be > 0)
  }>;
  shippingAddress?: {             // Optional: Shipping address
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  notes?: string;                  // Optional: Internal notes
  poNumber?: string;               // Optional: Purchase Order number
  poFileUrl?: string;              // Optional: URL to PO document
}
```

**Example Request:**
```json
{
  "shop": "my-shop.myshopify.com",
  "email": "customer@example.com",
  "lineItems": [
    {
      "variantId": "gid://shopify/ProductVariant/123456789",
      "quantity": 2
    },
    {
      "variantId": "gid://shopify/ProductVariant/987654321",
      "quantity": 1
    }
  ],
  "shippingAddress": {
    "address1": "123 Main St",
    "city": "Toronto",
    "province": "ON",
    "country": "CA",
    "zip": "M5H 2N2",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  },
  "notes": "Rush order - please expedite",
  "poNumber": "PO-2025-001",
  "poFileUrl": "https://example.com/uploads/po-2025-001.pdf"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "draftOrderId": "gid://shopify/DraftOrder/123456789",
  "invoiceUrl": "https://checkout.shopify.com/12345678/invoices/abc123",
  "quoteId": "uuid-quote-id"
}
```

**Error Responses:**

**400 Bad Request** - Missing or invalid fields:
```json
{
  "error": "Missing required fields: shop, email, and lineItems are required"
}
```

**401 Unauthorized** - Shop not authenticated:
```json
{
  "error": "Shop not authenticated. Please install the app first."
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error",
  "message": "Error details..."
}
```

## Integration Examples

### JavaScript/TypeScript (Fetch API)

```typescript
async function createQuote(quoteData: {
  shop: string;
  email: string;
  lineItems: Array<{ variantId: string; quantity: number }>;
  poNumber?: string;
  poFileUrl?: string;
  shippingAddress?: object;
  notes?: string;
}) {
  const response = await fetch('https://your-app-url.com/api/quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quoteData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create quote');
  }

  return await response.json();
}

// Usage
try {
  const result = await createQuote({
    shop: 'my-shop.myshopify.com',
    email: 'customer@example.com',
    lineItems: [
      { variantId: 'gid://shopify/ProductVariant/123456', quantity: 2 }
    ],
    poNumber: 'PO-12345',
  });
  
  console.log('Quote created:', result.draftOrderId);
  console.log('Invoice URL:', result.invoiceUrl);
} catch (error) {
  console.error('Error:', error.message);
}
```

### React Hook Example (for Hydrogen)

```typescript
import { useCallback, useState } from 'react';

export function useCreateQuote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createQuote = useCallback(async (quoteData: {
    shop: string;
    email: string;
    lineItems: Array<{ variantId: string; quantity: number }>;
    poNumber?: string;
    poFileUrl?: string;
    shippingAddress?: object;
    notes?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create quote');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createQuote, loading, error };
}

// Usage in component
function QuoteForm() {
  const { createQuote, loading, error } = useCreateQuote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createQuote({
        shop: 'my-shop.myshopify.com',
        email: 'customer@example.com',
        lineItems: [
          { variantId: 'gid://shopify/ProductVariant/123456', quantity: 2 }
        ],
      });
      
      // Redirect to invoice URL or show success
      window.location.href = result.invoiceUrl;
    } catch (err) {
      // Error is already set in hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Quote'}
      </button>
    </form>
  );
}
```

### Hydrogen Server Action Example

```typescript
// app/routes/quotes.create.tsx (or similar)

import { json, type ActionFunctionArgs } from '@shopify/remix-oxygen';

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  
  const quoteData = {
    shop: context.env.PUBLIC_STORE_DOMAIN || 'your-shop.myshopify.com',
    email: formData.get('email') as string,
    lineItems: JSON.parse(formData.get('lineItems') as string),
    poNumber: formData.get('poNumber') as string || undefined,
    poFileUrl: formData.get('poFileUrl') as string || undefined,
    shippingAddress: formData.get('shippingAddress') 
      ? JSON.parse(formData.get('shippingAddress') as string) 
      : undefined,
    notes: formData.get('notes') as string || undefined,
  };

  try {
    // Call your Remix app API
    const response = await fetch(`${context.env.QUOTE_SERVICE_URL}/api/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quoteData),
    });

    const result = await response.json();

    if (!response.ok) {
      return json({ error: result.error }, { status: response.status });
    }

    return json({ success: true, ...result });
  } catch (error) {
    return json(
      { error: 'Failed to create quote', message: error.message },
      { status: 500 }
    );
  }
}
```

## Getting Variant IDs

To get Product Variant GIDs from Shopify Storefront API:

```graphql
query GetProductVariants($handle: String!) {
  product(handle: $handle) {
    id
    title
    variants(first: 10) {
      edges {
        node {
          id  # This is the variantId you need
          title
          price {
            amount
            currencyCode
          }
        }
      }
    }
  }
}
```

The `id` field from the variant node is what you pass as `variantId` in the lineItems array.

## Important Notes

1. **Shop Domain**: Always include the shop domain in the request. This is used to look up the shop's authentication session.

2. **Variant IDs**: Must be Shopify GIDs in the format `gid://shopify/ProductVariant/123456`. These come from the Storefront API or Admin API.

3. **App Installation**: The Remix app must be installed on the shop before quotes can be created. The API will return a 401 error if the shop is not authenticated.

4. **CORS**: CORS headers are automatically included. By default, all origins are allowed. To restrict to specific domains, set the `ALLOWED_ORIGINS` environment variable:
   ```env
   ALLOWED_ORIGINS=https://your-hydrogen-store.myshopify.com,https://your-custom-domain.com
   ```

5. **Error Handling**: Always check the response status and handle errors appropriately. The API returns descriptive error messages.

6. **Invoice URL**: The `invoiceUrl` in the response can be used to redirect customers to Shopify's checkout to complete their purchase.

## Environment Variables

### In your Hydrogen app:

```env
QUOTE_SERVICE_URL=https://your-remix-app-url.com
PUBLIC_STORE_DOMAIN=your-shop.myshopify.com
```

### In your Remix app (optional):

```env
# Restrict CORS to specific origins (comma-separated)
# If not set, all origins are allowed
ALLOWED_ORIGINS=https://your-hydrogen-store.myshopify.com,https://your-custom-domain.com
```

## Testing

You can test the API using curl:

```bash
curl -X POST https://your-app-url.com/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "my-shop.myshopify.com",
    "email": "test@example.com",
    "lineItems": [
      {
        "variantId": "gid://shopify/ProductVariant/123456",
        "quantity": 1
      }
    ]
  }'
```

## Support

For issues or questions, check the error response messages which provide detailed information about what went wrong.
