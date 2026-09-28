import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Define the 'users' table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the global game state table
export const gameState = pgTable('game_state', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  activeCaseId: text('active_case_id'),
  dispatchStatus: text('dispatch_status'),
  unlockedEvidenceCount: integer('unlocked_evidence_count').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define the case-specific progress table
export const caseProgress = pgTable('case_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  caseId: text('case_id').notNull(),
  unlockedEvidence: jsonb('unlocked_evidence').default('[]'),
  interrogations: jsonb('interrogations').default('{}'),
  solved: integer('solved').default(0), // 0: no, 1: yes
  chargesheet: jsonb('chargesheet'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define relationships for the 'users' table
export const usersRelations = relations(users, ({ one, many }) => ({
  gameState: one(gameState, {
    fields: [users.id],
    references: [gameState.userId],
  }),
  caseProgress: many(caseProgress),
}));

// Define relationships for the 'gameState' table
export const gameStateRelations = relations(gameState, ({ one }) => ({
  user: one(users, {
    fields: [gameState.userId],
    references: [users.id],
  }),
}));

// Define relationships for the 'caseProgress' table
export const caseProgressRelations = relations(caseProgress, ({ one }) => ({
  user: one(users, {
    fields: [caseProgress.userId],
    references: [users.id],
  }),
}));
