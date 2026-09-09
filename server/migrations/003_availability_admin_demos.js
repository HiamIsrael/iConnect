export async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.boolean('is_blocked').defaultTo(false);
  });

  await knex.schema.alterTable('gigs', (t) => {
    t.text('contract_terms');
    t.text('cancellation_policy');
    t.integer('deposit_percent').defaultTo(0);
  });

  await knex.schema.createTable('availability_blocks', (t) => {
    t.string('id', 32).primary();
    t.string('user_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 160);
    t.datetime('start_at').notNullable();
    t.datetime('end_at').notNullable();
    t.string('status', 20).defaultTo('available'); // available | unavailable
    t.text('note');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.index(['user_id', 'start_at']);
  });

  await knex.schema.createTable('media_demos', (t) => {
    t.string('id', 32).primary();
    t.string('user_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 20).notNullable(); // audio | video
    t.string('title', 160);
    t.text('url').notNullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.index(['user_id']);
  });

  await knex.schema.createTable('reports', (t) => {
    t.string('id', 32).primary();
    t.string('reporter_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('target_type', 30).notNullable(); // user | gig | review | message
    t.string('target_id', 64).notNullable();
    t.string('reason', 120).notNullable();
    t.text('details');
    t.string('status', 20).defaultTo('open'); // open | resolved | dismissed
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
    t.index(['status', 'created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('reports');
  await knex.schema.dropTableIfExists('media_demos');
  await knex.schema.dropTableIfExists('availability_blocks');
  await knex.schema.alterTable('gigs', (t) => {
    t.dropColumn('contract_terms');
    t.dropColumn('cancellation_policy');
    t.dropColumn('deposit_percent');
  });
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('is_blocked');
  });
}
