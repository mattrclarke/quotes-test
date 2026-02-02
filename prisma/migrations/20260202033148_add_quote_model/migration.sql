-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopifyDraftOrderId" TEXT NOT NULL,
    "shopifyOrderId" TEXT,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "poNumber" TEXT,
    "poFileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "xeroInvoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_shopifyDraftOrderId_key" ON "Quote"("shopifyDraftOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_shopifyOrderId_key" ON "Quote"("shopifyOrderId");
