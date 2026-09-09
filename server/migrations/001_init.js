export async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.string('id', 32).primary();
    t.string('role', 20).notNullable();
    t.string('name', 160).notNullable();
    t.string('email', 190).notNullable().unique();
    t.string('password_hash', 200).notNullable();
    t.string('title', 190);
    t.text('bio');
    t.string('location', 190);
    t.string('genre', 120);
    t.integer('years_experience').defaultTo(0);
    t.string('availability', 20).defaultTo('open');
    t.string('rate_currency', 8).defaultTo('NGN');
    t.integer('rate_amount').defaultTo(0);
    t.string('rate_unit', 40).defaultTo('per gig');
    t.string('role_label', 190);
    t.text('photo_url');
    t.text('epk_url');
    t.text('socials');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_instruments', (t) => {
    t.increments('id');
    t.string('user_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('instrument', 120).notNullable();
    t.index(['user_id']);
  });

  await knex.schema.createTable('user_tags', (t) => {
    t.increments('id');
    t.string('user_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('tag', 120).notNullable();
    t.index(['user_id']);
  });

  await knex.schema.createTable('gigs', (t) => {
    t.string('id', 32).primary();
    t.string('title', 220).notNullable();
    t.text('description');
    t.string('type', 80).defaultTo('Event');
    t.string('venue', 190).notNullable();
    t.string('location', 190).notNullable();
    t.datetime('date').notNullable();
    t.string('start_time', 20).defaultTo('12:00');
    t.string('end_time', 20).defaultTo('18:00');
    t.string('fee_currency', 8).defaultTo('NGN');
    t.integer('fee_amount').defaultTo(0);
    t.integer('capacity').defaultTo(1);
    t.string('status', 20).defaultTo('open');
    t.string('genre', 120);
    t.text('requirements');
    t.string('host_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('host_name', 190).notNullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
    t.index(['status']);
    t.index(['location']);
    t.index(['date']);
  });

  await knex.schema.createTable('gig_tags', (t) => {
    t.increments('id');
    t.string('gig_id', 32).notNullable().references('id').inTable('gigs').onDelete('CASCADE');
    t.string('tag', 120).notNullable();
    t.index(['gig_id']);
  });

  await knex.schema.createTable('applications', (t) => {
    t.string('id', 32).primary();
    t.string('gig_id', 32).notNullable().references('id').inTable('gigs').onDelete('CASCADE');
    t.string('musician_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('musician_name', 160).notNullable();
    t.string('email', 190).notNullable();
    t.string('phone', 40);
    t.text('note');
    t.string('status', 20).defaultTo('pending');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
    t.datetime('accepted_at');
    t.datetime('declined_at');
    t.index(['gig_id']);
    t.index(['musician_id']);
  });

  await knex.schema.createTable('payments', (t) => {
    t.string('id', 32).primary();
    t.string('application_id', 32).references('id').inTable('applications').onDelete('SET NULL');
    t.string('gig_id', 32).references('id').inTable('gigs').onDelete('SET NULL');
    t.string('payer_id', 32).references('id').inTable('users').onDelete('SET NULL');
    t.string('amount_currency', 8).notNullable();
    t.integer('amount').notNullable();
    t.string('status', 20).notNullable().defaultTo('pending');
    t.string('provider', 40).notNullable().defaultTo('mock');
    t.string('reference', 120);
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('paid_at');
    t.index(['gig_id']);
    t.index(['payer_id']);
  });

  await knex.schema.createTable('notifications', (t) => {
    t.string('id', 32).primary();
    t.string('user_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 40).notNullable();
    t.string('title', 190).notNullable();
    t.text('body');
    t.string('link', 260);
    t.datetime('read_at');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('gig_tags');
  await knex.schema.dropTableIfExists('gigs');
  await knex.schema.dropTableIfExists('user_tags');
  await knex.schema.dropTableIfExists('user_instruments');
  await knex.schema.dropTableIfExists('users');
}
