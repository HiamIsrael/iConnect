export async function up(knex) {
  await knex.schema.createTable('venues', (t) => {
    t.string('id', 32).primary();
    t.string('name', 190).notNullable();
    t.string('slug', 210).notNullable().unique();
    t.string('type', 80);
    t.text('description');
    t.string('location', 190).notNullable();
    t.integer('capacity').defaultTo(0);
    t.text('amenities');
    t.string('photo_url');
    t.string('website');
    t.string('phone');
    t.string('contact_email');
    t.string('owner_id', 32).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
    t.index(['owner_id']);
    t.index(['location']);
  });

  await knex.schema.alterTable('gigs', (t) => {
    t.string('venue_id', 32).references('id').inTable('venues').onDelete('SET NULL');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('gigs', (t) => {
    t.dropColumn('venue_id');
  });
  await knex.schema.dropTableIfExists('venues');
}
