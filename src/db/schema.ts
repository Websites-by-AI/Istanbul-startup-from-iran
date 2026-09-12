import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";

export const hotels = pgTable("hotels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  sponsorLevel: text("sponsor_level").notNull(), // bronze | silver | gold
  supportType: text("support_type").notNull(), // free | discount50 | corporate
  startupRooms: integer("startup_rooms").notNull().default(0),
  roomsAvailable: integer("rooms_available").notNull().default(0),
  meetingRoom: boolean("meeting_room").notNull().default(false),
  coworking: boolean("coworking").notNull().default(false),
  airportTransfer: boolean("airport_transfer").notNull().default(false),
  breakfast: boolean("breakfast").notNull().default(true),
  metroMinutes: integer("metro_minutes").notNull().default(10),
  exhibitionMinutes: integer("exhibition_minutes").notNull().default(30),
  sectors: text("sectors").array().notNull().default([]),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const corporates = pgTable("corporates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  city: text("city").notNull(),
  lookingFor: text("looking_for").array().notNull().default([]),
  sponsorTier: text("sponsor_tier").notNull(), // innovation | strategic
  teamsSponsored: integer("teams_sponsored").notNull().default(0),
  budgetUsd: integer("budget_usd").notNull().default(0),
  offersPoc: boolean("offers_poc").notNull().default(true),
  offersOffice: boolean("offers_office").notNull().default(false),
  offersInvestment: boolean("offers_investment").notNull().default(false),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const startups = pgTable("startups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  sector: text("sector").notNull(),
  stage: text("stage").notNull(), // idea | mvp | revenue | scaling
  originCity: text("origin_city").notNull().default("Tehran"),
  founderName: text("founder_name").notNull(),
  technicalName: text("technical_name").notNull(),
  businessName: text("business_name").notNull(),
  tractionSummary: text("traction_summary").notNull().default(""),
  seekingUsd: integer("seeking_usd").notNull().default(0),
  needsCorporate: text("needs_corporate").array().notNull().default([]),
  status: text("status").notNull().default("pool"), // pool | selected | landed | poc | funded
  sourceEvent: text("source_event").notNull().default("Elcom"),
  hotelId: integer("hotel_id").references(() => hotels.id),
  corporateId: integer("corporate_id").references(() => corporates.id),
  landingStep: integer("landing_step").notNull().default(0), // 0..9
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const investors = pgTable("investors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // vc | angel | corporate | accelerator
  city: text("city").notNull(),
  ticketMinUsd: integer("ticket_min_usd").notNull().default(0),
  ticketMaxUsd: integer("ticket_max_usd").notNull().default(0),
  sectors: text("sectors").array().notNull().default([]),
  stages: text("stages").array().notNull().default([]),
  thesis: text("thesis").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // startup | hotel | corporate | investor | legal | media
  organization: text("organization").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull().default(""),
  sector: text("sector").notNull().default(""),
  message: text("message").notNull().default(""),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const navigatorMessages = pgTable("navigator_messages", {
  id: serial("id").primaryKey(),
  startupId: integer("startup_id").references(() => startups.id),
  agent: text("agent").notNull(), // legal | investor | market | media | match | schedule
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bootcamps = pgTable("bootcamps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  firm: text("firm").notNull(),
  city: text("city").notNull(),
  hotelId: integer("hotel_id").references(() => hotels.id),
  startDate: text("start_date").notNull(),
  days: integer("days").notNull().default(2),
  capacity: integer("capacity").notNull().default(10),
  language: text("language").notNull().default("fa"),
  topics: text("topics").array().notNull().default([]),
  priceUsd: integer("price_usd").notNull().default(0),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const legalAssessments = pgTable("legal_assessments", {
  id: serial("id").primaryKey(),
  startupId: integer("startup_id").references(() => startups.id).notNull(),
  lawyer: text("lawyer").notNull().default(""),
  layer: text("layer").notNull().default("entry"), // entry | growth
  pathway: text("pathway").notNull().default("unassessed"), // e.g. business_visa | tech_visa | work_permit
  structure: text("structure").notNull().default("undecided"), // subsidiary | sister | operating
  status: text("status").notNull().default("intake"), // intake | in_review | plan_ready | engaged
  notes: text("notes").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Bootcamp = typeof bootcamps.$inferSelect;
export type LegalAssessment = typeof legalAssessments.$inferSelect;
export type Hotel = typeof hotels.$inferSelect;
export type Corporate = typeof corporates.$inferSelect;
export type Startup = typeof startups.$inferSelect;
export type Investor = typeof investors.$inferSelect;
export type Application = typeof applications.$inferSelect;
