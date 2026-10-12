// Recorded from `get_storefront` after `select private.demo_setup();` on a local database (P5.2).
// Re-record when the function's output changes: the test below must keep parsing it.

export const JUANS_CAFE: unknown = {
  "shop": {
    "id": "b6802298-4ae3-4844-ba6c-0288c71884e8",
    "name": "Juan's Cafe",
    "slug": "juans-cafe",
    "isDemo": true,
    "settings": {
      "city": "Batangas City",
      "email": null,
      "phone": "+639170000001",
      "address": null,
      "mapsUrl": null,
      "tagline": "Coffee, milk tea and silog on Mabini St.",
      "logoPath": null,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "busyUntil": null,
      "coverPath": null,
      "codEnabled": false,
      "colorAccent": "#6F4E37",
      "facebookUrl": null,
      "colorPrimary": "#FBF6F0",
      "pickupEnabled": true,
      "walkInEnabled": true,
      "colorSecondary": "#EFE3D3",
      "payLaterPickup": true,
      "acceptingOrders": true,
      "deliveryEnabled": true,
      "showMemberCount": true,
      "messengerUsername": "smartappph",
      "unpaidExpiryMinutes": 30,
      "deliveryFeeViaMessenger": false
    },
    "createdAt": "2026-10-12T02:54:31.68273+00:00",
    "businessType": "food"
  },
  "hours": [
    {
      "opensAt": "07:00",
      "weekday": 0,
      "closesAt": "21:00",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "opensAt": "07:00",
      "weekday": 1,
      "closesAt": "21:00",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "opensAt": "07:00",
      "weekday": 2,
      "closesAt": "21:00",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "opensAt": "07:00",
      "weekday": 3,
      "closesAt": "21:00",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "opensAt": "07:00",
      "weekday": 4,
      "closesAt": "21:00",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "opensAt": "07:00",
      "weekday": 5,
      "closesAt": "21:00",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "opensAt": "07:00",
      "weekday": 6,
      "closesAt": "21:00",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    }
  ],
  "items": [
    {
      "id": "d5e05d78-c162-464e-a911-d262abac74f2",
      "name": "Chicken Adobo Rice",
      "sort": 0,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "3bdc16fa-637d-4a81-a8a1-06e042645ac5",
          "name": "Regular",
          "sort": 0,
          "price": 14900,
          "itemId": "d5e05d78-c162-464e-a911-d262abac74f2",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "5672298f-7fb8-45ea-81d0-7a9c1977fac7",
      "isFeatured": true,
      "trackStock": false,
      "description": "Classic adobo with garlic rice.",
      "optionGroups": []
    },
    {
      "id": "491f978b-a912-4f97-8d6f-eff1c4281897",
      "name": "Iced Latte",
      "sort": 0,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "312f27ca-740a-4d83-8e6d-e62291723a07",
          "name": "Regular",
          "sort": 0,
          "price": 12000,
          "itemId": "491f978b-a912-4f97-8d6f-eff1c4281897",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "1e17da56-2479-431e-8d6a-2eebb8f80650",
          "name": "Large",
          "sort": 1,
          "price": 15000,
          "itemId": "491f978b-a912-4f97-8d6f-eff1c4281897",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "a90bd473-35d8-4a69-96c2-8c554b6ecbfd",
      "isFeatured": true,
      "trackStock": false,
      "description": "Espresso and fresh milk over ice.",
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    },
    {
      "id": "037059da-6c55-4b81-b892-c72cadac777d",
      "name": "Ube Cheese Pandesal",
      "sort": 0,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "4b0995c3-6114-4927-b474-2f8eeafa8115",
          "name": "Piece",
          "sort": 0,
          "price": 6500,
          "itemId": "037059da-6c55-4b81-b892-c72cadac777d",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 8
        }
      ],
      "categoryId": "78edcd27-8579-4dd7-91d2-36515f3ace83",
      "isFeatured": true,
      "trackStock": true,
      "description": "Soft pandesal with ube and cheese.",
      "optionGroups": []
    },
    {
      "id": "98c8ed6e-2ef2-402d-a884-e39ca32b610e",
      "name": "Wintermelon Milk Tea",
      "sort": 0,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "085d68dd-37b1-48dc-bb89-c556a87607c4",
          "name": "Medium",
          "sort": 0,
          "price": 9900,
          "itemId": "98c8ed6e-2ef2-402d-a884-e39ca32b610e",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "40f8d5b6-49fe-442d-9c2e-4129e25f8214",
          "name": "Large",
          "sort": 1,
          "price": 11900,
          "itemId": "98c8ed6e-2ef2-402d-a884-e39ca32b610e",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "1a664d37-7c9b-49d0-b6df-faf5c6544c42",
      "isFeatured": true,
      "trackStock": false,
      "description": null,
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    },
    {
      "id": "6b0de1cd-f596-4436-a9d8-9b96f93f44e5",
      "name": "Ensaymada",
      "sort": 1,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "dd3b9d53-29df-42ee-9977-7daabf9798e5",
          "name": "Piece",
          "sort": 0,
          "price": 4500,
          "itemId": "6b0de1cd-f596-4436-a9d8-9b96f93f44e5",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 3
        }
      ],
      "categoryId": "78edcd27-8579-4dd7-91d2-36515f3ace83",
      "isFeatured": false,
      "trackStock": true,
      "description": "Buttered, sugared and topped with cheese.",
      "optionGroups": []
    },
    {
      "id": "75d3f46c-9f8a-4507-9ebb-f6e6893141d2",
      "name": "Okinawa Milk Tea",
      "sort": 1,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "67b96d49-8699-4f2b-8c97-b677111a4e6e",
          "name": "Medium",
          "sort": 0,
          "price": 9900,
          "itemId": "75d3f46c-9f8a-4507-9ebb-f6e6893141d2",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "b55fcb62-377b-4d90-b3ba-51d15692d4f0",
          "name": "Large",
          "sort": 1,
          "price": 11900,
          "itemId": "75d3f46c-9f8a-4507-9ebb-f6e6893141d2",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "1a664d37-7c9b-49d0-b6df-faf5c6544c42",
      "isFeatured": false,
      "trackStock": false,
      "description": "Roasted brown sugar flavour.",
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    },
    {
      "id": "6905fb8d-f483-420e-8dd7-91a48d2aa83b",
      "name": "Spanish Latte",
      "sort": 1,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "5cc0fbff-6bab-443d-acc9-3ae03c581e33",
          "name": "Regular",
          "sort": 0,
          "price": 13000,
          "itemId": "6905fb8d-f483-420e-8dd7-91a48d2aa83b",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "d0f9be64-b384-4197-b230-70031d298919",
          "name": "Large",
          "sort": 1,
          "price": 16000,
          "itemId": "6905fb8d-f483-420e-8dd7-91a48d2aa83b",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "a90bd473-35d8-4a69-96c2-8c554b6ecbfd",
      "isFeatured": true,
      "trackStock": false,
      "description": "Sweet and creamy, with condensed milk.",
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    },
    {
      "id": "be4e83cb-30a5-43c1-b02c-17888ed3bb05",
      "name": "Tapsilog",
      "sort": 1,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "933c4c34-1c59-40b7-b873-1de0e54585fb",
          "name": "Regular",
          "sort": 0,
          "price": 15900,
          "itemId": "be4e83cb-30a5-43c1-b02c-17888ed3bb05",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "5672298f-7fb8-45ea-81d0-7a9c1977fac7",
      "isFeatured": false,
      "trackStock": false,
      "description": "Beef tapa, garlic rice and egg.",
      "optionGroups": []
    },
    {
      "id": "68c0db95-e13a-4a8f-9f69-5038c88ef097",
      "name": "Americano",
      "sort": 2,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "d9337d22-6b78-4d3e-97f2-363411f0692e",
          "name": "Hot",
          "sort": 0,
          "price": 9000,
          "itemId": "68c0db95-e13a-4a8f-9f69-5038c88ef097",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "46b3efdf-f3f2-4cd7-8535-147debe23229",
          "name": "Iced",
          "sort": 1,
          "price": 10000,
          "itemId": "68c0db95-e13a-4a8f-9f69-5038c88ef097",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "a90bd473-35d8-4a69-96c2-8c554b6ecbfd",
      "isFeatured": false,
      "trackStock": false,
      "description": "Espresso and water, hot or iced.",
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    },
    {
      "id": "45df6d74-4674-4d5f-bc16-2e956ec47450",
      "name": "Butter Croissant",
      "sort": 2,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "a25230c6-c211-4ac6-9170-2b0d03068f9b",
          "name": "Piece",
          "sort": 0,
          "price": 8500,
          "itemId": "45df6d74-4674-4d5f-bc16-2e956ec47450",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 0
        }
      ],
      "categoryId": "78edcd27-8579-4dd7-91d2-36515f3ace83",
      "isFeatured": false,
      "trackStock": true,
      "description": null,
      "optionGroups": []
    },
    {
      "id": "fccacb11-d717-4f8c-bf3f-45fdb5eba82e",
      "name": "Longsilog",
      "sort": 2,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "69cb709f-fc90-4db4-86b2-92a72192c003",
          "name": "Regular",
          "sort": 0,
          "price": 14900,
          "itemId": "fccacb11-d717-4f8c-bf3f-45fdb5eba82e",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "5672298f-7fb8-45ea-81d0-7a9c1977fac7",
      "isFeatured": false,
      "trackStock": false,
      "description": "Sweet longganisa, garlic rice and egg.",
      "optionGroups": []
    },
    {
      "id": "77a4995c-07af-4776-8dfb-f82de40d7a80",
      "name": "Taro Milk Tea",
      "sort": 2,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "9bdad68b-c6ac-4f57-bda0-6f66a587d182",
          "name": "Medium",
          "sort": 0,
          "price": 10900,
          "itemId": "77a4995c-07af-4776-8dfb-f82de40d7a80",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "114c9ac8-d621-4664-8dc4-4294d185df6e",
          "name": "Large",
          "sort": 1,
          "price": 12900,
          "itemId": "77a4995c-07af-4776-8dfb-f82de40d7a80",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "1a664d37-7c9b-49d0-b6df-faf5c6544c42",
      "isFeatured": false,
      "trackStock": false,
      "description": null,
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    },
    {
      "id": "7a19d948-955f-41b1-aa90-a5522af3082b",
      "name": "Banana Bread",
      "sort": 3,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "421d776f-48fe-4f6f-9d3b-98bcde4c9cf5",
          "name": "Slice",
          "sort": 0,
          "price": 7500,
          "itemId": "7a19d948-955f-41b1-aa90-a5522af3082b",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 6
        }
      ],
      "categoryId": "78edcd27-8579-4dd7-91d2-36515f3ace83",
      "isFeatured": false,
      "trackStock": true,
      "description": "One thick slice.",
      "optionGroups": []
    },
    {
      "id": "8da7c375-e706-4c0b-bcbe-f3c0214299f3",
      "name": "Bangsilog",
      "sort": 3,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "059615b8-f543-4832-84d7-fd4cc892792e",
          "name": "Regular",
          "sort": 0,
          "price": 16900,
          "itemId": "8da7c375-e706-4c0b-bcbe-f3c0214299f3",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "5672298f-7fb8-45ea-81d0-7a9c1977fac7",
      "isFeatured": false,
      "trackStock": false,
      "description": "Fried bangus, garlic rice and egg.",
      "optionGroups": []
    },
    {
      "id": "dbd30416-8127-4049-8afb-ec52a49efadd",
      "name": "Brown Sugar Milk Tea",
      "sort": 3,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "3528cf5d-9e82-4886-acce-f982110787c0",
          "name": "Medium",
          "sort": 0,
          "price": 10900,
          "itemId": "dbd30416-8127-4049-8afb-ec52a49efadd",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "8f12c7aa-c495-4d10-a04b-c8576e2db816",
          "name": "Large",
          "sort": 1,
          "price": 12900,
          "itemId": "dbd30416-8127-4049-8afb-ec52a49efadd",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "1a664d37-7c9b-49d0-b6df-faf5c6544c42",
      "isFeatured": false,
      "trackStock": false,
      "description": "With pearls already in.",
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    },
    {
      "id": "3779bd6b-c1d7-498e-84d9-d22dac780e6c",
      "name": "Caramel Macchiato",
      "sort": 3,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "553d979a-625d-41fb-8125-5cac992ead25",
          "name": "Regular",
          "sort": 0,
          "price": 14000,
          "itemId": "3779bd6b-c1d7-498e-84d9-d22dac780e6c",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "783395d9-9d67-4f72-a3ed-c52dd3c28fa5",
          "name": "Large",
          "sort": 1,
          "price": 17000,
          "itemId": "3779bd6b-c1d7-498e-84d9-d22dac780e6c",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "a90bd473-35d8-4a69-96c2-8c554b6ecbfd",
      "isFeatured": false,
      "trackStock": false,
      "description": null,
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    },
    {
      "id": "7009e6ea-8281-41b7-9133-ab528b5e1a92",
      "name": "Cafe Mocha",
      "sort": 4,
      "photos": [],
      "status": "active",
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "variants": [
        {
          "id": "8bf820e9-c8da-4dad-840a-8c2fb4b2391a",
          "name": "Regular",
          "sort": 0,
          "price": 13500,
          "itemId": "7009e6ea-8281-41b7-9133-ab528b5e1a92",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        },
        {
          "id": "8dc4ffd2-73f0-4fc1-a737-e15634f41c64",
          "name": "Large",
          "sort": 1,
          "price": 16500,
          "itemId": "7009e6ea-8281-41b7-9133-ab528b5e1a92",
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": null,
          "stockOnHand": null
        }
      ],
      "categoryId": "a90bd473-35d8-4a69-96c2-8c554b6ecbfd",
      "isFeatured": false,
      "trackStock": false,
      "description": "Espresso, chocolate and milk.",
      "optionGroups": [
        {
          "id": "202f57c6-2063-44ed-83d3-82f1d27102ad",
          "name": "Sugar level",
          "options": [
            {
              "id": "a8d3e8b6-a9f8-458e-8c43-a9cd995bfbf7",
              "name": "0%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "dd9b1d97-4a98-4d9a-be1b-add7c469221c",
              "name": "25%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "b4ca2142-c30b-4d89-8103-8d21ee7862eb",
              "name": "50%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "6cae362e-6f06-49e1-998f-10b7a7451f43",
              "name": "75%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "a5401c81-dd93-4bbd-82be-96ba5667e6ab",
              "name": "100%",
              "groupId": "202f57c6-2063-44ed-83d3-82f1d27102ad",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 1,
          "minSelect": 1
        },
        {
          "id": "15319895-ddd7-47ab-b762-e3cba71af5ac",
          "name": "Add-ons",
          "options": [
            {
              "id": "06ad2248-b643-4120-91ab-74e49df3bf30",
              "name": "Extra shot",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 3000
            },
            {
              "id": "a09a6084-3a4d-4a41-947e-da3cc8177d94",
              "name": "Oat milk",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 2500
            },
            {
              "id": "8fda92db-15e4-47eb-a0b9-30f8b466ad62",
              "name": "Pearls",
              "groupId": "15319895-ddd7-47ab-b762-e3cba71af5ac",
              "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
              "isSoldOut": false,
              "priceDelta": 1500
            }
          ],
          "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
          "maxSelect": 2,
          "minSelect": 0
        }
      ]
    }
  ],
  "isOpen": true,
  "closures": [],
  "stampRule": null,
  "categories": [
    {
      "id": "a90bd473-35d8-4a69-96c2-8c554b6ecbfd",
      "icon": {
        "key": "coffee",
        "kind": "fluent"
      },
      "name": "Coffee",
      "sort": 0,
      "isHidden": false,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "id": "1a664d37-7c9b-49d0-b6df-faf5c6544c42",
      "icon": {
        "key": "milk-tea",
        "kind": "fluent"
      },
      "name": "Milk tea",
      "sort": 1,
      "isHidden": false,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "id": "78edcd27-8579-4dd7-91d2-36515f3ace83",
      "icon": {
        "key": "croissant",
        "kind": "fluent"
      },
      "name": "Pastries",
      "sort": 2,
      "isHidden": false,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "id": "5672298f-7fb8-45ea-81d0-7a9c1977fac7",
      "icon": {
        "key": "rice",
        "kind": "fluent"
      },
      "name": "Rice meals",
      "sort": 3,
      "isHidden": false,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    }
  ],
  "memberCount": 0,
  "deliveryZones": [
    {
      "id": "a139971c-691d-481b-a93a-9871663fa6b6",
      "fee": 5000,
      "name": "Poblacion",
      "sort": 0,
      "etaText": "20 to 30 min",
      "isActive": true,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    },
    {
      "id": "fb950be1-7a57-4941-bb64-4526d8b2639a",
      "fee": 7000,
      "name": "Barangay San Roque",
      "sort": 1,
      "etaText": "30 to 45 min",
      "isActive": true,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8"
    }
  ],
  "paymentAccounts": [
    {
      "id": "fb965ebd-ef40-487a-a76d-46b81eb13422",
      "sort": 0,
      "method": "gcash",
      "qrPath": null,
      "bankName": null,
      "isActive": true,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "accountName": "Juan's Cafe (demo)",
      "accountNumber": "0917 000 0001"
    },
    {
      "id": "d30aefa0-9951-41fa-99ea-bf17b32011d6",
      "sort": 1,
      "method": "maya",
      "qrPath": null,
      "bankName": null,
      "isActive": true,
      "tenantId": "b6802298-4ae3-4844-ba6c-0288c71884e8",
      "accountName": "Juan's Cafe (demo)",
      "accountNumber": "0917 000 0002"
    }
  ]
};

