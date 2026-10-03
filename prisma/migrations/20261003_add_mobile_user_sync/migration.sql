-- CreateTable
CREATE TABLE "SyncedUser" (
    "id" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL,
    "seededAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientPlatform" TEXT NOT NULL,
    "clientVersion" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "preferences" JSONB,

    CONSTRAINT "SyncedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomName" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "state" JSONB NOT NULL DEFAULT '{}',
    "isOnline" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SyncedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedRoom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "SyncedRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedRoutine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "actions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "SyncedRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncedDevice_userId_vendor_externalId_key" ON "SyncedDevice"("userId", "vendor", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedRoom_userId_sourceId_key" ON "SyncedRoom"("userId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedRoutine_userId_sourceId_key" ON "SyncedRoutine"("userId", "sourceId");

-- AddForeignKey
ALTER TABLE "SyncedDevice" ADD CONSTRAINT "SyncedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SyncedUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedRoom" ADD CONSTRAINT "SyncedRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SyncedUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedRoutine" ADD CONSTRAINT "SyncedRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SyncedUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
