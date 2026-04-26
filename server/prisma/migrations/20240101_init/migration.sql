-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FINISHED', 'DELIVERED');
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- CreateTable users
CREATE TABLE "users" (
    "id" SERIAL PRIMARY KEY,
    "username" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable clients
CREATE TABLE "clients" (
    "id" SERIAL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dni" TEXT UNIQUE,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable vehicles
CREATE TABLE "vehicles" (
    "id" SERIAL PRIMARY KEY,
    "clientId" INTEGER NOT NULL REFERENCES "clients"("id"),
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "plate" TEXT UNIQUE,
    "mileage" INTEGER,
    "chassisNumber" TEXT,
    "engineNumber" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable jobs
CREATE TABLE "jobs" (
    "id" SERIAL PRIMARY KEY,
    "vehicleId" INTEGER NOT NULL REFERENCES "vehicles"("id"),
    "quoteId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "mileageIn" INTEGER,
    "mileageOut" INTEGER,
    "laborCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable job_items
CREATE TABLE "job_items" (
    "id" SERIAL PRIMARY KEY,
    "jobId" INTEGER NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL
);

-- CreateTable quotes
CREATE TABLE "quotes" (
    "id" SERIAL PRIMARY KEY,
    "number" TEXT UNIQUE NOT NULL,
    "clientId" INTEGER NOT NULL REFERENCES "clients"("id"),
    "vehicleId" INTEGER NOT NULL REFERENCES "vehicles"("id"),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "laborCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable quote_items
CREATE TABLE "quote_items" (
    "id" SERIAL PRIMARY KEY,
    "quoteId" INTEGER NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL
);

-- CreateTable attachments
CREATE TABLE "attachments" (
    "id" SERIAL PRIMARY KEY,
    "jobId" INTEGER NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable migration_logs
CREATE TABLE "migration_logs" (
    "id" SERIAL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices útiles para performance
CREATE INDEX "idx_vehicles_clientId" ON "vehicles"("clientId");
CREATE INDEX "idx_vehicles_plate" ON "vehicles"("plate");
CREATE INDEX "idx_jobs_vehicleId" ON "jobs"("vehicleId");
CREATE INDEX "idx_jobs_status" ON "jobs"("status");
CREATE INDEX "idx_jobs_date" ON "jobs"("date");
CREATE INDEX "idx_quotes_clientId" ON "quotes"("clientId");
CREATE INDEX "idx_quotes_status" ON "quotes"("status");
CREATE INDEX "idx_clients_lastName" ON "clients"("lastName");
CREATE INDEX "idx_clients_dni" ON "clients"("dni");