export const TALA_APPAREL: unknown = {
  "shop": {
    "id": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
    "name": "Tala Apparel",
    "slug": "tala-apparel",
    "isDemo": true,
    "settings": {
      "city": "Quezon City",
      "email": null,
      "phone": "+639170000002",
      "address": null,
      "mapsUrl": null,
      "tagline": "Everyday outfits, made in Manila.",
      "logoPath": null,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "busyUntil": null,
      "coverPath": null,
      "codEnabled": true,
      "colorAccent": "#6B3FA0",
      "facebookUrl": null,
      "colorPrimary": "#FAF7FD",
      "pickupEnabled": true,
      "walkInEnabled": true,
      "colorSecondary": "#EDE5F7",
      "payLaterPickup": false,
      "acceptingOrders": true,
      "deliveryEnabled": true,
      "showMemberCount": true,
      "messengerUsername": "smartappph",
      "unpaidExpiryMinutes": 30,
      "deliveryFeeViaMessenger": false
    },
    "createdAt": "2026-10-12T02:54:31.68273+00:00",
    "businessType": "retail"
  },
  "hours": [
    {
      "opensAt": "10:00",
      "weekday": 1,
      "closesAt": "19:00",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "opensAt": "10:00",
      "weekday": 2,
      "closesAt": "19:00",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "opensAt": "10:00",
      "weekday": 3,
      "closesAt": "19:00",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "opensAt": "10:00",
      "weekday": 4,
      "closesAt": "19:00",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "opensAt": "10:00",
      "weekday": 5,
      "closesAt": "19:00",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "opensAt": "10:00",
      "weekday": 6,
      "closesAt": "19:00",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    }
  ],
  "items": [
    {
      "id": "bfbb20e1-8c51-4bdb-a39a-2a144316105b",
      "name": "Basic Cotton Tee",
      "sort": 0,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "24e76c81-44de-4659-8259-5c62f87d0ea8",
          "name": "S",
          "sort": 0,
          "price": 39900,
          "itemId": "bfbb20e1-8c51-4bdb-a39a-2a144316105b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 8
        },
        {
          "id": "413a0558-a2de-4f69-9fcc-53bf658df9a6",
          "name": "M",
          "sort": 1,
          "price": 39900,
          "itemId": "bfbb20e1-8c51-4bdb-a39a-2a144316105b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 12
        },
        {
          "id": "86bc398a-e2ab-4f4f-86ae-7c3e3826e62c",
          "name": "L",
          "sort": 2,
          "price": 39900,
          "itemId": "bfbb20e1-8c51-4bdb-a39a-2a144316105b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 10
        },
        {
          "id": "6b20a5f7-3c0d-458a-9399-3fb614dc5196",
          "name": "XL",
          "sort": 3,
          "price": 39900,
          "itemId": "bfbb20e1-8c51-4bdb-a39a-2a144316105b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        }
      ],
      "categoryId": "9c445974-3f09-47e5-80c4-9083c5d0f2e2",
      "isFeatured": true,
      "trackStock": true,
      "description": "Soft cotton, regular fit.",
      "optionGroups": []
    },
    {
      "id": "c2f1f4af-42b5-45c5-a32e-04c06b3ed93a",
      "name": "Floral Midi Dress",
      "sort": 0,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "48ba1967-b380-423c-9d98-8ed9908f13c9",
          "name": "S",
          "sort": 0,
          "price": 129900,
          "itemId": "c2f1f4af-42b5-45c5-a32e-04c06b3ed93a",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 3
        },
        {
          "id": "ee859ee9-f0db-4178-9984-0b3e1ee1816c",
          "name": "M",
          "sort": 1,
          "price": 129900,
          "itemId": "c2f1f4af-42b5-45c5-a32e-04c06b3ed93a",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 5
        },
        {
          "id": "5d6b95ec-7814-4517-8423-43773082d54a",
          "name": "L",
          "sort": 2,
          "price": 129900,
          "itemId": "c2f1f4af-42b5-45c5-a32e-04c06b3ed93a",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        },
        {
          "id": "427b79fa-ef9b-4b0d-917f-7c32594d229e",
          "name": "XL",
          "sort": 3,
          "price": 129900,
          "itemId": "c2f1f4af-42b5-45c5-a32e-04c06b3ed93a",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 1
        }
      ],
      "categoryId": "9df611c2-4df1-498f-a088-82d542f07198",
      "isFeatured": true,
      "trackStock": true,
      "description": "Light and flowy, with pockets.",
      "optionGroups": []
    },
    {
      "id": "683b8525-a6f2-4c7a-b7e9-0ac2b565920f",
      "name": "High-waist Mom Jeans",
      "sort": 0,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "a8715118-9117-4571-8ef9-fb4ede316c16",
          "name": "S",
          "sort": 0,
          "price": 99900,
          "itemId": "683b8525-a6f2-4c7a-b7e9-0ac2b565920f",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 6
        },
        {
          "id": "8186e424-b01f-4b92-9415-c80878ccd5f1",
          "name": "M",
          "sort": 1,
          "price": 99900,
          "itemId": "683b8525-a6f2-4c7a-b7e9-0ac2b565920f",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 8
        },
        {
          "id": "90d7f0de-bfff-45f1-9e6b-218cf0865053",
          "name": "L",
          "sort": 2,
          "price": 99900,
          "itemId": "683b8525-a6f2-4c7a-b7e9-0ac2b565920f",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 5
        },
        {
          "id": "97e4be2f-31c9-4058-8aaa-8fc69a6a310f",
          "name": "XL",
          "sort": 3,
          "price": 99900,
          "itemId": "683b8525-a6f2-4c7a-b7e9-0ac2b565920f",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 3
        }
      ],
      "categoryId": "053f1a06-4370-4019-932b-ba99bf4a926e",
      "isFeatured": true,
      "trackStock": true,
      "description": "Rigid denim that softens with wear.",
      "optionGroups": []
    },
    {
      "id": "c215cf2d-2579-434a-ac9b-b1fad739e35b",
      "name": "Woven Tote Bag",
      "sort": 0,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "9c0e6fe5-3726-40d9-8b2b-d2cc1d2f8f4f",
          "name": "One size",
          "sort": 0,
          "price": 59900,
          "itemId": "c215cf2d-2579-434a-ac9b-b1fad739e35b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 6
        }
      ],
      "categoryId": "60357355-028f-4080-b012-dd33900fda52",
      "isFeatured": true,
      "trackStock": true,
      "description": "Handwoven buri, lined inside.",
      "optionGroups": []
    },
    {
      "id": "66304786-0037-426d-9411-e8be39f529a7",
      "name": "Linen Wrap Dress",
      "sort": 1,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "84819398-0045-4e5d-b2d6-5710a829ede3",
          "name": "S",
          "sort": 0,
          "price": 149900,
          "itemId": "66304786-0037-426d-9411-e8be39f529a7",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        },
        {
          "id": "789ab80e-60ab-4b21-a25f-88d90e92e6ee",
          "name": "M",
          "sort": 1,
          "price": 149900,
          "itemId": "66304786-0037-426d-9411-e8be39f529a7",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 4
        },
        {
          "id": "b9524221-eeaa-4209-b1b1-6e4a679ec178",
          "name": "L",
          "sort": 2,
          "price": 149900,
          "itemId": "66304786-0037-426d-9411-e8be39f529a7",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 3
        },
        {
          "id": "9013541f-e317-4f49-b05d-bf2bb6269f36",
          "name": "XL",
          "sort": 3,
          "price": 149900,
          "itemId": "66304786-0037-426d-9411-e8be39f529a7",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        }
      ],
      "categoryId": "9df611c2-4df1-498f-a088-82d542f07198",
      "isFeatured": false,
      "trackStock": true,
      "description": null,
      "optionGroups": []
    },
    {
      "id": "8b3acca4-5d71-4c1a-bdc4-93591949bfef",
      "name": "Oversized Graphic Tee",
      "sort": 1,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "78691c07-6bfd-4e79-955c-7dbfe28c72d3",
          "name": "S",
          "sort": 0,
          "price": 49900,
          "itemId": "8b3acca4-5d71-4c1a-bdc4-93591949bfef",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 5
        },
        {
          "id": "6359e915-591b-479a-9063-c8ee0c44e1ee",
          "name": "M",
          "sort": 1,
          "price": 49900,
          "itemId": "8b3acca4-5d71-4c1a-bdc4-93591949bfef",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 7
        },
        {
          "id": "ab3ea686-1e13-46bd-9fb0-f6df352e84db",
          "name": "L",
          "sort": 2,
          "price": 49900,
          "itemId": "8b3acca4-5d71-4c1a-bdc4-93591949bfef",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 6
        },
        {
          "id": "d55c0cc2-1a8a-4cc0-86c7-50ad17e8cc96",
          "name": "XL",
          "sort": 3,
          "price": 49900,
          "itemId": "8b3acca4-5d71-4c1a-bdc4-93591949bfef",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 1
        }
      ],
      "categoryId": "9c445974-3f09-47e5-80c4-9083c5d0f2e2",
      "isFeatured": false,
      "trackStock": true,
      "description": "Boxy fit with a small sampaguita print.",
      "optionGroups": [
        {
          "id": "55052799-a007-4bd6-8bb9-d53b20b942f3",
          "name": "Color",
          "options": [
            {
              "id": "81a6ace0-1454-4b74-ad96-aab23af3c139",
              "name": "Black",
              "groupId": "55052799-a007-4bd6-8bb9-d53b20b942f3",
              "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "357a2b87-bae7-4404-9ef8-d332f920f6c6",
              "name": "White",
              "groupId": "55052799-a007-4bd6-8bb9-d53b20b942f3",
              "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "1aed2c97-26a2-4d40-8c8d-66da8a2f5bc4",
              "name": "Sage",
              "groupId": "55052799-a007-4bd6-8bb9-d53b20b942f3",
              "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "maxSelect": 1,
          "minSelect": 1
        }
      ]
    },
    {
      "id": "61929fe0-918a-4748-bcd5-90484da34020",
      "name": "Pearl Hair Clip Set",
      "sort": 1,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "af10bd13-1895-4e8a-8499-5b20980f8b26",
          "name": "One size",
          "sort": 0,
          "price": 19900,
          "itemId": "61929fe0-918a-4748-bcd5-90484da34020",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 15
        }
      ],
      "categoryId": "60357355-028f-4080-b012-dd33900fda52",
      "isFeatured": false,
      "trackStock": true,
      "description": "Set of three.",
      "optionGroups": []
    },
    {
      "id": "4f8add55-15ce-49d8-b12e-d2e7bfac2761",
      "name": "Wide-leg Trousers",
      "sort": 1,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "b49e7483-2969-4c2c-b805-cc1a3e4a57ad",
          "name": "S",
          "sort": 0,
          "price": 89900,
          "itemId": "4f8add55-15ce-49d8-b12e-d2e7bfac2761",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 4
        },
        {
          "id": "a6574806-2877-4f06-8d7e-5f1483953820",
          "name": "M",
          "sort": 1,
          "price": 89900,
          "itemId": "4f8add55-15ce-49d8-b12e-d2e7bfac2761",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 6
        },
        {
          "id": "e585c5ed-ca2f-45cf-84f0-bb7e72b447e8",
          "name": "L",
          "sort": 2,
          "price": 89900,
          "itemId": "4f8add55-15ce-49d8-b12e-d2e7bfac2761",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 4
        },
        {
          "id": "c94c8eaa-6dd8-4e73-8778-bf3ac458c247",
          "name": "XL",
          "sort": 3,
          "price": 89900,
          "itemId": "4f8add55-15ce-49d8-b12e-d2e7bfac2761",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        }
      ],
      "categoryId": "053f1a06-4370-4019-932b-ba99bf4a926e",
      "isFeatured": false,
      "trackStock": true,
      "description": null,
      "optionGroups": []
    },
    {
      "id": "84fdfc67-9f14-47a3-a0a0-64d36c9a805b",
      "name": "Canvas Bucket Hat",
      "sort": 2,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "3e05a685-729a-4418-b513-0c7e3f8d1070",
          "name": "One size",
          "sort": 0,
          "price": 34900,
          "itemId": "84fdfc67-9f14-47a3-a0a0-64d36c9a805b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        }
      ],
      "categoryId": "60357355-028f-4080-b012-dd33900fda52",
      "isFeatured": false,
      "trackStock": true,
      "description": null,
      "optionGroups": [
        {
          "id": "55052799-a007-4bd6-8bb9-d53b20b942f3",
          "name": "Color",
          "options": [
            {
              "id": "81a6ace0-1454-4b74-ad96-aab23af3c139",
              "name": "Black",
              "groupId": "55052799-a007-4bd6-8bb9-d53b20b942f3",
              "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "357a2b87-bae7-4404-9ef8-d332f920f6c6",
              "name": "White",
              "groupId": "55052799-a007-4bd6-8bb9-d53b20b942f3",
              "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
              "isSoldOut": false,
              "priceDelta": 0
            },
            {
              "id": "1aed2c97-26a2-4d40-8c8d-66da8a2f5bc4",
              "name": "Sage",
              "groupId": "55052799-a007-4bd6-8bb9-d53b20b942f3",
              "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
              "isSoldOut": false,
              "priceDelta": 0
            }
          ],
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "maxSelect": 1,
          "minSelect": 1
        }
      ]
    },
    {
      "id": "b538e3a3-9029-46bb-9fbf-08ba56d0a9f3",
      "name": "Linen Button-down",
      "sort": 2,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "01ba8586-be57-43da-8143-b2e2ed5e185c",
          "name": "S",
          "sort": 0,
          "price": 89900,
          "itemId": "b538e3a3-9029-46bb-9fbf-08ba56d0a9f3",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 4
        },
        {
          "id": "e703a658-7b54-437e-9f6b-ace2780f6bbb",
          "name": "M",
          "sort": 1,
          "price": 89900,
          "itemId": "b538e3a3-9029-46bb-9fbf-08ba56d0a9f3",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 6
        },
        {
          "id": "19d9d7d7-774d-4ecb-98b1-2871a91ac5d6",
          "name": "L",
          "sort": 2,
          "price": 89900,
          "itemId": "b538e3a3-9029-46bb-9fbf-08ba56d0a9f3",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 3
        },
        {
          "id": "43a841d0-0ae8-4de3-a1c3-13c14d821f51",
          "name": "XL",
          "sort": 3,
          "price": 89900,
          "itemId": "b538e3a3-9029-46bb-9fbf-08ba56d0a9f3",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        }
      ],
      "categoryId": "9c445974-3f09-47e5-80c4-9083c5d0f2e2",
      "isFeatured": false,
      "trackStock": true,
      "description": null,
      "optionGroups": []
    },
    {
      "id": "8e54bcd2-7fdf-4218-a18b-e707e9a65c26",
      "name": "Pleated Skirt",
      "sort": 2,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "b35481d6-f441-40d0-b9fc-583eda5e6b24",
          "name": "S",
          "sort": 0,
          "price": 69900,
          "itemId": "8e54bcd2-7fdf-4218-a18b-e707e9a65c26",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 5
        },
        {
          "id": "c33263fa-88bc-4d92-93f1-eaa9919a8dc0",
          "name": "M",
          "sort": 1,
          "price": 69900,
          "itemId": "8e54bcd2-7fdf-4218-a18b-e707e9a65c26",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 7
        },
        {
          "id": "8af6b80b-b46b-4be6-929e-5f8e0738139f",
          "name": "L",
          "sort": 2,
          "price": 69900,
          "itemId": "8e54bcd2-7fdf-4218-a18b-e707e9a65c26",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 3
        },
        {
          "id": "15c2ce43-cf1d-40cb-942d-e7b8128919cb",
          "name": "XL",
          "sort": 3,
          "price": 69900,
          "itemId": "8e54bcd2-7fdf-4218-a18b-e707e9a65c26",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 1
        }
      ],
      "categoryId": "053f1a06-4370-4019-932b-ba99bf4a926e",
      "isFeatured": false,
      "trackStock": true,
      "description": null,
      "optionGroups": []
    },
    {
      "id": "a0b728e8-f2ff-4d79-b88b-31178fccba6b",
      "name": "Satin Slip Dress",
      "sort": 2,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "927b1280-f6e3-4c10-b623-adaec37b7138",
          "name": "S",
          "sort": 0,
          "price": 119900,
          "itemId": "a0b728e8-f2ff-4d79-b88b-31178fccba6b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 0
        },
        {
          "id": "0472c1c4-5da4-41fb-87b8-f2d2e8fd28f1",
          "name": "M",
          "sort": 1,
          "price": 119900,
          "itemId": "a0b728e8-f2ff-4d79-b88b-31178fccba6b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 3
        },
        {
          "id": "78dae6b0-07b7-4a14-b2c9-0dea8cfc2ed9",
          "name": "L",
          "sort": 2,
          "price": 119900,
          "itemId": "a0b728e8-f2ff-4d79-b88b-31178fccba6b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        },
        {
          "id": "a1ba8041-3a8c-4e0d-9536-961f85c89698",
          "name": "XL",
          "sort": 3,
          "price": 119900,
          "itemId": "a0b728e8-f2ff-4d79-b88b-31178fccba6b",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 1
        }
      ],
      "categoryId": "9df611c2-4df1-498f-a088-82d542f07198",
      "isFeatured": true,
      "trackStock": true,
      "description": "For weddings and dinners.",
      "optionGroups": []
    },
    {
      "id": "0ba412cb-4f4c-4483-896c-86ccfffe70cc",
      "name": "Denim Shorts",
      "sort": 3,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "67b89604-260d-4c9d-a3ca-1ab752d8601a",
          "name": "S",
          "sort": 0,
          "price": 59900,
          "itemId": "0ba412cb-4f4c-4483-896c-86ccfffe70cc",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 6
        },
        {
          "id": "87d939fa-c3b9-4fba-b646-123ae490fbcc",
          "name": "M",
          "sort": 1,
          "price": 59900,
          "itemId": "0ba412cb-4f4c-4483-896c-86ccfffe70cc",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 9
        },
        {
          "id": "3e3206b1-3437-4a9e-b1c8-08903c4acfaf",
          "name": "L",
          "sort": 2,
          "price": 59900,
          "itemId": "0ba412cb-4f4c-4483-896c-86ccfffe70cc",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 6
        },
        {
          "id": "ec1dfd97-19d2-4206-bc5c-b97469ed8e85",
          "name": "XL",
          "sort": 3,
          "price": 59900,
          "itemId": "0ba412cb-4f4c-4483-896c-86ccfffe70cc",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 2
        }
      ],
      "categoryId": "053f1a06-4370-4019-932b-ba99bf4a926e",
      "isFeatured": false,
      "trackStock": true,
      "description": null,
      "optionGroups": []
    },
    {
      "id": "1d558152-abfa-4f53-881b-b5ab994497d6",
      "name": "Ribbed Tank Top",
      "sort": 3,
      "photos": [],
      "status": "active",
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "variants": [
        {
          "id": "eb3853f8-5d01-4bfa-b0c6-13a7021ebb0a",
          "name": "S",
          "sort": 0,
          "price": 29900,
          "itemId": "1d558152-abfa-4f53-881b-b5ab994497d6",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 9
        },
        {
          "id": "6c2a7910-a426-4f5b-8acf-abe14d877a8c",
          "name": "M",
          "sort": 1,
          "price": 29900,
          "itemId": "1d558152-abfa-4f53-881b-b5ab994497d6",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 11
        },
        {
          "id": "f50d5de6-6a11-4ded-9f0d-c6f0b419c11b",
          "name": "L",
          "sort": 2,
          "price": 29900,
          "itemId": "1d558152-abfa-4f53-881b-b5ab994497d6",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 7
        },
        {
          "id": "195c2a01-31a9-4586-8f62-5baee7aa0071",
          "name": "XL",
          "sort": 3,
          "price": 29900,
          "itemId": "1d558152-abfa-4f53-881b-b5ab994497d6",
          "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
          "isSoldOut": false,
          "archivedAt": null,
          "lowStockAt": 2,
          "stockOnHand": 4
        }
      ],
      "categoryId": "9c445974-3f09-47e5-80c4-9083c5d0f2e2",
      "isFeatured": false,
      "trackStock": true,
      "description": null,
      "optionGroups": []
    }
  ],
  "isOpen": true,
  "closures": [],
  "stampRule": null,
  "categories": [
    {
      "id": "9c445974-3f09-47e5-80c4-9083c5d0f2e2",
      "icon": {
        "key": "tshirt",
        "kind": "fluent"
      },
      "name": "Tops",
      "sort": 0,
      "isHidden": false,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "id": "9df611c2-4df1-498f-a088-82d542f07198",
      "icon": {
        "key": "dress",
        "kind": "fluent"
      },
      "name": "Dresses",
      "sort": 1,
      "isHidden": false,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "id": "053f1a06-4370-4019-932b-ba99bf4a926e",
      "icon": {
        "key": "jeans",
        "kind": "fluent"
      },
      "name": "Bottoms",
      "sort": 2,
      "isHidden": false,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "id": "60357355-028f-4080-b012-dd33900fda52",
      "icon": {
        "key": "handbag",
        "kind": "fluent"
      },
      "name": "Accessories",
      "sort": 3,
      "isHidden": false,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    }
  ],
  "memberCount": 0,
  "deliveryZones": [
    {
      "id": "577027ab-bfc0-427c-86a7-e3e270bd030c",
      "fee": 12000,
      "name": "Metro Manila",
      "sort": 0,
      "etaText": "1 to 2 days",
      "isActive": true,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    },
    {
      "id": "4b6e9cc4-3f12-442a-89ef-30fde9bc798a",
      "fee": 25000,
      "name": "Provinces",
      "sort": 1,
      "etaText": "3 to 5 days",
      "isActive": true,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7"
    }
  ],
  "paymentAccounts": [
    {
      "id": "b581118f-be7c-4718-b34e-4b82ae3a29f8",
      "sort": 0,
      "method": "bank",
      "qrPath": null,
      "bankName": "BPI",
      "isActive": true,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "accountName": "Tala Apparel (demo)",
      "accountNumber": "0000 1111 22"
    },
    {
      "id": "40a7def8-20c7-44ad-a1c1-1ec85f7422bf",
      "sort": 1,
      "method": "gcash",
      "qrPath": null,
      "bankName": null,
      "isActive": true,
      "tenantId": "2cd91191-d3fd-4bdd-8975-8bce18fe64e7",
      "accountName": "Tala Apparel (demo)",
      "accountNumber": "0917 000 0003"
    }
  ]
};
