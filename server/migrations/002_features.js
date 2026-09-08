export async function up(knex) {
  await knex.schema.createTable('password_reset_tokens', (t) => {
    t.string('id', 32).primary();
    t.string('user_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 64).notNullable().unique();
    t.datetime('expires_at').notNullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.index(['user_id']);
  });

  await knex.schema.createTable('reviews', (t) => {
    t.string('id', 32).primary();
    t.string('application_id', 32).notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.string('gig_id', 32).notNullable().references('id').inTable('gigs').onDelete('CASCADE');
    t.string('reviewer_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('reviewee_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('rating').notNullable();
    t.text('comment');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.unique(['application_id', 'reviewer_id']);
    t.index(['reviewee_id']);
  });

  await knex.schema.createTable('messages', (t) => {
    t.string('id', 32).primary();
    t.string('thread_id', 64).notNullable();
    t.string('user_a_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('user_b_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('sender_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.datetime('read_at');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.index(['thread_id', 'created_at']);
    t.index(['user_a_id', 'user_b_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('reviews');
  await knex.schema.dropTableIfExists('password_reset_tokens');
}
