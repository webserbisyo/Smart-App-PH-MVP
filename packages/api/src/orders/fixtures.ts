// Recorded from `get_order` and `quote_order` on a local database with the demo shops (P5.3): a GCash walk-in order
// after its proof was sent, and a quote with one line short of stock. Re-record when the functions change.

export const RECEIPT: unknown = {
  "lines": [
    {
      "id": "990979f7-d01c-4321-8b7e-18e5442b6cd5",
      "qty": 1,
      "note": null,
      "itemId": "787cbb06-6730-431a-b9ae-c84ba83e87fd",
      "options": [],
      "orderId": "1b46c434-234d-4dd5-b593-328caea47fd9",
      "itemName": "Chicken Adobo Rice",
      "tenantId": "552157cd-0788-4a9e-834d-4e7e4b151f34",
      "lineTotal": 14900,
      "unitPrice": 14900,
      "variantId": "8c8113f9-a381-4093-a976-24ffdbc05980",
      "variantName": "Regular",
      "optionsTotal": 0
    }
  ],
  "order": {
    "id": "1b46c434-234d-4dd5-b593-328caea47fd9",
    "notes": null,
    "token": "pvMJIPoFaPcsBDVxhwb7gA",
    "total": 14900,
    "paidAt": null,
    "status": "placed",
    "orderNo": 1,
    "readyAt": null,
    "landmark": null,
    "pickupAt": null,
    "placedAt": "2026-10-12T03:37:34.762003+00:00",
    "subtotal": 14900,
    "tenantId": "552157cd-0788-4a9e-834d-4e7e4b151f34",
    "clientKey": "9398216f-167d-4168-bed2-ba561b81d710",
    "expiresAt": null,
    "customerId": "689f676d-acd4-44f4-92f4-681c1a3e7cc9",
    "addressLine": null,
    "cancelledAt": null,
    "completedAt": null,
    "deliveryFee": 0,
    "fulfillment": "walk_in",
    "trackingUrl": null,
    "businessDate": "2026-10-12",
    "cancelReason": null,
    "customerName": "API Test",
    "customerPhone": "+639171112222",
    "discountTotal": 0,
    "paymentMethod": "gcash",
    "paymentStatus": "pending",
    "deliveryZoneId": null
  },
  "events": [
    {
      "id": "44e1206b-5e7f-44ac-92a8-a38b81a0d751",
      "kind": "status",
      "note": null,
      "actor": "customer",
      "orderId": "1b46c434-234d-4dd5-b593-328caea47fd9",
      "toStatus": "placed",
      "createdAt": "2026-10-12T03:37:34.780337+00:00",
      "fromStatus": null
    },
    {
      "id": "a48255c9-76b4-4da8-b83f-f749ec94332d",
      "kind": "payment_submitted",
      "note": null,
      "actor": "customer",
      "orderId": "1b46c434-234d-4dd5-b593-328caea47fd9",
      "toStatus": null,
      "createdAt": "2026-10-12T03:37:35.042186+00:00",
      "fromStatus": null
    }
  ],
  "payments": [
    {
      "id": "934c14b3-9f01-4229-8f45-4948498f71b7",
      "amount": 14900,
      "method": "gcash",
      "status": "pending",
      "orderId": "1b46c434-234d-4dd5-b593-328caea47fd9",
      "tenantId": "552157cd-0788-4a9e-834d-4e7e4b151f34",
      "createdAt": "2026-10-12T03:37:35.035405+00:00",
      "proofPath": "552157cd-0788-4a9e-834d-4e7e4b151f34/pvMJIPoFaPcsBDVxhwb7gA/86ed078a-d8d7-468c-b2d3-3ccf5335b05b.webp",
      "reviewedAt": null,
      "referenceNo": "API 1234 5678",
      "rejectReason": null,
      "referenceNorm": null
    }
  ]
};

export const QUOTE: unknown = {
  "lines": [
    {
      "qty": 2,
      "note": "less ice",
      "itemId": "f89d1671-7c38-4a02-aeec-62b7a3901a0d",
      "options": [
        {
          "name": "50%",
          "optionId": "aab29c44-6fd0-4e27-8f5d-65f31e45150a",
          "priceDelta": 0
        },
        {
          "name": "Extra shot",
          "optionId": "1ec5a773-149c-4d29-9727-c2b30cc40fe9",
          "priceDelta": 3000
        }
      ],
      "itemName": "Iced Latte",
      "lineIndex": 0,
      "lineTotal": 36000,
      "unitPrice": 15000,
      "variantId": "e0bca3e4-e231-4c22-b9e9-6447115742d7",
      "variantName": "Large",
      "optionsTotal": 3000
    }
  ],
  "total": 36000,
  "problems": [
    {
      "code": "out_of_stock",
      "lineIndex": 1,
      "variantId": "daa25cba-fd73-4c82-a5fb-b4911a1b9505"
    }
  ],
  "subtotal": 36000,
  "deliveryFee": 0,
  "discountTotal": 0,
  "rewardApplied": false
};
